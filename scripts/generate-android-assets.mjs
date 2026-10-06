/**
 * 안드로이드 앱 아이콘·시작 화면·스토어 그림 만들기 — `npm run icons:android` (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱 scripts/generate-android-assets.mjs를 옮김).
 *
 * 웹 홈 화면 아이콘(scripts/generate-icons.mjs)과 같은 디자인: 주황 그라데이션 바탕 + 흰 愛己愛他 네 글자.
 * 그 글자는 폰트(Batang)가 있어야 그려지므로 이 스크립트가 직접 그리지 않고, 이미 만들어 둔 public/icon-maskable-512.png에서
 * "거의 흰색인 픽셀"만 뽑아 글자 층(투명 바탕)으로 씁니다(바탕의 기러기 무늬는 옅은 주황이라 걸러집니다).
 * 로고(글자)를 바꾸면 `npm run icons` → 이 스크립트 순서로 다시 돌리세요.
 *
 * - 적응형 아이콘: 바탕은 values/ic_launcher_background.xml 색(#FD5702), 앞면(foreground)은 투명 바탕 + 글자.
 *   안드로이드가 가운데 66/108만 보장하므로 글자 덩어리를 한 변의 42% 안에 둡니다.
 * - 옛 기기용 ic_launcher(그라데이션 정사각형) / ic_launcher_round(동그라미)
 * - 시작 화면 drawable 폴더들의 splash.png: 주황 바탕 + 글자 가운데
 * - 구글 플레이 올릴 그림(store-assets/): 아이콘 512, 대표 그림 1024×500
 * 안드로이드 프로젝트(android/)가 먼저 있어야 합니다(`npx cap add android`).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const res = path.join(process.cwd(), "android", "app", "src", "main", "res");
const source = path.join(process.cwd(), "public", "icon-maskable-512.png");
const BRAND = "#FD5702";

if (!fs.existsSync(res)) {
  console.error("android/ 폴더가 없어요. 먼저 `npx cap add android`를 실행하세요.");
  process.exit(1);
}

/** 글자 층: 거의 흰색(가장 어두운 채널이 밝을수록 불투명)인 픽셀만 남기고, 글자가 차지하는 사각형으로 자릅니다. */
async function extractText() {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const lowest = Math.min(data[i], data[i + 1], data[i + 2]);
      const alpha = Math.max(0, Math.min(255, Math.round(((lowest - 200) / 55) * 255)));
      const o = (y * width + x) * 4;
      out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = alpha;
      if (alpha > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("public/icon-maskable-512.png에서 글자를 찾지 못했어요. `npm run icons`를 먼저 돌려 보세요.");
  return sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}
const text = await extractText();

/** 글자 덩어리의 긴 변을 longSide로 맞춘 PNG */
async function textPng(longSide) {
  return sharp(text).resize({ width: Math.round(longSide), height: Math.round(longSide), fit: "inside", kernel: "lanczos3" }).png().toBuffer();
}

/** 웹 아이콘과 같은 주황 그라데이션(모서리를 깎지 않은 정사각/직사각 바탕) */
function gradientSvg(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FF9753"/><stop offset="45%" stop-color="${BRAND}"/><stop offset="100%" stop-color="#D94700"/>
  </linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/></svg>`);
}

/** background: "gradient" | "flat" | "transparent" */
async function compose(width, height, textLongSide, background) {
  const png = await textPng(textLongSide);
  const meta = await sharp(png).metadata();
  const left = Math.round((width - meta.width) / 2);
  const top = Math.round((height - meta.height) / 2);
  const base =
    background === "gradient"
      ? sharp(gradientSvg(width, height))
      : sharp({ create: { width, height, channels: 4, background: background === "flat" ? BRAND : { r: 0, g: 0, b: 0, alpha: 0 } } });
  return sharp(await base.png().toBuffer()).composite([{ input: png, left, top }]).png();
}

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, scale] of Object.entries(densities)) {
  const dir = path.join(res, `mipmap-${name}`);
  const legacy = Math.round(48 * scale);
  const adaptive = Math.round(108 * scale);
  await (await compose(legacy, legacy, legacy * 0.62, "gradient")).toFile(path.join(dir, "ic_launcher.png"));
  const mask = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`);
  // composite는 두 번 부르면 앞의 것이 덮어써지므로, 글자를 올린 그림을 먼저 완성한 뒤 동그라미를 오려 냅니다.
  const roundBase = await (await compose(legacy, legacy, legacy * 0.52, "gradient")).toBuffer();
  await sharp(roundBase).composite([{ input: mask, blend: "dest-in" }]).png().toFile(path.join(dir, "ic_launcher_round.png"));
  await (await compose(adaptive, adaptive, adaptive * 0.42, "transparent")).toFile(path.join(dir, "ic_launcher_foreground.png"));
}
fs.writeFileSync(
  path.join(res, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND}</color>\n</resources>\n`,
);

// 시작 화면: 기존 파일의 크기를 그대로 두고 그림만 바꿉니다.
for (const dir of fs.readdirSync(res).filter((d) => d.startsWith("drawable"))) {
  const file = path.join(res, dir, "splash.png");
  if (!fs.existsSync(file)) continue;
  const { width, height } = await sharp(file).metadata();
  const buffer = await (await compose(width, height, Math.min(width, height) * 0.28, "flat")).toBuffer();
  fs.writeFileSync(file, buffer);
}

// 구글 플레이 올릴 그림 (플레이가 모서리를 알아서 깎으므로 모서리 없는 정사각형)
const store = path.join(process.cwd(), "store-assets");
fs.mkdirSync(store, { recursive: true });
await (await compose(512, 512, 512 * 0.62, "gradient")).toFile(path.join(store, "play-icon-512.png"));
await (await compose(1024, 500, 500 * 0.6, "gradient")).toFile(path.join(store, "play-feature-1024x500.png"));
console.log("만듦: android res 아이콘·시작 화면, store-assets/");
