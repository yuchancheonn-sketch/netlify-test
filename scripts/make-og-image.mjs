/**
 * 링크 미리보기 그림(오픈그래프)을 만듭니다 → src/app/opengraph-image.png (2026-09-26 사용자 "링크 미리보기가
 * 로딩 화면처럼 보이게"). 카카오톡·문자 등에 앱 주소를 붙였을 때 뜨는 카드의 그림입니다.
 *
 *   node scripts/make-og-image.mjs
 *
 * 모양은 로딩 화면(components/StageGate.tsx의 SplashScreen)과 같습니다 — 앱 주황 바탕 한가운데 흰 도산아카데미 로고.
 * 크기는 미리보기 표준인 1200×630. 로고는 public/brand/goose.png의 모양(투명도)만 쓰고 색은 흰색으로 칠합니다.
 * 파일 이름이 opengraph-image.png라 Next.js가 알아서 모든 화면의 미리보기 그림으로 씁니다
 * (주간 소식지 /letter/…처럼 따로 정한 화면은 그쪽 그림).
 */
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
/** 로고 한 변 — 세로 630px의 약 절반. 로딩 화면보다 카드가 작게 보이니 조금 크게 둡니다. */
const LOGO = 330;
/** 앱 주황 — lib/constants.ts의 BRAND_COLOR, globals.css의 --color-brand-500과 같은 값 */
const ORANGE = "#FD5702";

const source = path.join(process.cwd(), "public", "brand", "goose.png");
const target = path.join(process.cwd(), "src", "app", "opengraph-image.png");

// 로고를 흰색으로 — 모양(투명도)은 그대로, 색만 흰색.
const { data, info } = await sharp(source)
  .resize(LOGO, LOGO, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  data[i] = 255;
  data[i + 1] = 255;
  data[i + 2] = 255;
}
const whiteLogo = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toBuffer();

await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: ORANGE } })
  .composite([
    {
      input: whiteLogo,
      left: Math.round((WIDTH - info.width) / 2),
      top: Math.round((HEIGHT - info.height) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(target);

console.log(`링크 미리보기 그림 → src/app/opengraph-image.png (${WIDTH}×${HEIGHT})`);
