/**
 * 로그인하러 가기 전에 있던 주소를 기억했다가, 로그인을 마치면 그리로 돌려보냅니다 (2026-09-24).
 * sessionStorage라 그 탭(카톡 안 브라우저 포함)에서만 이어집니다. StageGate가 로그인을 마친 순간 꺼내 씁니다.
 */
const RETURN_KEY = "agikaeta:return";
/** 돌아올 곳으로 기억하지 않는 주소 — 로그인·가입 단계 화면들. */
const GATE_PATHS = ["/login", "/join", "/pending", "/onboarding", "/auth"];

export function rememberReturnPath(path?: string) {
  const target = path ?? window.location.pathname + window.location.search;
  const pathname = target.split("?")[0];
  if (pathname === "/" || GATE_PATHS.some((gate) => pathname.startsWith(gate))) return;
  try {
    sessionStorage.setItem(RETURN_KEY, target);
  } catch {}
}

export function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
