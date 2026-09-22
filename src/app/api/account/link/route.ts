import { authorizeAccountRequest, linkIfSameMember } from "@/lib/account-link-server";

/**
 * 첫 프로필 설정에서 "같은 원우의 계정이 이미 있나" 묻는 창구 (2026-09-22).
 * POST { name, cohort, phone } + Authorization: Bearer <로그인 토큰>
 * (2026-09-23부터 판단은 전화번호 하나로 — name·cohort는 기록용입니다.)
 * 답: { match: "none" | "needs-phone" | "phone-mismatch" | "merged", token? } — 자세한 규칙은 lib/account-link-server.ts
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  const payload = (await request.json().catch(() => null)) as {
    name?: unknown;
    cohort?: unknown;
    phone?: unknown;
  } | null;
  const name = typeof payload?.name === "string" ? payload.name : "";
  const cohort = typeof payload?.cohort === "string" ? payload.cohort : "";
  const phone = typeof payload?.phone === "string" ? payload.phone : "";
  if (!name.trim() || !cohort) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const outcome = await linkIfSameMember(authed.db, authed.auth, authed.token, name, cohort, phone);
  return Response.json({ ok: true, ...outcome }, { headers: { "Cache-Control": "no-store" } });
}
