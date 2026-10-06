import { primaryUidOf } from "@/lib/account-link-server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

/**
 * 카카오 로그인 창구 (2026-09-22).
 *
 * Firebase는 카카오를 기본 로그인 방법으로 주지 않아서, 서버가 가운데서 이어 줍니다.
 *   1. 브라우저가 카카오 동의 화면에 다녀오면 주소에 code가 붙어 /auth/kakao로 돌아옵니다.
 *   2. 그 화면이 여기로 { code, redirectUri }를 보냅니다.
 *   3. 여기서 code를 카카오 토큰으로 바꾸고, 그 토큰으로 "이 사람이 누구인지"(카카오 회원번호)를 묻습니다.
 *   4. 회원번호로 Firebase 계정 id를 정해("kakao:12345") 로그인 표(custom token)를 만들어 돌려줍니다.
 *   5. 브라우저는 signInWithCustomToken으로 로그인합니다. 그다음부터는 구글 로그인과 똑같습니다.
 *
 * ★ 처음엔 구글 계정과 **다른 계정**으로 시작합니다. 첫 프로필 설정에서 같은 기수·이름·(인증된) 휴대폰 번호의
 *   원우 계정이 있으면 그 계정에 이어지고, 그 뒤로는 카카오로 들어와도 그 계정으로 들어갑니다(아래 ④, 2026-09-22).
 *
 * 필요한 환경변수
 *   NEXT_PUBLIC_KAKAO_REST_API_KEY  카카오 앱의 REST API 키 (브라우저도 동의 화면 주소를 만들 때 씁니다)
 *   KAKAO_CLIENT_SECRET             (선택) 카카오 로그인 → 보안 → Client Secret을 켰을 때만
 *   FIREBASE_SERVICE_ACCOUNT        로그인 표에 서명합니다(알림·퀴즈 채점과 같은 값)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(reason: string, status: number) {
  return Response.json({ ok: false, reason }, { status, headers: NO_STORE });
}

/*
 * 2026-10-06 사용자 요청 (보안 점검 후 수정): 돌아올 주소는 브라우저가 알려 주지만, 예전에는
 * "경로가 /auth/kakao인 https 주소 아무거나"를 받았습니다. 이제 **서버가 가진 허용 목록과 글자 그대로**
 * 같을 때만 받습니다(아무 호스트나 넣어 code를 엉뚱한 곳 기준으로 교환하는 길을 막음).
 * 카카오 개발자 콘솔의 Redirect URI에도 같은 주소가 등록돼 있어야 합니다.
 *
 * ★ 확장 지점(다른 작업이 채움): 앱(Capacitor) 쪽 origin은 EXTRA_ALLOWED_ORIGINS 자리나
 *   환경변수 KAKAO_EXTRA_ALLOWED_ORIGINS(쉼표로 구분한 origin 목록, 예: https://example.com)로 더합니다.
 *   폰 테스트용 사설 IP(예: http://172.30.1.8:3000)도 예전에는 통과했지만 이제는 위 환경변수에 적어야 합니다.
 */
const SITE_ORIGIN = "https://aegiaeta.web.app";
const EXTRA_ALLOWED_ORIGINS: string[] = []; // ← 앱 origin을 여기에 더하세요(다른 작업 담당)

function allowedRedirectUris(): Set<string> {
  const origins = [SITE_ORIGIN, ...EXTRA_ALLOWED_ORIGINS];
  if (process.env.NODE_ENV !== "production") origins.push("http://localhost:3000");
  for (const extra of (process.env.KAKAO_EXTRA_ALLOWED_ORIGINS ?? "").split(",")) {
    if (extra.trim()) origins.push(extra.trim().replace(/\/$/, ""));
  }
  return new Set(origins.map((origin) => `${origin}/auth/kakao`));
}

function isAllowedRedirect(raw: string): boolean {
  return allowedRedirectUris().has(raw);
}

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  const adminAuth = getAdminAuth();
  if (!clientId || !adminAuth) return fail("not-configured", 503);

  const payload = (await request.json().catch(() => null)) as {
    code?: unknown;
    redirectUri?: unknown;
  } | null;
  const code = typeof payload?.code === "string" ? payload.code : "";
  const redirectUri = typeof payload?.redirectUri === "string" ? payload.redirectUri : "";
  if (!code || !isAllowedRedirect(redirectUri)) return fail("bad-request", 400);

  // ① code → 카카오 액세스 토큰
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    tokenBody.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }
  const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: tokenBody,
    cache: "no-store",
  });
  const token = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    error_code?: string;
  } | null;
  if (!tokenResponse.ok || !token?.access_token) {
    console.error("[kakao] 토큰 교환 실패", tokenResponse.status, token?.error_code);
    return fail("kakao-token", 401);
  }

  // ② 액세스 토큰 → 카카오 회원번호·닉네임·프로필 사진
  const meResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const me = (await meResponse.json().catch(() => null)) as {
    id?: number;
    kakao_account?: {
      profile?: { nickname?: string; profile_image_url?: string; is_default_image?: boolean };
    };
  } | null;
  if (!meResponse.ok || typeof me?.id !== "number") {
    console.error("[kakao] 사용자 정보 실패", meResponse.status);
    return fail("kakao-profile", 401);
  }

  const uid = `kakao:${me.id}`;
  const profile = me.kakao_account?.profile;
  const displayName = profile?.nickname || undefined;
  // 카카오 기본 이미지(회색 사람)는 사진이 없는 것으로 봅니다 — 앱의 이니셜 아바타가 더 낫습니다.
  const photoURL =
    profile?.profile_image_url && !profile.is_default_image
      ? profile.profile_image_url.replace(/^http:/, "https:")
      : undefined;

  /*
   * ③ Firebase 계정에 이름·사진을 적어 둡니다. 처음이면 만들고, 이미 있으면 그대로 둡니다.
   *   처음 가입 화면(join)이 user.displayName·photoURL을 읽어 프로필 문서를 만들기 때문입니다.
   *   두 번째 로그인부터는 카카오 쪽 닉네임이 바뀌어도 덮어쓰지 않습니다 — 앱 안 이름은 프로필 문서가 주인입니다.
   */
  try {
    await adminAuth.getUser(uid);
  } catch (caught) {
    if ((caught as { code?: string })?.code !== "auth/user-not-found") throw caught;
    await adminAuth.createUser({ uid, displayName, photoURL });
  }

  /*
   * ④ 로그인 표. 브라우저는 이것으로 signInWithCustomToken 합니다.
   *   이 카카오 계정이 예전에 구글 계정에 합쳐졌으면(accountLinks, 2026-09-22) 그 본계정의 표를 줍니다 —
   *   같은 원우가 카카오로 들어와도 원래 계정 하나로 쓰게. 규칙은 lib/account-link-server.ts.
   */
  const db = getAdminDb();
  const signInUid = db ? await primaryUidOf(db, uid) : uid;
  const customToken = await adminAuth.createCustomToken(
    signInUid,
    signInUid === uid ? { provider: "kakao" } : { provider: "kakao", linkedFrom: uid },
  );
  return Response.json({ ok: true, token: customToken }, { headers: NO_STORE });
}
