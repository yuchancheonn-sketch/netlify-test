/**
 * PWA 홈 화면 아이콘(PNG)을 만드는 스크립트입니다.
 *
 *   npm run icons
 *
 * 구성:
 *   1) 주황 그라데이션 바탕
 *   2) 배경 무늬 — public/brand/goose.png(또는 .jpg)가 있으면 그 사진에서
 *      기러기 실루엣을 따내어 은은하게 깔고, 없으면 포스터의 물결 무늬를 씁니다.
 *   3) 愛己愛他 네 글자 (서예 로고와 같은 2x2 배치)
 *
 * 기러기 사진은 배경과 기러기의 밝기 차이로 모양을 잡아냅니다.
 * 하늘을 나는 기러기처럼 배경이 단순한 사진일수록 깨끗하게 따집니다.
 * PNG에 이미 투명 배경이 있다면 그 투명도를 그대로 씁니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(process.cwd(), "public");
const brandDir = path.join(publicDir, "brand");

/** 아이콘을 그리는 기준 크기 */
const S = 1024;

/** 기러기 사진을 찾을 후보 경로 */
const GOOSE_CANDIDATES = ["goose.png", "goose.jpg", "goose.jpeg", "goose.webp"].map((name) =>
  path.join(brandDir, name),
);

/**
 * 사진에서 기러기 실루엣을 따내어, 흰색 반투명 PNG로 만들어 돌려줍니다.
 * 못 찾거나 실패하면 null을 돌려주고 호출한 쪽이 물결 무늬로 넘어갑니다.
 *
 * @param {number} boxSize 실루엣이 들어갈 정사각형 한 변
 * @param {number} opacity 0~1
 */
async function buildGooseSilhouette(boxSize, opacity) {
  const source = GOOSE_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!source) return null;

  const input = await readFile(source);
  const image = sharp(input).resize(boxSize, boxSize, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  });

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;

  // 원본에 투명 영역이 넉넉히 있으면(=배경이 이미 지워진 그림) 그 투명도를 그대로 씁니다.
  let transparentPixels = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    if (data[i * channels + 3] < 128) transparentPixels += 1;
  }
  const alreadyCutOut = transparentPixels > pixelCount * 0.15;

  /** 밝기 (0~255) */
  const luminance = (i) => {
    const o = i * channels;
    return 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
  };

  let isSubject;
  if (alreadyCutOut) {
    isSubject = (i) => data[i * channels + 3] >= 128;
  } else {
    /*
     * 배경이 어두운지 밝은지 모르므로 가장자리를 표본으로 삼습니다.
     * 사진의 테두리는 거의 항상 배경이기 때문입니다.
     * 그 평균 밝기와 반대쪽에 있는 픽셀을 기러기로 봅니다.
     */
    let edgeSum = 0;
    let edgeCount = 0;
    for (let x = 0; x < width; x += 1) {
      edgeSum += luminance(x) + luminance((height - 1) * width + x);
      edgeCount += 2;
    }
    for (let y = 0; y < height; y += 1) {
      edgeSum += luminance(y * width) + luminance(y * width + width - 1);
      edgeCount += 2;
    }
    const edgeAverage = edgeSum / edgeCount;

    // 전체 평균과 가장자리 평균의 중간을 경계로 삼아 어중간한 픽셀을 걸러냅니다.
    let totalSum = 0;
    for (let i = 0; i < pixelCount; i += 1) totalSum += luminance(i);
    const overallAverage = totalSum / pixelCount;

    const threshold = (edgeAverage + overallAverage) / 2;
    const backgroundIsBright = edgeAverage >= overallAverage;

    isSubject = backgroundIsBright
      ? (i) => luminance(i) < threshold && data[i * channels + 3] >= 128
      : (i) => luminance(i) > threshold && data[i * channels + 3] >= 128;
  }

  // 따낸 모양을 흰색 반투명으로 칠합니다.
  const out = Buffer.alloc(pixelCount * 4);
  let subjectPixels = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const hit = isSubject(i);
    if (hit) subjectPixels += 1;
    const o = i * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = hit ? Math.round(255 * opacity) : 0;
  }

  const coverage = subjectPixels / pixelCount;
  // 전부 칠해지거나 거의 안 칠해지면 실루엣을 잘못 따낸 것이므로 쓰지 않습니다.
  if (coverage < 0.01 || coverage > 0.7) {
    console.warn(
      `기러기 실루엣을 제대로 따내지 못했어요 (덮인 비율 ${(coverage * 100).toFixed(1)}%). ` +
        `물결 무늬로 대신합니다. 배경이 단순한 사진을 쓰면 잘 따집니다.`,
    );
    return null;
  }

  console.log(
    `기러기 실루엣 사용: ${path.basename(source)} ` +
      `(덮인 비율 ${(coverage * 100).toFixed(1)}%, ${alreadyCutOut ? "투명 배경 그대로" : "밝기 차이로 따냄"})`,
  );

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** 바탕 + (물결 무늬) + 글자. 기러기는 이 위에 따로 합성합니다. */
function iconSvg(inset, { withWaves }) {
  const pad = S * inset;
  const inner = S - pad * 2;
  const r = inner * 0.22;

  const waves = withWaves
    ? `
  <g clip-path="url(#clip)">
    <path d="M-60 700 C 240 640, 320 300, 620 250 S 1000 190, 1120 120 L 1120 -40 L -60 -40 Z"
          fill="url(#ribbon2)"/>
    <path d="M-60 820 C 260 780, 380 470, 700 420 C 900 388, 1020 330, 1120 250"
          fill="none" stroke="url(#ribbon)" stroke-width="86" stroke-linecap="round"/>
    <path d="M-60 960 C 300 930, 460 640, 780 590 C 950 562, 1050 500, 1120 430"
          fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="44" stroke-linecap="round"/>
    <path d="M-60 1090 C 340 1060, 540 790, 880 740 C 1010 720, 1080 680, 1120 640"
          fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="26" stroke-linecap="round"/>
  </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF9440"/>
      <stop offset="45%" stop-color="#FF7210"/>
      <stop offset="100%" stop-color="#C9490A"/>
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
${waves}
</svg>`;
}

/**
 * 愛己愛他 네 글자. 서예 로고와 같은 2x2 배치입니다.
 * 한문은 오른쪽 세로줄부터 읽으므로
 * 오른쪽 위 愛 → 오른쪽 아래 己, 왼쪽 위 愛 → 왼쪽 아래 他 순서입니다.
 */
function textSvg(inset) {
  const inner = S - S * inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${inner * 0.011}" stroke-linejoin="round"
     font-family="Batang, BatangChe, SimSun, serif" font-weight="bold" text-anchor="middle">
    <text x="${S * 0.35}" y="${S * 0.485}" font-size="${inner * 0.31}">愛</text>
    <text x="${S * 0.65}" y="${S * 0.485}" font-size="${inner * 0.31}">愛</text>
    <text x="${S * 0.35}" y="${S * 0.785}" font-size="${inner * 0.31}">他</text>
    <text x="${S * 0.65}" y="${S * 0.785}" font-size="${inner * 0.31}">己</text>
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, inset: 0 },
  { file: "icon-512.png", size: 512, inset: 0 },
  { file: "icon-maskable-512.png", size: 512, inset: 0.1 },
  { file: "apple-icon.png", size: 180, inset: 0 },
];

async function main() {
  await mkdir(publicDir, { recursive: true });

  // 기러기는 글자를 가리지 않도록 살짝 크게, 아주 옅게 깔아둡니다.
  const gooseBox = Math.round(S * 0.78);
  const goose = await buildGooseSilhouette(gooseBox, 0.2);
  const useWaves = goose === null;

  for (const { file, size, inset } of targets) {
    const layers = [];
    if (goose) {
      const offset = Math.round((S - gooseBox) / 2);
      layers.push({ input: goose, top: offset, left: offset });
    }
    layers.push({ input: Buffer.from(textSvg(inset)) });

    /*
     * sharp는 한 파이프라인 안에서 resize를 composite보다 먼저 적용합니다.
     * 그래서 1024 크기로 다 합쳐서 한 장을 만든 뒤, 따로 줄여야 합니다.
     */
    const full = await sharp(Buffer.from(iconSvg(inset, { withWaves: useWaves })))
      .composite(layers)
      .png()
      .toBuffer();

    const png = await sharp(full).resize(size, size).png().toBuffer();

    await writeFile(path.join(publicDir, file), png);
    console.log(`생성 완료: public/${file} (${size}x${size})`);
  }

  /*
   * 브라우저 탭용 SVG 파비콘.
   * 사진에서 따낸 실루엣은 SVG에 담기 어려우므로 여기에는 물결 무늬를 씁니다.
   * 아주 작게 보이는 자리라 무늬 차이는 드러나지 않습니다.
   */
  await writeFile(
    path.join(publicDir, "icon.svg"),
    iconSvg(0, { withWaves: true }).replace("</svg>", `${textSvg(0).match(/<g[\s\S]*<\/g>/)[0]}</svg>`),
  );
  console.log("생성 완료: public/icon.svg");
}

main().catch((error) => {
  console.error("아이콘 생성에 실패했어요:", error);
  process.exit(1);
});
