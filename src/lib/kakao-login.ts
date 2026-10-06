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

import { apiUrl } from "@/lib/api";
import { isNativeApp } from "@/lib/native";

const STATE_KEY = "kakao-login-state";

export const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? "";
export const isKakaoConfigured = Boolean(KAKAO_REST_API_KEY);

/** 카카오가 code를 붙여 돌려보낼 주소. 카카오 개발자 콘솔의 Redirect URI에 똑같이 등록해야 합니다. */
export function kakaoRedirectUri(): string {
  // 앱 안(https://localhost)은 Redirect URI로 등록할 수 없어 웹 주소로 다녀옵니다 (2026-10-06 사용자 요청 (구글 플레이 출시 준비)).
  return isNativeApp() ? "https://aegiaeta.web.app/auth/kakao" : `${window.location.origin}/auth/kakao`;
}

/**
 * 앱 안 카카오 로그인 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱과 같음):
 * 시스템 브라우저로 카카오를 다녀온 웹 페이지(/auth/kakao)가 이 주소로 앱을 다시 엽니다(AndroidManifest의 intent-filter).
 * 웹 페이지는 state가 "app-"으로 시작하면 앱에서 시작한 로그인으로 보고 로그인 표(token)를 앱에 넘깁니다.
 */
export const KAKAO_APP_SCHEME = "app.web.aegiaeta";
const APP_STATE_PREFIX = "app-";
const NATIVE_STATE_KEY = "kakao-login-native-state";

/** 웹 쪽 /auth/kakao 페이지가 "앱에서 시작한 로그인"인지 알아보는 데 씁니다. */
export const isAppKakaoState = (state: string | null) => Boolean(state?.startsWith(APP_STATE_PREFIX));

/** 앱이 다시 열릴 때 돌아온 state가 내가 시작한 것과 같은지(남이 만든 로그인 링크로 끌려가는 것 막기) 확인하고 지웁니다. */
export function consumeNativeKakaoState(returned: string | null): boolean {
  try {
    const saved = localStorage.getItem(NATIVE_STATE_KEY);
    localStorage.removeItem(NATIVE_STATE_KEY);
    return Boolean(saved && returned && saved === returned);
  } catch {
    return false;
  }
}

/**
 * 추측할 수 없는 한 번 쓰는 값.
 * ★ crypto.randomUUID()는 https·localhost에서만 있어서, 폰 테스트 주소(http://172.30.1.8:3000)에서는
 *   없다고 터졌습니다(2026-09-23). getRandomValues는 http에서도 있으니 이걸로 만듭니다.
 */
function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 카카오 동의 화면으로 보냅니다. 이 함수를 부르면 화면이 넘어가므로 뒤의 코드는 돌지 않는다고 보세요. */
export function startKakaoLogin(): void {
  const native = isNativeApp();
  const state = native ? `${APP_STATE_PREFIX}${randomState()}` : randomState();
  try {
    // 앱은 카카오를 다녀오는 사이 프로세스가 끝날 수 있어 localStorage에 둡니다.
    if (native) localStorage.setItem(NATIVE_STATE_KEY, state);
    else sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // 저장이 막힌 브라우저 — 돌아왔을 때 state 확인에서 걸려 다시 시도하라고 안내합니다.
  }
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", KAKAO_REST_API_KEY);
  url.searchParams.set("redirect_uri", kakaoRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (native) void import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: url.toString() }));
  else window.location.assign(url.toString());
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
  const response = await fetch(apiUrl("/api/auth/kakao"), {
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
