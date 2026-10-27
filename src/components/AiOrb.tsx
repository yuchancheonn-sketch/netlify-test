"use client";

import { useEffect, useRef } from "react";
import { CIRCLE, drawOrb, settleAt, thinkingShape } from "@/lib/ai-orb-draw";

/**
 * 도산 AI 프로필(2026-10-27 뉴웨이브 AiOrb를 옮김, 색은 주황) — 사진 대신 굵은 끈 모양(2026-10-16 사용자가 준 슈퍼쏠 "은행 AI" 그림처럼).
 * - thinking: AI가 답을 만드는 동안(입력 중 말풍선 옆). 한 줄의 끈이 꼬이고 고리 크기가 바뀌며 계속 움직임.
 * - 아니면: 원(끝난 모습). AI 말풍선 옆 프로필로 쓰이고, 방금 온 메시지(createdAtMs가 12초 안)면 끈이 꼬임을 풀며 원이 되는 장면을 한 번 보여 줌.
 *   입력 중 오브가 사라지고 말풍선 오브가 새로 생기는 사이가 끊기지 않게, 입력 중 오브가 마지막으로 그린 시각을 모듈에 기억해 거기서 이어서 풀립니다.
 * 캔버스로 그림(모양 계산은 lib/ai-orb-draw.ts). 움직임 줄이기 설정이면 늘 가만히 있는 원.
 */
let lastThinking: { seconds: number; at: number } | null = null;

const SETTLE_MS = 1200;
const FRESH_MS = 12000;

export default function AiOrb({ size = 32, thinking = false, createdAtMs, className = "" }: { size?: number; thinking?: boolean; createdAtMs?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wasThinking = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const still = () => drawOrb(ctx, size, CIRCLE, { crossing: false, phase: 0, angleBlend: 1 });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    if (thinking) {
      wasThinking.current = true;
      if (reduceMotion) {
        still();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const seconds = (now - start) / 1000;
        lastThinking = { seconds, at: now };
        drawOrb(ctx, size, thinkingShape(seconds));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const fresh = createdAtMs !== undefined && Date.now() - createdAtMs < FRESH_MS;
    const justStopped = wasThinking.current;
    wasThinking.current = false;
    if (reduceMotion || !(fresh || justStopped)) {
      still();
      return;
    }
    // 입력 중 오브가 방금까지 그리던 시각에서 이어서(없거나 오래됐으면 기본 시각에서) 원으로 풀림
    const now0 = performance.now();
    const base = lastThinking && now0 - lastThinking.at < 3000 ? lastThinking.seconds + (now0 - lastThinking.at) / 1000 : 1.0;
    const start = now0;
    const tick = (now: number) => {
      const k = (now - start) / SETTLE_MS;
      if (k >= 1) {
        still();
        return;
      }
      const { shape, options } = settleAt(base, k);
      drawOrb(ctx, size, shape, options);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, thinking, createdAtMs]);

  return <canvas ref={ref} role="img" aria-label="도산 AI" className={`shrink-0 ${className}`} style={{ width: size, height: size }} />;
}
