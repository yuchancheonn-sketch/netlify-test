/**
 * 도산아카데미 로고(public/brand/goose.png)에서 "DOSAN ACADEMY · SINCE 1989" 글자를 빼고
 * 기러기만 남긴 그림을 만듭니다 → public/brand/goose-mark.png (2026-09-26 사용자 "로고에서 글자를 빼고 기러기만").
 *
 *   node scripts/make-goose-mark.mjs
 *
 * 방법은 아이콘 스크립트(generate-icons.mjs)와 같습니다 — 서로 붙어 있는 픽셀 덩어리 가운데
 * 가장 큰 것(기러기)만 남기고, 작은 조각(글자)은 지웁니다. 남긴 부분은 원본의 투명도 그대로이고,
 * 기러기 둘레에 딱 맞게 잘라(여백 2px) 저장합니다. 색은 쓰는 쪽에서 mask-image로 칠합니다.
 */
import path from "node:path";
import sharp from "sharp";

const brandDir = path.join(process.cwd(), "public", "brand");
const source = path.join(brandDir, "goose.png");
const target = path.join(brandDir, "goose-mark.png");

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const total = width * height;

// 거의 투명한 가장자리 번짐은 그림으로 보지 않습니다.
const mask = new Uint8Array(total);
for (let i = 0; i < total; i += 1) mask[i] = data[i * 4 + 3] > 40 ? 1 : 0;

// 연결 요소 — 가장 큰 덩어리 하나만 남깁니다(기러기 몸통·날개는 한 덩어리입니다).
const label = new Int32Array(total).fill(-1);
const sizes = [];
const queue = new Int32Array(total);
for (let start = 0; start < total; start += 1) {
  if (mask[start] !== 1 || label[start] !== -1) continue;
  const id = sizes.length;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  label[start] = id;
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
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
  sizes.push(tail);
}
const biggest = sizes.indexOf(Math.max(...sizes));

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
const out = Buffer.alloc(total * 4);
for (let i = 0; i < total; i += 1) {
  // 덩어리 둘레의 반투명 번짐(mask 0)도 기러기 바로 옆이면 살리려고, 가장 큰 덩어리의 픽셀과 그 이웃을 남깁니다.
  const x = i % width;
  const y = (i - x) / width;
  let keep = label[i] === biggest;
  if (!keep && data[i * 4 + 3] > 0) {
    for (let dy = -1; dy <= 1 && !keep; dy += 1) {
      for (let dx = -1; dx <= 1 && !keep; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (label[ny * width + nx] === biggest) keep = true;
      }
    }
  }
  if (!keep) continue;
  out[i * 4] = data[i * 4];
  out[i * 4 + 1] = data[i * 4 + 1];
  out[i * 4 + 2] = data[i * 4 + 2];
  out[i * 4 + 3] = data[i * 4 + 3];
  if (x < minX) minX = x;
  if (y < minY) minY = y;
  if (x > maxX) maxX = x;
  if (y > maxY) maxY = y;
}

const pad = 2;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const cropWidth = Math.min(width, maxX + pad + 1) - left;
const cropHeight = Math.min(height, maxY + pad + 1) - top;

await sharp(out, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropWidth, height: cropHeight })
  .png({ compressionLevel: 9 })
  .toFile(target);

console.log(`조각 ${sizes.length}개 중 가장 큰 기러기만 남김 → goose-mark.png ${cropWidth}×${cropHeight}`);
