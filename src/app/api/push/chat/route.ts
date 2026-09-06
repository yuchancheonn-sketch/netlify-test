import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";
import { MAIN_CHAT_ROOM_ID, MAIN_CHAT_ROOM_TITLE } from "@/lib/constants";

/**
 * 채팅 메시지를 보낸 뒤 클라이언트가 부르는 창구.
 *
 * 클라이언트는 자기 로그인 토큰을 함께 보냅니다. 서버가 그걸로
 *  1) 진짜 그 사람이 보낸 게 맞는지 확인하고,
 *  2) 그 방에 있는 다른 사람이 누구인지 알아낸 뒤,
 *  3) 그 사람들의 기기로 알림을 보냅니다.
 *
 * 보낸 사람 이름은 클라이언트 말을 믿지 않고 users 문서에서 직접 읽습니다.
 * 알림은 있으면 좋은 것이라, 설정이 없거나 실패해도 200으로 조용히 넘어갑니다.
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

  // ── 이 방에서 알림을 받을 사람 추리기 ──
  let recipientUids: string[];
  const isGroup = roomId === MAIN_CHAT_ROOM_ID;
  if (isGroup) {
    const roomSnap = await db.collection("chatRooms").doc(MAIN_CHAT_ROOM_ID).get();
    const memberUids = (roomSnap.get("memberUids") as string[] | undefined) ?? [];
    recipientUids = memberUids.filter((uid) => uid !== senderUid);
  } else {
    const parts = roomId.split("__");
    if (parts.length !== 2 || !parts.includes(senderUid)) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
    recipientUids = parts.filter((uid) => uid !== senderUid);
  }
  if (recipientUids.length === 0) return Response.json({ ok: true, sent: 0 });

  // 보낸 사람 이름은 서버가 직접 확인합니다.
  const senderSnap = await db.collection("users").doc(senderUid).get();
  const senderName =
    (senderSnap.get("name") as string | undefined) ||
    (senderSnap.get("nickname") as string | undefined) ||
    "원우";

  const result = await sendPushToUsers({
    recipientUids,
    title: isGroup ? `${senderName} · ${MAIN_CHAT_ROOM_TITLE}` : senderName,
    body: text,
    url: `/chat/${roomId}`,
    tag: `chat:${roomId}`,
  });

  return Response.json({ ok: true, ...result });
}
