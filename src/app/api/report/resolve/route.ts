import { FieldValue } from "firebase-admin/firestore";
import { authorizeAccountRequest, primaryUidOf } from "@/lib/account-link-server";

/**
 * 신고 처리 (사용자 요청 2026-10-06, 구글 플레이 출시 준비) — 운영자(users의 role이 admin)만.
 * POST { reportId, action: "delete" | "dismiss" } + Authorization: Bearer <로그인 토큰>
 *  - delete : 신고된 글(원우소식·자료 파일·채팅 메시지·의견·투표·느낀점 댓글)의 Firestore 문서를 지웁니다. 원우 소개 영상은 영상 주소만 비웁니다.
 *             ★ 사진·파일 실물은 Cloudinary에 있어 서버가 지울 수 없습니다(서명 없는 업로드라 삭제 권한이 없음) — 문서만 지우면 앱에서는 사라집니다.
 *             사람 자체를 신고한 것(user)은 지울 글이 없어 delete가 안 됩니다(운영진 화면에서 차단 등으로 따로 조치).
 *  - dismiss: 글은 그대로 두고 신고만 "처리됨"으로.
 * 글 경로는 신고 종류에 맞는 모양만 받아들입니다(아무 문서나 지우지 못하게).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PATTERNS: Record<string, RegExp> = {
  message: /^chatRooms\/[^/]+\/messages\/[^/]+$/,
  album: /^photoAlbums\/[^/]+$/,
  file: /^files\/[^/]+$/,
  opinion: /^polls\/[^/]+\/opinions\/[^/]+$/,
  poll: /^polls\/[^/]+$/,
  comment: /^sessions\/[^/]+\/comments\/[^/]+$/,
  video: /^(users|roster)\/[^/]+$/,
};

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;
  const { db, token } = authed;

  const me = await db.collection("users").doc(await primaryUidOf(db, token.uid)).get();
  if (me.get("role") !== "admin") return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { reportId?: unknown; action?: unknown } | null;
  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  const action = body?.action;
  if (!reportId || reportId.includes("/") || (action !== "delete" && action !== "dismiss")) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const reportRef = db.collection("reports").doc(reportId);
  const report = await reportRef.get();
  if (!report.exists) return Response.json({ ok: false, reason: "not-found" }, { status: 404 });

  if (action === "delete") {
    const type = String(report.get("targetType") ?? "");
    const path = String(report.get("targetPath") ?? "");
    const pattern = PATTERNS[type];
    if (!pattern || !pattern.test(path)) return Response.json({ ok: false, reason: "not-deletable" }, { status: 400 });

    const target = db.doc(path);
    const snapshot = await target.get();
    if (snapshot.exists) {
      if (type === "video") {
        await target.update({ introVideoUrl: "" });
      } else if (type === "album") {
        // 소식에 딸린 사진 목록(photos)도 함께 — 문서만 남으면 목록에서 못 찾는 조각이 됩니다.
        const photos = await target.collection("photos").get();
        await Promise.all(photos.docs.map((photo) => photo.ref.delete()));
        await target.delete();
      } else if (type === "poll") {
        for (const sub of ["opinions", "tally", "voters"]) {
          const docs = await target.collection(sub).get();
          await Promise.all(docs.docs.map((d) => d.ref.delete()));
        }
        await target.delete();
      } else {
        await target.delete();
      }
    }
  }

  await reportRef.update({ status: "resolved", resolution: action, resolvedBy: token.uid, resolvedAt: FieldValue.serverTimestamp() });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
