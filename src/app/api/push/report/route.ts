import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";

/**
 * 새 신고가 올라오면 운영진에게 폰 알림 (사용자 요청 2026-10-06, 구글 플레이 출시 준비 — 신고는 빨리 처리해야 하므로 바로 알립니다.
 * 뉴웨이브앱 /api/push/report와 같은 짜임).
 * POST { reportId } + Authorization: Bearer <로그인 토큰> — 신고를 올린 사람 본인이 부를 때만 보냅니다.
 * 같은 신고에 대해서는 한 번만 보냅니다(pushLog "report:신고id").
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return Response.json({ ok: false, reason: "not-configured" });

  const header = request.headers.get("authorization") ?? "";
  let callerUid: string;
  try {
    callerUid = (await auth.verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { reportId?: unknown } | null;
  const reportId = typeof payload?.reportId === "string" ? payload.reportId : "";
  if (!reportId || reportId.includes("/")) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const [caller, report] = await Promise.all([db.collection("users").doc(callerUid).get(), db.collection("reports").doc(reportId).get()]);
  if (!caller.exists || caller.get("status") !== "approved") return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  if (!report.exists || report.get("reporterUid") !== callerUid) return Response.json({ ok: true, sent: 0, reason: "skip" });

  // 같은 신고는 한 번만 — create는 문서가 있으면 실패해서 동시에 두 번 와도 한쪽만 통과합니다.
  try {
    await db.collection("pushLog").doc(`report:${reportId}`).create({ sentBy: callerUid, sentAt: new Date() });
  } catch {
    return Response.json({ ok: true, sent: 0, reason: "already" });
  }

  const admins = await db.collection("users").where("role", "==", "admin").where("status", "==", "approved").select("name").get();
  const recipientUids = admins.docs.map((doc) => doc.id).filter((uid) => uid !== callerUid);
  if (!recipientUids.length) return Response.json({ ok: true, sent: 0, reason: "no-admin" });

  const target = String(report.get("targetName") ?? "").trim();
  const result = await sendPushToUsers({
    recipientUids,
    title: "새 신고가 접수됐어요",
    body: `${report.get("reason") ?? ""}${target ? ` · ${target}님` : ""}`,
    url: "/admin",
    tag: "report",
  });
  return Response.json({ ok: true, ...result });
}
