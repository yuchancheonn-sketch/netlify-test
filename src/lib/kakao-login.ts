/**
 * 카카오 로그인 — 브라우저 쪽 (2026-09-22).
 *
 * 흐름은 app/api/auth/kakao/route.ts 맨 위 설명을 보세요.
 * 여기서는 ① 카카오 동의 화면으로 보내기와 ② 돌아왔을 때 서버에서 로그인 표 받아 오기만 합니다.
 *
 * ★ 팝업이 아니라 화면 통째로 카카오에 다녀옵니다(리디렉트).
 *   카카오톡 안의 브라우저·홈 화면에 추가한 앱은 팝업을 잘 못 띄웁니다.
 *
 * ★ state — 로그인을 시작한 게 정말 이 브라우저인지 확인하는 한 번 쓰고 버리는 값입니다.
 *   남이 만든 카카오 로그인 주소를 눌러 그 사람 계정으로 들어가게 되는 장난(CSRF)을 막습니다.
 */

const STATE_KEY = "kakao-login-state";

export const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? "";
export const isKakaoConfigured = Boolean(KAKAO_REST_API_KEY);

/** 카카오가 code를 붙여 돌려보낼 주소. 카카오 개발자 콘솔의 Redirect URI에 똑같이 등록해야 합니다. */
export function kakaoRedirectUri(): string {
  return `${window.location.origin}/auth/kakao`;
}

/** 카카오 동의 화면으로 보냅니다. 이 함수를 부르면 화면이 넘어가므로 뒤의 코드는 돌지 않는다고 보세요. */
export function startKakaoLogin(): void {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // 저장이 막힌 브라우저 — 돌아왔을 때 state 확인에서 걸려 다시 시도하라고 안내합니다.
  }
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", KAKAO_REST_API_KEY);
  url.searchParams.set("redirect_uri", kakaoRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

/** 돌아온 state가 떠날 때 적어 둔 것과 같은지. 한 번 확인하면 지웁니다. */
export function consumeKakaoState(returned: string | null): boolean {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    return false;
  }
  return Boolean(saved && returned && saved === returned);
}

/** 서버에 code를 넘겨 Firebase 로그인 표(custom token)를 받아 옵니다. */
export async function fetchKakaoFirebaseToken(code: string): Promise<string> {
  const response = await fetch("/api/auth/kakao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri: kakaoRedirectUri() }),
  });
  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    token?: string;
    reason?: string;
  } | null;
  if (!response.ok || !data?.token) {
    throw new Error(
      data?.reason === "not-configured"
        ? "카카오 로그인이 아직 준비되지 않았어요. 운영진에게 알려주세요."
        : `카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.${data?.reason ? ` (${data.reason})` : ""}`,
    );
  }
  return data.token;
}
