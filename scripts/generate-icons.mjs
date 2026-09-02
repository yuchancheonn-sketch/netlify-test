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

/**
 * 기러기 무늬 조절값. 이 세 개만 만지면 모양이 바뀝니다.
 * - BOX: 아이콘 한 변에 대한 비율. 1에 가까울수록 크게 들어갑니다.
 * - ROTATION: 기울기(도). 음수면 왼쪽으로 기웁니다.
 * - OPACITY: 진하기. 글자를 가리지 않도록 옅게 둡니다.
 */
const GOOSE_BOX = 0.72;
const GOOSE_ROTATION = 0;
const GOOSE_OPACITY = 0.2;

/**
 * 원본이 로고라면 기러기 주위에 "DOSAN ACADEMY" 같은 글자가 함께 들어 있습니다.
 * 글자는 작은 조각 여러 개, 기러기는 큰 덩어리 하나이므로
 * 가장 큰 덩어리의 이 비율보다 작은 조각은 글자로 보고 지웁니다.
 */
const GOOSE_MIN_PIECE_RATIO = 0.12;

/** 기러기 사진을 찾을 후보 경로 */
const GOOSE_CANDIDATES = ["goose.png", "goose.jpg", "goose.jpeg", "goose.webp"].map((name) =>
  path.join(brandDir, name),
);

/**
 * 서로 붙어 있는 픽셀끼리 묶어(연결 요소) 큰 덩어리만 남깁니다.
 * 로고에 들어 있는 "DOSAN ACADEMY" 같은 글자는 작은 조각으로 흩어져 있어
 * 이 과정에서 걸러지고, 기러기 몸통과 날개만 남습니다.
 *
 * @param {Uint8Array} mask 1이면 그림, 0이면 배경
 * @returns {Uint8Array} 큰 덩어리만 1로 남긴 새 마스크
 */
function keepLargestPieces(mask, width, height) {
  const total = width * height;
  const label = new Int32Array(total).fill(-1);
  /** @type {number[]} 덩어리별 픽셀 수 */
  const sizes = [];
  // 재귀 대신 직접 만든 대기열을 씁니다. 큰 그림에서 호출 스택이 넘치지 않게요.
  const queue = new Int32Array(total);

  for (let start = 0; start < total; start += 1) {
    if (mask[start] !== 1 || label[start] !== -1) continue;

    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    let size = 0;

    while (head < tail) {
      const index = queue[head++];
      size += 1;
      const x = index % width;
      const y = (index - x) / width;

      // 위아래좌우 + 대각선까지 이웃으로 봅니다. 얇은 선이 끊기지 않습니다.
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next] !== 1 || label[next] !== -1) continue;
          label[next] = id;
          queue[tail++] = next;
        }
      }
    }

    sizes.push(size);
  }

  if (sizes.length === 0) return mask;

  const largest = Math.max(...sizes);
  const minSize = largest * GOOSE_MIN_PIECE_RATIO;
  const keep = sizes.map((size) => size >= minSize);
  const dropped = keep.filter((value) => !value).length;

  if (dropped > 0) {
    console.log(
      `  조각 ${sizes.length}개 중 ${dropped}개를 글자로 보고 지웠습니다 ` +
        `(가장 큰 덩어리의 ${Math.round(GOOSE_MIN_PIECE_RATIO * 100)}% 미만)`,
    );
  }

  const out = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    if (mask[i] === 1 && keep[label[i]]) out[i] = 1;
  }
  return out;
}

/**
 * 사진에서 기러기 실루엣을 따내어, 흰색 반투명 PNG로 만들어 돌려줍니다.
 * 못 찾거나 실패하면 null을 돌려주고 호출한 쪽이 물결 무늬로 넘어갑니다.
 *
 * @param {number} boxSize 실루엣이 들어갈 정사각형 한 변
 * @param {number} opacity 0~1
 */
async function buildGooseSilhouette(boxSize, opacity, rotationDeg) {
  const source = GOOSE_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!source) return null;

  const input = await readFile(source);

  /*
   * 실루엣을 따내는 작업은 원본 해상도에서 합니다.
   * 기울인 뒤에 최종 크기로 맞추는 편이, 회전하면서 잘려나가는 부분 없이
   * 날개 끝까지 온전히 담깁니다.
   */
  const { data, info } = await sharp(input)
    .resize(800, 800, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
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

  // 따낸 자리를 표시해 두고, 글자 조각을 걸러낸 뒤에 칠합니다.
  const mask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) mask[i] = isSubject(i) ? 1 : 0;

  const kept = keepLargestPieces(mask, width, height);

  const out = Buffer.alloc(pixelCount * 4);
  let subjectPixels = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const hit = kept[i] === 1;
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
      `(덮인 비율 ${(coverage * 100).toFixed(1)}%, ${alreadyCutOut ? "투명 배경 그대로" : "밝기 차이로 따냄"}, ` +
      `기울기 ${rotationDeg}도, 크기 ${Math.round(GOOSE_BOX * 100)}%)`,
  );

  /*
   * 기울이면 sharp가 캔버스를 알아서 넓혀 주므로 날개 끝이 잘리지 않습니다.
   *
   * 다만 넓어진 캔버스를 그대로 줄이면 기러기 둘레의 빈 공간까지 함께 줄어들어
   * 실제 기러기는 거의 커지지 않습니다. 그래서 회전 뒤 투명한 가장자리를
   * 잘라내(trim) 기러기가 화면을 꽉 채우도록 맞춥니다.
   */
  const rotated = await sharp(out, { raw: { width, height, channels: 4 } })
    .rotate(rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let hugged = rotated;
  try {
    hugged = await sharp(rotated).trim({ threshold: 1 }).png().toBuffer();
  } catch {
    // 잘라낼 여백을 못 찾으면 회전 결과를 그대로 씁니다.
  }

  return sharp(hugged)
    .resize(boxSize, boxSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * 바탕 + (물결 무늬) + 글자. 기러기는 이 위에 따로 합성합니다.
 *
 * @param {number} inset 가장자리 여백 비율
 * @param {object} options
 * @param {boolean} options.withWaves 물결 무늬를 그릴지
 * @param {boolean} [options.square] 모서리를 깎지 않고 꽉 채울지.
 *   iOS 홈 화면 아이콘은 iOS가 직접 둥근 모양을 씌우기 때문에,
 *   우리가 미리 깎아서 모서리를 투명하게 두면 그 부분이 검게 채워집니다.
 *   그래서 애플용 아이콘만 모서리 없이 불투명한 정사각형으로 만듭니다.
 */
function iconSvg(inset, { withWaves, square = false }) {
  const pad = S * inset;
  const inner = S - pad * 2;
  const r = square ? 0 : inner * 0.22;

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
function textSvg(inset, dx = 0, dy = 0) {
  const inner = S - S * inset * 2;
  const size = inner * 0.31;
  const left = S * 0.35 + dx;
  const right = S * 0.65 + dx;
  const top = S * 0.485 + dy;
  const bottom = S * 0.785 + dy;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${inner * 0.011}" stroke-linejoin="round"
     font-family="Batang, BatangChe, SimSun, serif" font-weight="bold" text-anchor="middle">
    <text x="${left}" y="${top}" font-size="${size}">愛</text>
    <text x="${right}" y="${top}" font-size="${size}">愛</text>
    <text x="${left}" y="${bottom}" font-size="${size}">他</text>
    <text x="${right}" y="${bottom}" font-size="${size}">己</text>
  </g>
</svg>`;
}

/**
 * 글자 네 개가 실제로 차지하는 범위를 재서, 아이콘 정가운데로 옮기는 데 필요한
 * 이동량을 돌려줍니다.
 *
 * 한자는 글자마다 위아래 여백이 달라서 좌표만 보고 가운데를 맞출 수 없습니다.
 * 그려본 뒤 잉크가 묻은 범위를 직접 재는 편이 확실합니다.
 */
async function measureCenteringOffset(inset) {
  const { data, info } = await sharp(Buffer.from(textSvg(inset)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] < 16) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { dx: 0, dy: 0 };

  const dx = Math.round(width / 2 - (minX + maxX) / 2);
  const dy = Math.round(height / 2 - (minY + maxY) / 2);
  return { dx, dy, minY, maxY };
}

const targets = [
  { file: "icon-192.png", size: 192, inset: 0 },
  { file: "icon-512.png", size: 512, inset: 0 },
  // 안드로이드 마스커블: 바깥이 잘려나가므로 여백을 두고, 모서리도 시스템이 깎습니다.
  { file: "icon-maskable-512.png", size: 512, inset: 0.1, square: true },
  // iOS 홈 화면: 모서리를 깎지 않은 불투명 정사각형이어야 합니다.
  { file: "apple-icon.png", size: 180, inset: 0, square: true },
];

async function main() {
  await mkdir(publicDir, { recursive: true });

  // 기러기는 글자를 가리지 않도록 아주 옅게 깔아둡니다.
  const gooseBox = Math.round(S * GOOSE_BOX);
  const goose = await buildGooseSilhouette(gooseBox, GOOSE_OPACITY, GOOSE_ROTATION);
  const useWaves = goose === null;

  // 글자를 정가운데로 맞추는 데 필요한 이동량은 여백(inset)마다 다릅니다.
  const centering = new Map();

  for (const { file, size, inset, square = false } of targets) {
    if (!centering.has(inset)) {
      const offset = await measureCenteringOffset(inset);
      centering.set(inset, offset);
      console.log(
        `글자 가운데 맞추기(여백 ${Math.round(inset * 100)}%): ` +
          `가로 ${offset.dx > 0 ? "+" : ""}${offset.dx}, 세로 ${offset.dy > 0 ? "+" : ""}${offset.dy} (1024 기준)`,
      );
    }
    const { dx, dy } = centering.get(inset);

    const layers = [];
    if (goose) {
      const offset = Math.round((S - gooseBox) / 2);
      layers.push({ input: goose, top: offset, left: offset });
    }
    layers.push({ input: Buffer.from(textSvg(inset, dx, dy)) });

    /*
     * sharp는 한 파이프라인 안에서 resize를 composite보다 먼저 적용합니다.
     * 그래서 1024 크기로 다 합쳐서 한 장을 만든 뒤, 따로 줄여야 합니다.
     */
    const full = await sharp(Buffer.from(iconSvg(inset, { withWaves: useWaves, square })))
      .composite(layers)
      .png()
      .toBuffer();

    let pipeline = sharp(full).resize(size, size);

    if (square) {
      /*
       * 투명한 곳이 조금이라도 남으면 iOS가 그 부분을 검게 칠합니다.
       * 브랜드 주황으로 배경을 깔고 알파 채널을 아예 없애 완전히 불투명하게 만듭니다.
       */
      pipeline = pipeline.flatten({ background: "#FF7210" }).removeAlpha();
    }

    const png = await pipeline.png().toBuffer();

    await writeFile(path.join(publicDir, file), png);
    console.log(
      `생성 완료: public/${file} (${size}x${size}${square ? ", 모서리 없는 불투명" : ""})`,
    );
  }

  /*
   * 브라우저 탭용 SVG 파비콘.
   * 사진에서 따낸 실루엣은 SVG에 담기 어려우므로 여기에는 물결 무늬를 씁니다.
   * 아주 작게 보이는 자리라 무늬 차이는 드러나지 않습니다.
   */
  const { dx, dy } = centering.get(0) ?? { dx: 0, dy: 0 };
  await writeFile(
    path.join(publicDir, "icon.svg"),
    iconSvg(0, { withWaves: true }).replace(
      "</svg>",
      `${textSvg(0, dx, dy).match(/<g[\s\S]*<\/g>/)[0]}</svg>`,
    ),
  );
  console.log("생성 완료: public/icon.svg");
}

main().catch((error) => {
  console.error("아이콘 생성에 실패했어요:", error);
  process.exit(1);
});
