import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";
import { cohortOf } from "@/lib/cohort";
import { formatMonthDay, formatTime } from "@/lib/format";

/**
 * 원우가 새 일정을 올린 뒤 클라이언트가 부르는 창구. (2026-09-11부터 등록은 원우 누구나 —
 * 그 전엔 운영진만이었습니다. 보내는 사람이 그 일정을 올린 본인인지는 아래에서 확인합니다.)
 *
 * 수정할 때는 부르지 않습니다 — 오탈자 하나 고칠 때마다 마흔 명 폰이
 * 울리면 안 됩니다. 새로 올린 그 한 번만 알립니다.
 *
 * 두 번 눌리거나 새로고침으로 다시 불려도 알림은 한 번만 갑니다.
 * 보낸 사실을 pushLog에 남겨두고 이미 있으면 그냥 돌아갑니다.
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

  const payload = (await request.json().catch(() => null)) as { eventId?: unknown } | null;
  const eventId = typeof payload?.eventId === "string" ? payload.eventId : "";
  if (!eventId) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    return Response.json({ ok: false, reason: "not-found" }, { status: 404 });
  }
  // 그 일정을 올린 본인만 알림을 보낼 수 있습니다.
  if (eventSnap.get("createdBy") !== senderUid) {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  /*
   * 이미 보냈는지 확인하고, 안 보냈으면 그 자리에서 표시를 남깁니다.
   * create는 문서가 이미 있으면 실패하므로, 두 번 동시에 들어와도
   * 한쪽만 통과합니다. (pushLog는 서버만 쓰는 자리라 보안 규칙이 없습니다 —
   * 규칙에 없는 컬렉션은 클라이언트에게 닫혀 있고, Admin SDK는 건너뜁니다.)
   */
  const marker = db.collection("pushLog").doc(`event:${eventId}`);
  try {
    await marker.create({ sentBy: senderUid, sentAt: new Date() });
  } catch {
    return Response.json({ ok: true, sent: 0, reason: "already-sent" });
  }

  /*
   * 그 일정의 기수 원우만. 홈이 기수마다 따로라, 다른 기수의 일정 알림은 소음입니다.
   * select("cohort")로 기수 칸만 받아 프로필 사진까지 딸려오지 않게 합니다.
   * 기수 칸이 없는 예전 일정·계정은 10기로 봅니다 (lib/cohort.ts).
   */
  const eventCohort = cohortOf(eventSnap.get("cohort") as string | undefined);
  const membersSnap = await db
    .collection("users")
    .where("status", "==", "approved")
    .select("cohort")
    .get();
  const recipientUids = membersSnap.docs
    .filter((doc) => cohortOf(doc.get("cohort") as string | undefined) === eventCohort)
    .map((doc) => doc.id)
    .filter((uid) => uid !== senderUid);
  if (recipientUids.length === 0) return Response.json({ ok: true, sent: 0 });

  const title = (eventSnap.get("title") as string | undefined) ?? "새 일정";
  const date = (eventSnap.get("date") as string | undefined) ?? "";
  const startTime = (eventSnap.get("startTime") as string | undefined) ?? "";
  const location = (eventSnap.get("location") as string | undefined) ?? "";

  const when = [formatMonthDay(date), startTime ? formatTime(startTime) : ""]
    .filter(Boolean)
    .join(" ");
  const body = [when, location].filter(Boolean).join(" · ");

  const result = await sendPushToUsers({
    recipientUids,
    title: `새 일정 · ${title}`,
    body,
    url: `/events/${eventId}`,
    tag: `event:${eventId}`,
  });

  return Response.json({ ok: true, ...result });
}
