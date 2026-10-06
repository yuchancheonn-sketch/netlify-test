/**
 * 서버 창구(/api/…) 주소 만들기 (2026-10-06 사용자 요청 (구글 플레이 출시 준비)).
 * 웹에서는 같은 사이트의 상대 주소 그대로(NEXT_PUBLIC_API_BASE가 비어 있음)이고,
 * 앱(Capacitor)용 빌드에서는 scripts/build-app.mjs가 NEXT_PUBLIC_API_BASE=https://aegiaeta.web.app 으로 지정해
 * 앱 안의 화면이 서버 창구를 그 주소로 부르게 합니다. 서버 쪽은 next.config.ts의 headers()가 앱의 요청을 허용합니다(CORS).
 * ★ 새로 /api/… 를 부르는 코드를 쓸 때는 fetch("/api/…") 대신 반드시 fetch(apiUrl("/api/…")) 로 쓰세요.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
