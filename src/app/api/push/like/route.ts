import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";

/**
 * 누군가 내 원우소식에 공감(하트)을 누르면 글쓴이에게 폰 알림을 보냅니다 (2026-10-06 사용자 요청 — 뉴웨이브앱 /api/push/prayed와 같은 짜임).
 *
 * - 누른 사람이 로그인 토큰으로 본인임을 밝히고, 그 소식(photoAlbums) 문서의 likedBy에 정말 들어 있을 때만 보냅니다(알림을 지어내지 못하게).
 * - 같은 사람이 같은 글에 켰다 껐다 해도 알림은 처음 한 번뿐입니다(pushLog에 "like:글id:누른사람" 표시를 남김).
 * - 받는 사람은 글쓴이 한 명, 내 글에 내가 누른 것은 보내지 않습니다. 누르면 위원회 탭(/news). 같은 글의 알림은 폰에서 한 칸에 겹쳐 보입니다.
 * - 문구: "○○님이 공감했어요 ❤️" / 본문은 그 소식의 제목.
 * ★ 요금: 새로 켠 순간마다 읽기 약 3건(글·누른 사람·표시)·쓰기 1건(표시) + 기기 토큰 읽기. 처음 한 번뿐이라 아주 적습니다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return Response.json({ ok: false, reason: "not-configured" });

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  let reactorUid: string;
  try {
    reactorUid = (await auth.verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { albumId?: unknown } | null;
  const albumId = typeof payload?.albumId === "string" ? payload.albumId : "";
  if (!albumId || albumId.includes("/")) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const albumRef = db.collection("photoAlbums").doc(albumId);
  const [reactor, firstRead] = await Promise.all([db.collection("users").doc(reactorUid).get(), albumRef.get()]);
  // 클라이언트가 쓰기 응답을 오래 기다리지 않고 알림을 부탁해서, 서버가 읽는 순간 아직 반영 전일 수 있습니다 — 한 번만 잠깐 뒤에 다시 읽습니다.
  let album = firstRead;
  if (!((album.get("likedBy") as string[] | undefined) ?? []).includes(reactorUid)) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    album = await albumRef.get();
  }
  if (!reactor.exists || reactor.get("status") !== "approved") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const authorUid = album.get("createdBy") as string | undefined;
  const likedBy = (album.get("likedBy") as string[] | undefined) ?? [];
  // 정말 이 사람이 눌러 둔 상태이고, 내 글이 아닐 때만
  if (!album.exists || !authorUid || authorUid === reactorUid || !likedBy.includes(reactorUid)) {
    return Response.json({ ok: true, sent: 0, reason: "skip" });
  }

  // 같은 사람·같은 글은 처음 한 번만 — create는 문서가 있으면 실패해서 동시에 두 번 와도 한쪽만 통과합니다.
  const marker = db.collection("pushLog").doc(`like:${albumId}:${reactorUid}`);
  try {
    await marker.create({ sentBy: reactorUid, sentAt: new Date() });
  } catch {
    return Response.json({ ok: true, sent: 0, reason: "already" });
  }

  const name = ((reactor.get("name") as string | undefined) ?? "").trim() || "원우";
  const title = ((album.get("title") as string | undefined) ?? "").trim().replace(/\s+/g, " ");
  const body = title ? (title.length > 50 ? `${title.slice(0, 50)}…` : title) : "위원회 탭에서 확인해 보세요";

  const result = await sendPushToUsers({
    recipientUids: [authorUid],
    title: `${name}님이 공감했어요 ❤️`,
    body,
    url: "/news",
    tag: `like:${albumId}`,
  });
  return Response.json({ ok: true, ...result });
}
