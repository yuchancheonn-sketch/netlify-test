/**
 * PWA 홈 화면 아이콘(PNG)을 만드는 스크립트입니다.
 *
 *   npm run icons
 *
 * 공식 포스터의 "주황 리본" 모티프를 벡터 도형만으로 그려서 PNG로 굽습니다.
 * 글자를 쓰지 않으므로 실행하는 컴퓨터에 어떤 폰트가 깔려 있든 결과가 같습니다.
 *
 * 애기애타 서예 로고 원본 파일을 받으면 public/brand/logo.png 로 넣어주세요.
 * 로그인 화면이 그 파일을 자동으로 찾아 씁니다. (README 참고)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(process.cwd(), "public");

/**
 * @param {number} inset 가장자리 여백 비율. 마스커블 아이콘은 안드로이드가
 *   바깥쪽을 잘라내므로 중요한 요소를 가운데로 모으기 위해 여백을 줍니다.
 */
function iconSvg(inset = 0) {
  // 1024 기준으로 그린 뒤 필요한 크기로 줄입니다.
  const s = 1024;
  const pad = s * inset;
  const inner = s - pad * 2;
  const r = inner * 0.22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F79A3C"/>
      <stop offset="45%" stop-color="#EF7A16"/>
      <stop offset="100%" stop-color="#B0490B"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="ribbon2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip">
      <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}"/>
    </clipPath>
  </defs>

  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="url(#bg)"/>

  <g clip-path="url(#clip)">
    <!-- 포스터의 실크 리본처럼 화면을 가로지르는 부드러운 곡선들 -->
    <path d="M-60 700 C 240 640, 320 300, 620 250 S 1000 190, 1120 120 L 1120 -40 L -60 -40 Z"
          fill="url(#ribbon2)"/>
    <path d="M-60 820 C 260 780, 380 470, 700 420 C 900 388, 1020 330, 1120 250"
          fill="none" stroke="url(#ribbon)" stroke-width="86" stroke-linecap="round"/>
    <path d="M-60 960 C 300 930, 460 640, 780 590 C 950 562, 1050 500, 1120 430"
          fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="44" stroke-linecap="round"/>
    <path d="M-60 1090 C 340 1060, 540 790, 880 740 C 1010 720, 1080 680, 1120 640"
          fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="26" stroke-linecap="round"/>
  </g>

  <!--
    애기애타 서예 로고와 같은 2x2 배치.
    한문은 오른쪽 세로줄부터 읽으므로 오른쪽 위 愛 → 오른쪽 아래 己,
    왼쪽 위 愛 → 왼쪽 아래 他 순서입니다.
  -->
  <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${inner * 0.011}" stroke-linejoin="round"
     font-family="Batang, BatangChe, SimSun, serif" font-weight="bold" text-anchor="middle">
    <text x="${s * 0.35}" y="${s * 0.485}" font-size="${inner * 0.31}">愛</text>
    <text x="${s * 0.65}" y="${s * 0.485}" font-size="${inner * 0.31}">愛</text>
    <text x="${s * 0.35}" y="${s * 0.785}" font-size="${inner * 0.31}">他</text>
    <text x="${s * 0.65}" y="${s * 0.785}" font-size="${inner * 0.31}">己</text>
  </g>
</svg>`;
}

/** 파비콘·로그인 화면에서 쓰는 벡터 버전 (배경 없이 리본만) */
const targets = [
  { file: "icon-192.png", size: 192, inset: 0 },
  { file: "icon-512.png", size: 512, inset: 0 },
  { file: "icon-maskable-512.png", size: 512, inset: 0.1 },
  { file: "apple-icon.png", size: 180, inset: 0 },
];

async function main() {
  await mkdir(publicDir, { recursive: true });

  for (const { file, size, inset } of targets) {
    const png = await sharp(Buffer.from(iconSvg(inset)))
      .resize(size, size)
      .png()
      .toBuffer();
    await writeFile(path.join(publicDir, file), png);
    console.log(`생성 완료: public/${file} (${size}x${size})`);
  }

  // 브라우저 탭용 SVG 파비콘도 함께 저장합니다.
  await writeFile(path.join(publicDir, "icon.svg"), iconSvg(0));
  console.log("생성 완료: public/icon.svg");
}

main().catch((error) => {
  console.error("아이콘 생성에 실패했어요:", error);
  process.exit(1);
});
