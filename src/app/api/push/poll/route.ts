import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { cohortOf } from "@/lib/cohort";
import { addNotice } from "@/lib/notices";
import { sendPushToUsers } from "@/lib/push-server";

/**
 * 원우가 새 투표·의견 모으기를 연 뒤 클라이언트가 부르는 창구 (2026-09-11).
 *
 * /api/push/event와 같은 짜임새입니다.
 *  - 보낸 사람이 로그인 토큰으로 본인임을 밝히고, 그 투표를 연 본인일 때만 보냅니다.
 *  - pushLog에 표시를 남겨 두 번 눌리거나 다시 불려도 한 번만 알립니다.
 *  - 헤더 알림함(notices)에 한 건 쌓고, 폰 푸시를 보냅니다.
 *
 * 받는 사람: 투표를 "전체 기수"로 열었으면(audience "all") 막히지 않은 원우 전원,
 * 아니면 그 투표의 기수 원우만. 연 사람 본인은 뺍니다.
 * 누르면 홈으로 갑니다 — 열린 투표는 홈의 D-day 카드 바로 아래에 올라옵니다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return Response.json({ ok: false, reason: "not-configured" });

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  let senderUid: string;
  try {
    senderUid = (await auth.verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { pollId?: unknown } | null;
  const pollId = typeof payload?.pollId === "string" ? payload.pollId : "";
  if (!pollId) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const pollSnap = await db.collection("polls").doc(pollId).get();
  if (!pollSnap.exists) {
    return Response.json({ ok: false, reason: "not-found" }, { status: 404 });
  }
  // 그 투표를 연 본인만 알림을 보낼 수 있습니다.
  if (pollSnap.get("createdBy") !== senderUid) {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // 이미 보냈는지 확인하고 표시를 남깁니다 — create는 문서가 있으면 실패해서 동시에 두 번 와도 한쪽만 통과합니다.
  const marker = db.collection("pushLog").doc(`poll:${pollId}`);
  try {
    await marker.create({ sentBy: senderUid, sentAt: new Date() });
  } catch {
    return Response.json({ ok: true, sent: 0, reason: "already-sent" });
  }

  const everyone = pollSnap.get("audience") === "all";
  const pollCohort = cohortOf(pollSnap.get("cohort") as string | undefined);
  const isOpinion = pollSnap.get("kind") === "opinion";
  const question = (pollSnap.get("question") as string | undefined) ?? "";
  const creatorName = (pollSnap.get("createdByName") as string | undefined) || "원우";

  const title = `${isOpinion ? "새 의견 모으기" : "새 투표"} · ${question}`;
  // 전체 기수에 연 것은 다른 기수 원우가 누군지 알 수 있게 연 사람의 기수를 앞에 붙입니다(투표 카드와 같음).
  const body = everyone ? `${pollCohort} ${creatorName}님이 열었어요 · 전체 기수` : `${creatorName}님이 열었어요`;

  // 알림함에 먼저 한 건 — 푸시를 꺼 둔 원우도 알림함에서는 봅니다. 실패해도 푸시는 그대로 보냅니다.
  await addNotice(db, {
    type: "poll",
    title,
    body,
    url: "/home",
    cohort: everyone ? "all" : pollCohort,
  }).catch(() => {});

  // select("cohort")로 기수 칸만 받아 프로필 사진까지 딸려오지 않게 합니다.
  const membersSnap = await db
    .collection("users")
    .where("status", "==", "approved")
    .select("cohort")
    .get();
  const recipientUids = membersSnap.docs
    .filter(
      (doc) => everyone || cohortOf(doc.get("cohort") as string | undefined) === pollCohort,
    )
    .map((doc) => doc.id)
    .filter((uid) => uid !== senderUid);
  if (recipientUids.length === 0) return Response.json({ ok: true, sent: 0 });

  const result = await sendPushToUsers({
    recipientUids,
    title,
    body,
    url: "/home",
    tag: `poll:${pollId}`,
  });

  return Response.json({ ok: true, ...result });
}
