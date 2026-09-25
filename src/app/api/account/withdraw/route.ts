import { authorizeAccountRequest } from "@/lib/account-link-server";
import { withdrawAccount } from "@/lib/account-withdraw-server";

/**
 * 탈퇴 (2026-09-25). POST + Authorization: Bearer <로그인 토큰>
 * 로그인한 본인만 자기 계정을 지웁니다. 무엇을 지우고 남기는지는 lib/account-withdraw-server.ts.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  try {
    await withdrawAccount(authed.db, authed.auth, authed.token.uid);
  } catch (error) {
    console.error("withdraw failed", error);
    return Response.json({ ok: false, reason: "failed" }, { status: 500 });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
