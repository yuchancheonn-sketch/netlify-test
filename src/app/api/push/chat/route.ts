import { FieldValue } from "firebase-admin/firestore";
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
 * ★ 2026-10-06 사용자 요청 (보안 점검 후 수정): 이 창구는 "누구나 아무 문구로 원우들 폰에 알림을 뿌리는" 길이었습니다.
 *   이제 ① 보낸 사람이 승인된(status approved) 원우여야 하고, ② 클라이언트가 보낸 문구(text)는 믿지 않고
 *   **messageId로 방의 실제 메시지를 읽어** 보낸 사람(senderId)이 호출자와 같을 때만, 그 메시지 글로 알림을 만들며,
 *   ③ 같은 메시지는 한 번만(pushLog `chat:방:메시지`), ④ 보낸 사람당 1분에 20건까지만(pushLog `chatrate:uid:분`) 보냅니다.
 *   1:1 방은 방 id에 두 uid가 모두 있고 방 문서가 있으면 memberUids도 그 둘이어야 하며, 단체방은 호출자의
 *   서버 쪽 기수(users.cohort)와 방 기수가 같아야 합니다(운영진 예외).
 *   예전 앱(messageId를 안 보내는 버전)의 알림은 거절됩니다 — 웹을 먼저 배포하면 옛 화면이 열려 있던 사람의 알림만 한동안 안 갑니다.
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
    messageId?: unknown;
  } | null;
  const roomId = typeof payload?.roomId === "string" ? payload.roomId : "";
  const messageId = typeof payload?.messageId === "string" ? payload.messageId : "";
  // Firestore 문서 id 모양만(경로를 비집고 들어오는 값 차단).
  if (!roomId || !messageId || !/^[A-Za-z0-9_:.-]{1,200}$/.test(roomId) || !/^[A-Za-z0-9]{1,64}$/.test(messageId)) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  // 보낸 사람 이름·기수는 서버가 직접 확인합니다. 승인된 원우만(차단당한 계정은 알림도 못 보냄).
  const senderSnap = await db.collection("users").doc(senderUid).get();
  if (senderSnap.get("status") !== "approved") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // 알림 글은 클라이언트 말이 아니라 방에 실제로 저장된 메시지에서 읽습니다.
  const messageSnap = await db.collection("chatRooms").doc(roomId).collection("messages").doc(messageId).get();
  if (!messageSnap.exists || messageSnap.get("senderId") !== senderUid) {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const sentAtMs = (messageSnap.get("createdAt") as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
  if (Date.now() - sentAtMs > 2 * 60 * 1000) {
    // 오래된 메시지로 알림을 다시 만드는 것을 막습니다.
    return Response.json({ ok: false, reason: "stale" }, { status: 400 });
  }
  const rawText = messageSnap.get("text");
  const text = (typeof rawText === "string" && rawText.trim() ? rawText.trim() : "사진을 보냈어요").slice(0, 300);

  // 같은 메시지는 한 번만 + 보낸 사람당 분당 상한. 둘 다 서버만 쓰는 pushLog에 남깁니다.
  try {
    await db.collection("pushLog").doc(`chat:${roomId}:${messageId}`).create({ by: senderUid, at: new Date() });
  } catch {
    return Response.json({ ok: true, sent: 0, reason: "duplicate" });
  }
  const bucket = db.collection("pushLog").doc(`chatrate:${senderUid}:${Math.floor(Date.now() / 60000)}`);
  const count = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(bucket);
    const next = ((snap.get("count") as number | undefined) ?? 0) + 1;
    transaction.set(bucket, { count: next, at: FieldValue.serverTimestamp() });
    return next;
  });
  if (count > 20) {
    return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  }

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
    if (parts.length !== 2 || parts[0] === parts[1] || !parts.includes(senderUid)) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
    // 방 문서가 이미 있으면 참여자 목록(memberUids)도 이 두 사람이어야 합니다.
    const roomSnap = await db.collection("chatRooms").doc(roomId).get();
    if (roomSnap.exists) {
      const members = (roomSnap.get("memberUids") as string[] | undefined) ?? [];
      if (members.length !== 2 || !parts.every((uid) => members.includes(uid))) {
        return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
      }
    }
    recipientUids = parts.filter((uid) => uid !== senderUid);
    title = senderName;
  }

  /*
   * 이 방 알림을 끈 원우는 뺍니다 (2026-09-27 — 대화방 위 종 단추, lib/chat-prefs.ts).
   * chatMutes/{roomId} 한 건만 읽습니다 — 단체방이어도 받는 사람마다 따로 읽지 않습니다.
   * 읽기에 실패하면 거르지 않고 보냅니다(알림이 덜 가는 것보다 더 가는 편이 낫습니다).
   */
  try {
    const mutes = (await db.collection("chatMutes").doc(roomId).get()).data() ?? {};
    recipientUids = recipientUids.filter((uid) => mutes[uid] !== true);
  } catch {
    // 그대로 보냅니다.
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
