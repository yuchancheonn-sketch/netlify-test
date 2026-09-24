import { fileURLToPath } from "node:url";

/*
 * 모든 font-size를 var(--text-scale)배로 — 설정의 "큰 글씨"가 글씨만 키우게 (2026-09-25, 파일 안 주석 참고).
 * Tailwind 다음에 돌아야 Tailwind가 만든 text-[15px]까지 감쌉니다.
 * ★ 절대 경로로 넘깁니다 — "./postcss-text-scale.cjs"처럼 상대 경로로 적으면 Turbopack이 .next 안에서
 *   찾다가 "Cannot find module"로 CSS 전체가 깨집니다. 이 파일 자리에서 계산하므로 어느 컴퓨터·배포 서버에서도 맞습니다.
 */
const textScalePlugin = fileURLToPath(new URL("./postcss-text-scale.cjs", import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [textScalePlugin]: {},
  },
};

export default config;
