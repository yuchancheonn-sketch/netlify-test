import { authorizeAccountRequest, primaryUidOf, recordVerifiedPhone } from "@/lib/account-link-server";

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
  // 2026-10-06 사용자 요청 (보안 점검 후 수정): 문자로 인증된 번호면 서버에만 "이 본계정이 증명함"을 적어 둡니다
  // (옛 계정 이월 포함 — lib/account-link-server.ts 맨 위 설명).
  await recordVerifiedPhone(authed.db, authed.token, primary);
  const token = primary === uid ? null : await authed.auth.createCustomToken(primary, { linkedFrom: uid });
  return Response.json({ ok: true, token }, { headers: { "Cache-Control": "no-store" } });
}
