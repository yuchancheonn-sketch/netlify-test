import { cohortOfRoomId, cohortRoomTitle } from "@/lib/chat-room-id";
import { cohortOf } from "@/lib/cohort";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";

/**
 * 채팅 메시지를 보낸 뒤 클라이언트가 부르는 창구.
 *
 * 클라이언트는 자기 로그인 토큰을 함께 보냅니다. 서버가 그걸로
 *  1) 진짜 그 사람이 보낸 게 맞는지 확인하고,
 *  2) 알림을 받을 사람이 누구인지 방 id에서 알아낸 뒤,
 *  3) 그 사람들의 기기로 알림을 보냅니다.
 *
 * 받는 사람은 방 종류에 따라 다릅니다.
 *   1:1 방(uid__uid)   방 id에 들어 있는 상대 한 명.
 *   기수 단체방(cohort-10)  그 기수의 승인된 원우 전원에서 보낸 사람만 뺍니다 (2026-09-22).
 *     ★ 명단은 방 문서가 아니라 users를 질의해 만듭니다 — 방에 명단을 적어 두지 않는
 *       구조라서입니다(lib/chat-rooms.ts 맨 위 설명). 보내는 사람의 기수도 함께 확인해,
 *       남의 기수 방에 알림을 뿌리지 못하게 막습니다(운영진은 통과 — 보안 규칙과 같은 기준).
 *
 * 보낸 사람 이름은 클라이언트 말을 믿지 않고 users 문서에서 직접 읽습니다.
 * 알림은 있으면 좋은 것이라, 설정이 없거나 실패해도 200으로 조용히 넘어갑니다.
 *
 * 앱 전체에 하나였던 옛 단체방("main")은 2026-09-10에 없앴습니다. 아는 두 모양이 아닌 id는 거절합니다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    // 알림 미설정 — 클라이언트는 이 응답을 무시합니다.
    return Response.json({ ok: false, reason: "not-configured" });
  }

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  let senderUid: string;
  try {
    senderUid = (await auth.verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    roomId?: unknown;
    text?: unknown;
  } | null;
  const roomId = typeof payload?.roomId === "string" ? payload.roomId : "";
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (!roomId || !text) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  // 보낸 사람 이름·기수는 서버가 직접 확인합니다.
  const senderSnap = await db.collection("users").doc(senderUid).get();
  const senderName = (senderSnap.get("name") as string | undefined) || "원우";

  const roomCohort = cohortOfRoomId(roomId);
  let recipientUids: string[];
  /** 알림 제목 — 1:1은 보낸 사람 이름, 단체방은 방 이름 뒤에 보낸 사람을 붙입니다. */
  let title: string;

  if (roomCohort) {
    // ── 기수 단체방: 그 기수의 승인된 원우 전원 (보낸 사람 제외) ──
    const senderCohort = cohortOf(senderSnap.get("cohort") as string | undefined);
    const senderIsAdmin = senderSnap.get("role") === "admin";
    if (senderCohort !== roomCohort && !senderIsAdmin) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    /*
     * select()로 문서 id만 받습니다 — 필요한 것은 uid뿐이라 내용을 받을 까닭이 없습니다.
     * 기수 칸이 빈 옛 문서는 이 질의에 안 걸립니다. 2026-09-11에 전부 채워 넣었고,
     * 새로 가입하는 원우는 프로필에서 기수를 꼭 고릅니다(lib/cohort.ts).
     */
    const peers = await db
      .collection("users")
      .where("status", "==", "approved")
      .where("cohort", "==", roomCohort)
      .select()
      .get();
    recipientUids = peers.docs.map((peer) => peer.id).filter((uid) => uid !== senderUid);
    title = `${cohortRoomTitle(roomCohort)} · ${senderName}`;
  } else {
    // ── 1:1 방: 방 id에 들어 있는 상대 ──
    const parts = roomId.split("__");
    if (parts.length !== 2 || !parts.includes(senderUid)) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
    recipientUids = parts.filter((uid) => uid !== senderUid);
    title = senderName;
  }

  if (recipientUids.length === 0) return Response.json({ ok: true, sent: 0 });

  const result = await sendPushToUsers({
    recipientUids,
    title,
    body: text,
    url: `/chat/${roomId}`,
    tag: `chat:${roomId}`,
  });

  return Response.json({ ok: true, ...result });
}
