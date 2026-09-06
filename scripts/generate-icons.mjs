/**
 * PWA 홈 화면 아이콘(PNG)을 만드는 스크립트입니다.
 *
 *   npm run icons
 *
 * 구성은 두 겹뿐입니다.
 *   1) 주황 유리판 바탕 (아래 BRAND 설명 참고)
 *   2) 愛己愛他 네 글자 (서예 로고와 같은 2x2 배치)
 *
 * 예전에는 바탕에 기러기 실루엣(brand/goose.png에서 밝기 차이로 따낸 것)이나
 * 포스터의 물결 무늬를 옅은 흰색으로 깔았습니다. 지금은 둘 다 쓰지 않습니다 —
 * 아이콘은 홈 화면에서 48px 남짓으로 보이는데, 그 크기에서 옅은 무늬는
 * 형태로 읽히지 않고 글자만 흐리게 만들었습니다.
 * (실루엣을 따내던 코드는 git 이력에 남아 있습니다.)
 *
 * brand/goose.png 자체는 지우지 않았습니다. 로딩 화면 로고로 계속 씁니다
 * (components/StageGate.tsx).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(process.cwd(), "public");

/** 아이콘을 그리는 기준 크기 */
const S = 1024;

/**
 * 아이콘 바탕의 주황.
 *
 * 앱 안에서 쓰는 brand-500(#FF7210)보다 한 단계 진합니다. 일부러 다릅니다 —
 * 홈 화면에서는 아이콘이 다른 앱들 사이에 40~60px로 작게 서므로, 화면 안에서
 * 넓게 깔릴 때 알맞은 밝은 주황이 거기서는 붕 떠 보입니다.
 * (lib/constants.ts의 BRAND_COLOR는 브라우저 주소창 색이라 그대로 둡니다.)
 *
 * ★ 예전에는 단색이었습니다. 작게 줄면 색이 섞여 탁해 보인다는 이유였는데,
 *   섞여서 탁해지는 것은 색끼리 멀 때의 이야기입니다. 아래 두 색은 같은 주황을
 *   위아래로 조금 벌려 둔 것뿐이라, 작게 줄면 평균색(BRAND)으로 수렴합니다.
 *   벌리는 폭을 더 키우면 그때부터는 정말 탁해집니다.
 */
const BRAND = "#EA6209";
/** 빛을 받는 위쪽 */
const BRAND_LIT = "#F96E10";
/** 그늘이 지는 아래쪽 */
const BRAND_DEEP = "#DB5602";

/**
 * 주황 유리판 한 겹.
 *
 * 유리로 보이게 하는 것은 세 가지입니다. 하단 탭바의 회색 알약과 같은 방식인데,
 * 거기는 진짜로 뒤가 비치고 여기는 비칠 뒤가 없으니 빛만 흉내 냅니다.
 *   1) 위가 밝고 아래로 갈수록 진해지는 바탕 — 두께가 있는 판으로 보입니다.
 *   2) 왼쪽 위에서 떨어지는 둥근 빛무리.
 *   3) 둘레에 걸린 흰 실선. 위가 밝고 아래로 갈수록 옅어집니다.
 *      유리 느낌은 사실 이 선에서 가장 많이 나옵니다.
 *
 * 셋 다 아주 옅게만 넣었습니다. 48px까지 줄어들어도 무늬로 읽히지 않고
 * 재질로만 남아야 하고, 세게 주면 흰 글자의 대비가 먼저 무너집니다.
 *
 * @param {number} inset 가장자리 여백 비율
 * @param {object} options
 * @param {boolean} [options.square] 모서리를 깎지 않고 꽉 채울지.
 *   iOS 홈 화면 아이콘은 iOS가 직접 둥근 모양을 씌우기 때문에,
 *   우리가 미리 깎아서 모서리를 투명하게 두면 그 부분이 검게 채워집니다.
 *   그래서 애플용 아이콘만 모서리 없이 불투명한 정사각형으로 만듭니다.
 *   이때는 둘레의 실선도 넣지 않습니다 — 시스템이 모서리를 깎으면서 선의
 *   네 귀퉁이만 잘려나가, 유리 테가 아니라 잘린 사각 테로 보입니다.
 */
function iconSvg(inset, { square = false } = {}) {
  /*
   * 모서리를 깎지 않는 아이콘은 바탕을 화면 끝까지 채웁니다.
   * 여백(inset)은 글자를 안전 영역 안으로 들이려고 두는 것이지 바탕을 줄이려는
   * 것이 아닙니다. 예전에는 바탕이 단색이라 남는 자리를 flatten이 같은 색으로
   * 메워 티가 안 났는데, 유리판은 자리마다 색이 달라서 그대로 두면 네모난
   * 이음매가 드러납니다.
   */
  const pad = square ? 0 : S * inset;
  const inner = S - pad * 2;
  const r = square ? 0 : inner * 0.22;
  /** 둘레 실선의 굵기. 선의 한가운데가 판의 가장자리에 오도록 반만큼 들여 긋습니다. */
  const rim = inner * 0.014;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BRAND_LIT}"/>
      <stop offset="1" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.3" cy="0.16" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.38"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="url(#face)"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="url(#sheen)"/>${
    square
      ? ""
      : `
  <rect x="${pad + rim / 2}" y="${pad + rim / 2}" width="${inner - rim}" height="${inner - rim}" rx="${r - rim / 2}" fill="none" stroke="url(#rim)" stroke-width="${rim}"/>`
  }
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
  return { dx, dy };
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

    /*
     * sharp는 한 파이프라인 안에서 resize를 composite보다 먼저 적용합니다.
     * 그래서 1024 크기로 다 합쳐서 한 장을 만든 뒤, 따로 줄여야 합니다.
     */
    const full = await sharp(Buffer.from(iconSvg(inset, { square })))
      .composite([{ input: Buffer.from(textSvg(inset, dx, dy)) }])
      .png()
      .toBuffer();

    let pipeline = sharp(full).resize(size, size);

    if (square) {
      /*
       * 투명한 곳이 조금이라도 남으면 iOS가 그 부분을 검게 칠합니다.
       * 브랜드 주황으로 배경을 깔고 알파 채널을 아예 없애 완전히 불투명하게 만듭니다.
       */
      pipeline = pipeline.flatten({ background: BRAND }).removeAlpha();
    }

    await writeFile(path.join(publicDir, file), await pipeline.png().toBuffer());
    console.log(
      `생성 완료: public/${file} (${size}x${size}${square ? ", 모서리 없는 불투명" : ""})`,
    );
  }

  // 브라우저 탭용 SVG 파비콘. PNG와 똑같은 두 겹입니다.
  const { dx, dy } = centering.get(0) ?? { dx: 0, dy: 0 };
  await writeFile(
    path.join(publicDir, "icon.svg"),
    iconSvg(0).replace(
      "</svg>",
      `${textSvg(0, dx, dy).match(/<g[\s\S]*<\/g>/)[0]}\n</svg>`,
    ),
  );
  console.log("생성 완료: public/icon.svg");
}

main().catch((error) => {
  console.error("아이콘 생성에 실패했어요:", error);
  process.exit(1);
});
