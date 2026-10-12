"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 퀴즈 정답 축하 효과(2026-10-12 사용자 "오늘의 퀴즈를 맞췄을 때 뉴웨이브앱처럼 축하 애니메이션") — 뉴웨이브앱 components/BirthdayWeek.tsx의 PartyEffects를 그대로 옮긴 것(색종이 색만 이 앱 주황으로).
 * 풍선·박수·폭죽 이모지는 구글 Noto 움직이는 이모지(Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/)를 public/anim에 담아 씁니다.
 */
/** 풍선이 모두 올라가 사라지는 시각(ms) — 얼굴·박수·폭죽 이모지(5.2초)가 사라지는 때에 맞춤 */
const BALLOONS_END_MS = 5200;
const EFFECT_IMAGES = ["/anim/1f388.webp", "/anim/1f388-yellow.webp", "/anim/1f973.webp", "/anim/1f44f.webp", "/anim/1f389.webp"];

/** 그림을 미리 받아 둡니다(최대 2초까지만 기다림). 한 번 받으면 폰이 기억해 다음부터는 바로입니다. */
function preload(sources: string[]): Promise<void> {
  const loaded = Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = src;
        }),
    ),
  ).then(() => undefined);
  return Promise.race([loaded, new Promise<void>((resolve) => window.setTimeout(resolve, 2000))]);
}
/**
 * 폭죽이 터질 때 폰이 "톡톡톡" 진동합니다 (2026-10-07 사용자 요청).
 * 안드로이드(크롬·앱)만 됩니다 — 아이폰 사파리·홈 화면 앱은 웹의 vibrate를 막아 놨고, 숨은 스위치로 haptic을 내는 우회도 손가락으로 누른 그 순간에만 먹어
 * 폭죽처럼 그림을 받은 뒤 시간차로 터지는 곳에서는 안 울립니다(2026-10-07 사용자 폰에서 확인). 아이폰도 하려면 네이티브 앱(@capacitor/haptics)이 필요합니다.
 */
function buzz() {
  navigator.vibrate?.([35, 55, 35, 55, 60]);
}
// 색종이 색 — 뉴웨이브는 파랑 계열, 이 앱은 앱 주황(#ff5a00) 계열 + 노랑·분홍·민트·보라·흰색
const CONFETTI_COLORS = ["#ff5a00", "#ff8a3d", "#ffd54a", "#ff5c7a", "#2dd4a7", "#ffffff", "#c084fc"];

/**
 * 창 위에 얹는 효과 한 벌(생일주 창과 퀴즈 정답 해설이 함께 씁니다) — 폭죽(색종이·리본), 풍선(크기·색·방향·속도가 제각각), 박수·폭죽 이모지.
 * 풍선·박수·폭죽은 구글 Noto 움직이는 이모지(Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/)를 public/anim에 담아 씁니다.
 * 요소를 직접 만들어 Web Animations로 한 번씩 걸고 끝나면 지웁니다. 터치는 통과(pointer-events-none). "움직임 줄이기"를 켠 폰에서는 안 합니다.
 */
/** pace: 시간 배율 — 1이면 약 5.2초, 작을수록 빨리 끝납니다(퀴즈 정답은 0.45). */
export function PartyEffects({ pace = 1 }: { pace?: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => setHost(node), []);

  useEffect(() => {
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    let stopped = false;
    // 그림이 다 받아진 뒤에 시작합니다 — 안 그러면 이모지가 하나씩 뒤늦게 나타나 "동시에"가 깨집니다.
    const run = () => {
    if (stopped) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const add = (el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      host.appendChild(el);
      el.animate(frames, { fill: "forwards", ...options }).finished.then(() => el.remove()).catch(() => el.remove());
    };

    // 폭죽: 점 하나(x, y)에서 부채꼴로 사방에 터지는 색종이 + 긴 리본
    const burst = (x: number, y: number) => {
      buzz();
      for (let i = 0; i < 46; i += 1) {
        const ribbon = i % 5 === 0;
        const piece = document.createElement("span");
        Object.assign(piece.style, {
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: ribbon ? "4px" : `${rand(6, 10)}px`,
          height: ribbon ? `${rand(22, 38)}px` : `${rand(6, 12)}px`,
          borderRadius: ribbon ? "3px" : Math.random() > 0.6 ? "50%" : "2px",
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        });
        const angle = rand(0, Math.PI * 2);
        const power = rand(90, 260);
        const dx = Math.cos(angle) * power;
        const dy = Math.sin(angle) * power - 60;
        const spin = rand(-720, 720);
        add(
          piece,
          [
            { transform: "translate(-50%, -50%) rotate(0deg) scale(0.4)", opacity: 1 },
            { offset: 0.3, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin * 0.4}deg) scale(1)`, opacity: 1, easing: "cubic-bezier(0.2, 0.8, 0.4, 1)" },
            { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + H * 0.55}px)) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
          ],
          { duration: rand(1800, 2900) * pace, easing: "cubic-bezier(0.3, 0.6, 0.5, 1)" },
        );
      }
    };
    [
      [0, W * 0.3, H * 0.28],
      [0, W * 0.72, H * 0.22],
      // 예전에는 1.1초·2초·2.6초에 세 번 더 터졌는데 너무 여러 번이라 처음 두 번만 남겼습니다(2026-10-07 사용자 요청). 되돌리려면 [1100, W * 0.5, H * 0.34], [2000, W * 0.2, H * 0.4], [2600, W * 0.82, H * 0.38].
    ].forEach(([delay, x, y]) => timers.push(window.setTimeout(() => burst(x, y), delay * pace)));

    // 풍선: 구글 Noto 움직이는 이모지(public/anim/1f388.webp)를 씁니다. 크기·색·속도·방향·시작 시각이 모두 다르고,
    // 멀리 있는 것(작은 것)은 느리고 흐리게, 가까운 것(큰 것)은 빠르고 또렷하게 — 화면 아래 밖에서 올라와 위로 사라져, 처음부터 깔려 있지 않습니다.
    // 길을 따라 좌우로 흔들리고(제 박자·제 위상), 가는 방향 쪽으로 기울어집니다.
    // 깊이를 네 겹으로 둡니다(2026-10-03 사용자가 준 카톡 생일 그림처럼 입체감): 멀리(작고 느리고 옅음) · 중간 · 가까이(크고 또렷하고 빠름) ·
    // 코앞(화면을 반쯤 덮을 만큼 크고 흐릿해 초점 밖처럼, 화면 가장자리로 스침). 큰 것일수록 그림자가 깊고 3D로 살짝 돌아갑니다.
    // 색은 카톡 그림의 빨강·분홍 계열을 중심으로 파랑·노랑·민트를 섞습니다(아무 색이나 돌리면 탁해져서 고른 값만).
    const HUES: (number | "yellow")[] = [0, 0, 345, 345, 15, 200, "yellow", 160, 285]; // "yellow"는 색을 돌려 만들면 탁한 갈색이 되어 노랗게 다시 칠한 그림(1f388-yellow.webp)을 씁니다
    const layers = [
      { count: 2, size: [44, 84], blur: 0.5, opacity: [0.6, 0.8], speed: [3900, 4500], shadow: 0.08 }, // 멀리
      { count: 3, size: [96, 150], blur: 0, opacity: [0.9, 1], speed: [3400, 4100], shadow: 0.14 }, // 중간
      { count: 2, size: [170, 230], blur: 0.8, opacity: [0.95, 1], speed: [2900, 3600], shadow: 0.2 }, // 가까이
      { count: 2, size: [270, 340], blur: 3.2, opacity: [0.9, 0.96], speed: [2500, 3150], shadow: 0.24 }, // 코앞
    ];
    // 가로 위치: 풍선 수만큼 칸을 나눠 칸마다 하나씩(순서는 섞음) — 한쪽으로 몰리지 않게. 칸 안에서도 제멋대로 흩어집니다.
    const total = layers.reduce((sum, layer) => sum + layer.count, 0);
    const slots = Array.from({ length: total }, (_, k) => k).sort(() => Math.random() - 0.5);
    let slotIndex = 0;
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i += 1) {
        const size = rand(layer.size[0], layer.size[1]);
        const hue = HUES[Math.floor(rand(0, HUES.length))];
        // 풍선의 가운데 가로 위치(화면 폭 대비): 코앞 풍선은 왼쪽·오른쪽 가장자리를 번갈아 스치고, 나머지는 칸에서 뽑습니다.
        const slot = slots[slotIndex++];
        const center = layer.blur > 3 ? (i % 2 === 0 ? rand(-0.02, 0.1) : rand(0.9, 1.02)) : (slot + rand(0.1, 0.9)) / total;
        const startX = center * W - size / 2;
        // 가는 방향도 가운데 쪽/바깥 쪽 반반 — 왼쪽 풍선이 늘 왼쪽으로, 오른쪽 풍선이 늘 오른쪽으로만 가지 않게
        const driftDir = (slot + i) % 2 === 0 ? 1 : -1;
        const drift = driftDir * rand(30, 190) * (0.6 + size / 300);
        const sway = rand(8, 26) * (0.6 + size / 400);
        const swayTurns = rand(1.1, 3);
        const phase = rand(0, Math.PI * 2);
        const rise = H + size * 2.2;
        const duration = rand(layer.speed[0], layer.speed[1]) * pace;
        const spinAxis = rand(-25, 25); // 3D로 살짝 돌아가는 정도
        const steps = 26;
        const frames: Keyframe[] = [];
        for (let k = 0; k <= steps; k += 1) {
          const t = k / steps;
          const angle = phase + t * swayTurns * Math.PI * 2;
          const x = drift * t + sway * Math.sin(angle);
          const y = -rise * (t + 0.04 * Math.sin(phase + t * 5)); // 속도가 살짝 들쑥날쑥
          const slope = drift / rise + (sway * swayTurns * Math.PI * 2 * Math.cos(angle)) / rise;
          const tilt = Math.max(-16, Math.min(16, Math.atan(slope * 6) * (180 / Math.PI)));
          frames.push({
            offset: t,
            transform: `translate3d(${x}px, ${y}px, 0) perspective(700px) rotateZ(${tilt}deg) rotateY(${spinAxis * Math.sin(angle * 0.7)}deg) rotateX(${spinAxis * 0.4 * Math.cos(angle * 0.5)}deg)`,
            opacity: t > 0.92 ? (1 - t) * 12 : 1,
          });
        }
        const img = document.createElement("img");
        img.src = hue === "yellow" ? "/anim/1f388-yellow.webp" : "/anim/1f388.webp";
        img.alt = "";
        Object.assign(img.style, {
          position: "absolute",
          left: `${startX}px`,
          bottom: `${-size * 1.5}px`,
          width: `${size}px`,
          height: `${size}px`,
          filter: `${hue === "yellow" ? "saturate(1.2) brightness(1.04)" : `hue-rotate(${hue}deg) saturate(1.1)`} drop-shadow(0 ${size * 0.05}px ${size * 0.06}px rgba(0, 0, 0, ${layer.shadow}))${layer.blur ? ` blur(${layer.blur}px)` : ""}`,
          // 노랑은 겹쳐 보이면 어두운 배경과 섞여 칙칙해지므로 늘 완전 불투명(2026-10-03 사용자 요청)
          opacity: hue === "yellow" ? "1" : String(rand(layer.opacity[0], layer.opacity[1])),
          willChange: "transform",
        });
        // 시작 시각은 "끝나는 때(delay + duration)가 BALLOONS_END_MS를 넘지 않게" 뽑습니다 — 박수·얼굴이 사라지는 때에 풍선도 다 올라가 있게.
        timers.push(window.setTimeout(() => add(img, frames, { duration, easing: "linear" }), rand(0, BALLOONS_END_MS * pace - duration)));
      }
    }

    // 박수·폭죽 이모지(구글 Noto 움직이는 이모지): 톡 튀어나와(스프링) 자기 움직임으로 놀다가 사라집니다.
    const pop = (src: string, size: number, left: number, top: number, delay: number, life: number, tilt: number, flip = false) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      Object.assign(img.style, {
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        transform: "translate(-50%, -50%) scale(0)",
        opacity: "0",
        filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.08}px rgba(0, 0, 0, 0.22))`,
        // scale 속성은 transform과 따로 곱해져서 애니메이션을 건드리지 않고 좌우만 뒤집습니다.
        scale: flip ? "-1 1" : "1 1",
      });
      timers.push(
        window.setTimeout(
          () =>
            add(
              img,
              [
                { offset: 0, transform: `translate(-50%, -50%) scale(0) rotate(${-tilt * 2}deg)`, opacity: 0 },
                { offset: 0.08, transform: `translate(-50%, -50%) scale(1.18) rotate(${tilt}deg)`, opacity: 1, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
                { offset: 0.14, transform: `translate(-50%, -50%) scale(1) rotate(${tilt * 0.4}deg)`, opacity: 1 },
                { offset: 0.8, transform: `translate(-50%, calc(-50% - 10px)) scale(1) rotate(${tilt * 0.4}deg)`, opacity: 1 },
                { offset: 1, transform: `translate(-50%, calc(-50% - 36px)) scale(0.85) rotate(${tilt * 0.4}deg)`, opacity: 0 },
              ],
              { duration: life * pace, easing: "ease-in-out" },
            ),
          delay * pace,
        ),
      );
    };
    pop("/anim/1f973.webp", 176, 25, 26, 0, 5200, -10); // 파티 모자 쓴 얼굴(왼쪽 위, 크게)
    pop("/anim/1f389.webp", 150, 78, 20, 0, 5200, 9, true); // 폭죽(오른쪽 위) — 좌우반전해 왼쪽(가운데 쪽)으로 쏩니다
    pop("/anim/1f44f.webp", 160, 77, 45, 0, 5200, 6); // 박수(오른쪽 가운데, 조금 작게·오른쪽·아래로)

    };
    void preload(EFFECT_IMAGES).then(run);
    return () => {
      stopped = true;
      timers.forEach(window.clearTimeout);
    };
  }, [host, pace]);

  if (typeof document === "undefined") return null;
  return createPortal(<div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" />, document.body);
}
