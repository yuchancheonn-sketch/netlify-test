"use client";

import { useSyncExternalStore } from "react";

/**
 * 앱을 연 뒤 로딩 화면(SplashScreen)을 최소한 보여 줄 시간 — 1초 (2026-09-26 사용자 "무조건 1.5초 정도" → 같은 날 "1초로 줄여줘").
 * 로그인 확인이 금방 끝나도 이 시간이 지나기 전에는 로딩 화면을 걷지 않습니다(components/StageGate.tsx).
 *
 * 기준은 "페이지를 연 순간"(performance.now()가 0인 때)입니다 — 앱을 처음 열거나 새로고침할 때만 걸리고,
 * 앱 안에서 탭을 옮겨 다닐 때는 이미 지났으므로 다시 기다리지 않습니다.
 */
export const SPLASH_MIN_MS = 1000;

let done = false;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function startTimer() {
  if (done || timer || typeof window === "undefined") return;
  const remaining = SPLASH_MIN_MS - performance.now();
  if (remaining <= 0) {
    done = true;
    return;
  }
  timer = setTimeout(() => {
    done = true;
    listeners.forEach((listener) => listener());
  }, remaining);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startTimer();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  startTimer();
  return done;
}

/** 로딩 화면을 걷어도 되는 때(최소 시간이 지났는지). 서버 그림에서는 늘 false — 로딩 화면부터 그립니다. */
export function useSplashHoldDone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/*
 * 지금 "아직 준비 중"이라 제 로딩 화면을 그리고 있는 StageGate 수 (2026-09-26).
 * 맨 위 로딩 화면(SplashOverlay)은 이 수가 0이 될 때까지 걷지 않습니다 — 첫 화면(/)에서 홈으로 넘어가는
 * 사이에 걷히면 그 아래 화면 전환이 그대로 보여서입니다.
 */
let gateSplashCount = 0;
const gateListeners = new Set<() => void>();

export function holdGateSplash(): () => void {
  gateSplashCount += 1;
  gateListeners.forEach((listener) => listener());
  return () => {
    gateSplashCount -= 1;
    gateListeners.forEach((listener) => listener());
  };
}

/** 제 로딩 화면을 그리고 있는 StageGate가 하나라도 있는지. */
export function useGateSplashShowing(): boolean {
  return useSyncExternalStore(
    (listener) => {
      gateListeners.add(listener);
      return () => gateListeners.delete(listener);
    },
    () => gateSplashCount > 0,
    () => true,
  );
}
