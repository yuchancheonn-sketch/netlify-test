import { authorizeAccountRequest, primaryUidOf } from "@/lib/account-link-server";

/**
 * "이 로그인은 다른 계정에 이어져 있나" 묻는 창구 (2026-09-22).
 * 휴대폰으로 로그인했는데 그 번호 계정이 예전에 구글 계정에 합쳐졌다면, 본계정 로그인 표를 돌려줍니다.
 * 가입 화면(join)이 계정 문서를 새로 만들기 전에 먼저 부릅니다. 답: { token: string | null }
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  const uid = authed.token.uid;
  const primary = await primaryUidOf(authed.db, uid);
  const token = primary === uid ? null : await authed.auth.createCustomToken(primary, { linkedFrom: uid });
  return Response.json({ ok: true, token }, { headers: { "Cache-Control": "no-store" } });
}
