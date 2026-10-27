/**
 * 도산 AI 프로필 "끈" 그리기 (2026-10-27 사용자 "도산 AI 대화창을 뉴웨이브앱과 똑같이, 색감은 애기애타 테마색" — 뉴웨이브 lib/ai-orb-draw.ts를 옮기고 색만 파랑 → 애기애타 주황으로. 원래 설명: (2026-10-16 사용자 "AI가 답장할 때 프로필 박스 말고 굵은 끈 모양이 움직이다가 끝나면 원이 되게" — 사진 속 모양을 최대한 똑같이).
 *
 * 사진 속 모양들(위에 작은 꼬임이 달린 마름모 · 위가 큰 마름모+아래 작은 꼬임 · 같은 크기 8자 · 기울어진 "3"/"S" · 세로로 긴 타원 · 원)은 전부
 * "한 줄의 끈이 한 번 꼬인 8자꼴"의 가족입니다 — 위·아래 고리의 크기가 서로 바뀌며(끈이 꼬임 자리를 미끄러져 지나감) 약간 기울고,
 * 끝나면 꼬임이 풀려 원이 됩니다. 그래서 같은 짜임(곡선 4마디)의 몇 가지 기준 모양 사이를 점 단위로 섞어서 그립니다.
 *   점 13개 = 시작점 + 마디마다 [조절점1, 조절점2, 끝점]. 마디 순서: 꼬임 자리(X) → 아래 끝 → X → 위 끝 → X (원은 위·오른·아래·왼).
 *   X에서 "마디4 끝 → 마디1 시작"으로 지나가는 끈이 위로 올라오는(앞) 끈 — 사진에서도 왼쪽 위→오른쪽 아래로 가는 진한 파랑 끈이 앞입니다.
 * 좌표는 사진 확대본(한 변 360)에서 잰 값을 적고 u()가 24칸 상자로 바꿉니다. 브라우저·node 어디서나 쓰는 순수 계산(그리기만 캔버스).
 */
export type Pt = [number, number];
export type Shape = Pt[];

/** 사진 확대본 좌표 → 24칸 상자 좌표(0.86배로 줄여 원과 크기를 맞춤: 사진의 마름모 높이는 링 높이의 약 1.04배) */
const u = (pts: Pt[]): Shape => pts.map(([x, y]) => [12 + ((x - 170) / 10) * 0.86, 12 + ((y - 167.5) / 10) * 0.86] as Pt);

/** ① 위에 작은 꼬임, 아래에 큰 마름모(사진 7번째와 같은 모양을 위아래로 뒤집은 것의 반대) — 꼬임 자리 y=116 */
export const KNOT_UP: Shape = u([
  [168, 116],
  [250, 140], [300, 258], [170, 258],
  [40, 258], [90, 140], [168, 116],
  [200, 106], [190, 72], [170, 68],
  [150, 66], [132, 108], [168, 116],
]);

/** ② 같은 크기 8자(사진 5번째) — 꼬임 자리가 가운데, 대각선으로 엇갈림 */
export const EIGHT: Shape = u([
  [170, 168],
  [232, 195], [250, 258], [170, 258],
  [90, 258], [108, 195], [170, 168],
  [232, 141], [250, 78], [170, 78],
  [90, 78], [108, 141], [170, 168],
]);

/** ③ 위에 큰 마름모, 아래에 작은 꼬임(사진 6·7번째) — ①을 위아래로 뒤집고 마디 순서를 "아래 끝이 먼저"가 되게 다시 적음 */
/** 위아래로 뒤집고 마디 순서를 "아래 끝이 먼저"가 되게 다시 적음(마디1·2 = 아래 고리, 마디3·4 = 위 고리) */
const flipOrder = (shape: Shape): Shape => {
  const f = shape.map(([x, y]) => [x, 24 - y] as Pt);
  return [f[0], ...f.slice(7, 10), ...f.slice(10, 13), ...f.slice(1, 4), ...f.slice(4, 7)];
};
export const KNOT_DOWN: Shape = flipOrder(KNOT_UP);

/** ④ 원 — 답이 끝난 모습(사진 첫 번째). 위·오른·아래·왼 순 */
const k = 0.5523;
const RC = 7.5;
export const CIRCLE: Shape = [
  [12, 12 - RC],
  [12 + RC * k, 12 - RC], [12 + RC, 12 - RC * k], [12 + RC, 12],
  [12 + RC, 12 + RC * k], [12 + RC * k, 12 + RC], [12, 12 + RC],
  [12 - RC * k, 12 + RC], [12 - RC, 12 + RC * k], [12 - RC, 12],
  [12 - RC, 12 - RC * k], [12 - RC * k, 12 - RC], [12, 12 - RC],
];

/** 작은 고리가 한 점으로 줄어든 원 — KNOT_UP의 큰 고리가 원이 되고 위 작은 고리가 X(원의 맨 위)에서 사라진 모양. 180° 곡선 둘로 그려 오차가 0.2px도 안 됩니다. */
const kk = (RC * 4) / 3;
export const RING_UP: Shape = [
  [12, 12 - RC],
  [12 + kk, 12 - RC], [12 + kk, 12 + RC], [12, 12 + RC],
  [12 - kk, 12 + RC], [12 - kk, 12 - RC], [12, 12 - RC],
  [12, 12 - RC], [12, 12 - RC], [12, 12 - RC],
  [12, 12 - RC], [12, 12 - RC], [12, 12 - RC],
];
export const RING_DOWN: Shape = flipOrder(RING_UP);

export function mix(a: Shape, b: Shape, t: number): Shape {
  return a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t] as Pt);
}

export function rotate(shape: Shape, radians: number, cx = 12, cy = 12): Shape {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return shape.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos] as Pt);
}

function scaleX(shape: Shape, sx: number, cx = 12): Shape {
  return shape.map(([x, y]) => [cx + (x - cx) * sx, y] as Pt);
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * 생각하는 동안의 모양(seconds 초 시점). 고리 크기가 위아래로 천천히 오가며(KNOT_UP ↔ EIGHT ↔ KNOT_DOWN) 끈이 꼬임 자리를 미끄러지고,
 * 다른 주기로 좌우로 기울어져 사진의 대각선 "3"/"S" 모양도 나옵니다. 주기가 서로 어긋나 같은 모양이 정확히 반복되지 않아 자연스럽습니다.
 */
export type ThinkingParams = { s: number; squash: number; tilt: number };

export function thinkingParams(seconds: number): ThinkingParams {
  const phase = (seconds / 1.8) * Math.PI * 2; // 한 번 오가는 데 1.8초 (2026-10-16 "조금 느린 것 같아": 3.2초 → 2.0초, 2026-10-17 "아주 조금만 더 빠르게": 2.0초 → 1.8초)
  return {
    s: Math.sin(phase), // -1(위가 작은 꼬임) … +1(위가 큰 마름모)
    // 좁아졌다 넓어지는 정도(사진의 "3"/"S" 모양) + 크게 기울어졌다 돌아옴. 주기가 서로 달라 같은 모양이 정확히 반복되지 않음
    squash: 0.8 + 0.2 * Math.cos(phase * 0.7 + 1.1), // 0.6~1.0 (너무 가늘어지지 않게)
    tilt: 0.7 * Math.sin(phase * 0.5 + 0.6) + 0.2 * Math.sin(phase * 1.5),
  };
}

function shapeFrom({ s, squash, tilt }: ThinkingParams): Shape {
  const base = s < 0 ? mix(KNOT_UP, EIGHT, 1 + s) : mix(EIGHT, KNOT_DOWN, s);
  return rotate(scaleX(base, squash), tilt);
}

/** 생각하는 동안의 모양(seconds 초 시점) */
export function thinkingShape(seconds: number): Shape {
  return shapeFrom(thinkingParams(seconds));
}

/**
 * 곡선 마디가 만나는 네 점에서 들어오는 방향과 나가는 방향을 일직선으로 맞춰 꺾임(뾰족한 끝)을 없앱니다 —
 * 두 모양을 점 단위로 섞으면 중간 장면에서 조절점이 어긋나 모서리가 생기기 때문입니다(2026-10-16 사용자 "끝 부분이 너무 뾰족해, 끈의 모서리니까 더 매끈해야지").
 * 조절점의 길이는 그대로 두고 방향만 두 방향의 평균으로 통일합니다.
 */
function smoothJoints(shape: Shape): Shape {
  const out: Shape = shape.map(([x, y]) => [x, y] as Pt);
  for (let j = 0; j < 4; j++) {
    const node = out[j * 3];
    // 들어오는 조절점 = 이전 마디의 둘째 조절점(맨 처음 점은 마지막 마디의 둘째 조절점)
    const inIdx = j === 0 ? 11 : j * 3 - 1;
    const outIdx = j * 3 + 1;
    const cin = out[inIdx], cout = out[outIdx];
    const inLen = Math.hypot(node[0] - cin[0], node[1] - cin[1]);
    const outLen = Math.hypot(cout[0] - node[0], cout[1] - node[1]);
    let dx = (node[0] - cin[0]) / (inLen || 1) + (cout[0] - node[0]) / (outLen || 1);
    let dy = (node[1] - cin[1]) / (inLen || 1) + (cout[1] - node[1]) / (outLen || 1);
    const dl = Math.hypot(dx, dy);
    if (dl < 1e-6) continue; // 정반대로 꺾인 경우는 그대로
    dx /= dl; dy /= dl;
    out[inIdx] = [node[0] - dx * inLen, node[1] - dy * inLen];
    out[outIdx] = [node[0] + dx * outLen, node[1] + dy * outLen];
    if (j === 0) out[12] = [node[0], node[1]]; // 닫힌 곡선의 끝점은 시작점과 같게
  }
  return out;
}

/** 끈 위의 점 하나 — 지나간 거리 순서대로, 앞에 올라오는 끈 표시(over) 포함 */
type Sample = { x: number; y: number; over: boolean };

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const m = 1 - t;
  const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

const PER = 28;

function sample(rawShape: Shape, crossing: boolean): Sample[] {
  const shape = smoothJoints(rawShape);
  const out: Sample[] = [];
  for (let seg = 0; seg < 4; seg++) {
    const p0 = shape[seg * 3], p1 = shape[seg * 3 + 1], p2 = shape[seg * 3 + 2], p3 = shape[seg * 3 + 3];
    for (let i = 0; i < PER; i++) {
      const t = i / PER;
      const [x, y] = bezier(p0, p1, p2, p3, t);
      // 앞에 올라오는 끈 = 마디4 뒤쪽 40% + 마디1 앞쪽 40%(꼬임 자리 X를 지나는 대각선 끈)
      const over = crossing && ((seg === 3 && t >= 0.6) || (seg === 0 && t < 0.4));
      out.push({ x, y, over });
    }
  }
  out.push({ ...out[0] });
  return out;
}

type Stop = [number, number, number];

/**
 * 끈의 색 무늬 — 사진 속 원(링)의 중심선 색을 위(0)에서 시계 방향으로 22.5°마다 16곳 뽑은 값입니다(2026-10-16 사용자가 준 사진 실측).
 * 위는 옅은 살구빛, 오른쪽은 선명한 주황(브랜드색), 아래는 붉은 기 도는 주황, 왼쪽은 연한 살구빛(뉴웨이브는 하늘색·파랑·보랏빛 파랑). 끈 길이 방향으로 이 무늬가 입혀져 있어
 * 끈이 꼬여도 무늬는 끈을 따라갑니다(꼬임 자리는 phase로 앞 끈이 파랑, 뒤 끈이 연한 하늘색이 되게 맞춤).
 */
const RING_STOPS: Stop[] = [
  [255, 228, 204], [255, 208, 168], [254, 164, 96], [253, 120, 40], [253, 87, 2], [245, 92, 30], [236, 96, 58], [232, 100, 74],
  [236, 110, 86], [244, 138, 104], [252, 178, 128], [255, 208, 160], [255, 222, 186], [255, 216, 176], [255, 206, 160], [255, 214, 176],
];

const mixC = (a: Stop, b: Stop, t: number): Stop => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c: Stop) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

function ringColor(p: number): Stop {
  const x = (((p % 1) + 1) % 1) * RING_STOPS.length;
  const i = Math.floor(x);
  return mixC(RING_STOPS[i % RING_STOPS.length], RING_STOPS[(i + 1) % RING_STOPS.length], x - i);
}

export type DrawOptions = {
  /** 꼬임이 있는 모양이면 true(앞 끈을 나중에 그림). 원이면 false */
  crossing?: boolean;
  /** 색 무늬를 끈을 따라 돌리는 정도(0=원의 무늬 그대로, 0.25=꼬인 모양: 꼬임 자리의 앞 끈이 파랑) */
  phase?: number;
  /** 색을 끈 길이 기준에서 "원 위의 각도 기준"으로 옮기는 정도(0~1) — 풀려서 원이 되는 동안 사진 속 원의 색으로 이어짐 */
  angleBlend?: number;
};

/**
 * 한 장면을 그립니다. size = 캔버스 한 변(css px) — ctx에는 이미 dpr 배율이 적용돼 있어야 합니다.
 * 끈은 색 무늬만 입힌 평평한 관으로 그립니다(입체 음영 없음).
 */
export function drawOrb(ctx: CanvasRenderingContext2D, size: number, shape: Shape, options: DrawOptions = {}): void {
  const { crossing = true, phase = 0.25, angleBlend = 0 } = options;
  const unit = size / 24;
  const T = size * 0.138;
  const pts = sample(shape, crossing);
  const n = pts.length - 1;
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const line = (x0: number, y0: number, x1: number, y1: number, color: Stop, width: number) => {
    ctx.strokeStyle = rgb(color);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  // 사진의 끈은 평평한 관에 색만 부드럽게 변합니다(밝은 줄·그림자 같은 입체 음영 없음 — 2026-10-16 사용자 "입체감이 너무 심하고 어색하다")
  const drawRange = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const a = pts[i], b = pts[i + 1];
      let color = ringColor((i + 0.5) / n + phase);
      if (angleBlend > 0) {
        const mx = (a.x + b.x) / 2 - 12, my = (a.y + b.y) / 2 - 12;
        const angleP = (Math.atan2(mx, -my) / (Math.PI * 2) + 1) % 1; // 맨 위(0)에서 시계 방향
        color = mixC(color, ringColor(angleP), angleBlend);
      }
      line(a.x * unit, a.y * unit, b.x * unit, b.y * unit, color, T);
    }
  };

  if (!crossing) {
    drawRange(0, n);
    return;
  }
  // 뒤에 있는 끈을 먼저, 앞에 올라오는 끈(over)을 나중에 — over 구간은 시작점을 가로질러 둘로 나뉨
  const flags = pts.map((q) => q.over);
  const runs = (want: boolean) => {
    const out: [number, number][] = [];
    let i = 0;
    while (i < n) {
      if (flags[i] === want) {
        let j = i;
        while (j < n && flags[j] === want) j++;
        out.push([i, j]);
        i = j;
      } else i++;
    }
    return out;
  };
  for (const [i, j] of runs(false)) drawRange(i, j);
  for (const [i, j] of runs(true)) drawRange(i, j);
}

/**
 * 답이 끝나 원으로 풀리는 장면 — seconds = 풀리기 시작한 순간의 생각 시각, progress = 0~1.
 * ① 앞 40%: 지금 모양에서 기울기·좁아짐을 풀고 고리 크기를 한쪽 끝으로 몰아 "큰 고리 + 작은 꼬임 고리"(KNOT_UP 또는 KNOT_DOWN)가 됨
 * ② 뒤 60%: 큰 고리가 동그란 원으로 펴지고 작은 꼬임 고리는 끈 위의 한 점으로 줄어 사라짐. 색 무늬도 끈 기준에서 원의 각도 기준(사진 속 원의 색)으로 옮겨 감.
 */
export function settleAt(seconds: number, progress: number): { shape: Shape; options: DrawOptions } {
  const p = thinkingParams(seconds);
  const up = p.s < 0;
  const k = Math.min(1, Math.max(0, progress));
  if (k < 0.4) {
    const e = easeInOut(k / 0.4);
    const target = up ? -1 : 1;
    return {
      shape: shapeFrom({ s: p.s + (target - p.s) * e, squash: p.squash + (1 - p.squash) * e, tilt: p.tilt * (1 - e) }),
      options: { crossing: true, phase: 0.25 },
    };
  }
  const e = easeInOut((k - 0.4) / 0.6);
  const [from, to] = up ? [KNOT_UP, RING_UP] : [KNOT_DOWN, RING_DOWN];
  return { shape: mix(from, to, e), options: { crossing: e < 0.8, phase: 0.25 * (1 - e), angleBlend: e } };
}
