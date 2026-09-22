import { adoptIntoPhoneAccount, authorizeAccountRequest } from "@/lib/account-link-server";

/**
 * 합치려는 번호가 이미 휴대폰 로그인 계정일 때 (2026-09-23).
 * POST { aliasIdToken } + Authorization: Bearer <그 번호 계정의 로그인 토큰>
 * 답: { merged, token: string | null } — token이 있으면 그 본계정으로 바꿔 탑니다.
 * 자세한 규칙은 lib/account-link-server.ts의 adoptIntoPhoneAccount.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  const payload = (await request.json().catch(() => null)) as { aliasIdToken?: unknown } | null;
  const aliasIdToken = typeof payload?.aliasIdToken === "string" ? payload.aliasIdToken : "";
  if (!aliasIdToken) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const outcome = await adoptIntoPhoneAccount(authed.db, authed.auth, authed.token, aliasIdToken);
  return Response.json({ ok: true, ...outcome }, { headers: { "Cache-Control": "no-store" } });
}
