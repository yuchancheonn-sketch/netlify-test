/**
 * 보기 설정 — 글씨 크기와 흑백 모드.
 *
 * 이 앱만의 설정이고 기기마다 다를 수 있어서(집 태블릿은 크게, 폰은 보통)
 * Firestore가 아니라 그 기기의 localStorage에 담습니다. 읽기·쓰기 한도도 쓰지
 * 않고, 로그인 전에도 적용됩니다.
 *
 * 실제로 화면을 바꾸는 것은 CSS입니다. 여기서는 <html>에 표시만 달아두고
 * globals.css의 :root[data-text-scale] / :root[data-mono] 규칙이 받아갑니다.
 *
 * 이 파일에는 훅이 없습니다. 아래 조각 스크립트를 서버에서 그리는 layout.tsx가
 * 가져다 쓰는데, 훅이 한 줄이라도 섞여 있으면 Next가 "서버 화면에서 클라이언트
 * 전용 API를 가져왔다"며 빌드를 멈춥니다. 설정을 읽고 바꾸는 훅은
 * use-display-settings.ts에 따로 두었습니다.
 */

export const TEXT_SCALE_KEY = "agikaeta:text-scale";
export const MONO_KEY = "agikaeta:mono";

export type TextScale = "small" | "normal" | "large";

export const TEXT_SCALES: { value: TextScale; label: string }[] = [
  { value: "small", label: "작게" },
  { value: "normal", label: "보통" },
  { value: "large", label: "크게" },
];

export type DisplaySettings = {
  textScale: TextScale;
  mono: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  textScale: "normal",
  mono: false,
};

/**
 * 화면이 처음 그려지기 전에 <html>에 설정을 달아주는 조각 스크립트.
 *
 * layout.tsx의 <head>에 그대로 심습니다. 리액트가 켜진 뒤에 적용하면
 * 보통 크기·색으로 한 번 그려진 다음 바뀌어서 화면이 번쩍입니다.
 *
 * 시크릿 모드처럼 localStorage를 못 읽는 곳에서는 조용히 기본값으로 둡니다.
 * (여기서 오류가 나면 그 아래 스크립트가 전부 멈춥니다.)
 */
export const DISPLAY_SETTINGS_SCRIPT = `
try {
  var r = document.documentElement;
  var s = localStorage.getItem(${JSON.stringify(TEXT_SCALE_KEY)});
  if (s === "small" || s === "large") r.setAttribute("data-text-scale", s);
  if (localStorage.getItem(${JSON.stringify(MONO_KEY)}) === "on") {
    r.setAttribute("data-mono", "on");
  }
} catch (e) {}
`;
