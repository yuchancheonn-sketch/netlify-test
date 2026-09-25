"use client";

import { useSyncExternalStore } from "react";

/**
 * 앱을 연 뒤 로딩 화면(SplashScreen)을 최소한 보여 줄 시간 (2026-09-26 사용자 "로딩중 화면이 무조건 1.5초 정도 보이도록").
 * 로그인 확인이 금방 끝나도 이 시간이 지나기 전에는 로딩 화면을 걷지 않습니다(components/StageGate.tsx).
 *
 * 기준은 "페이지를 연 순간"(performance.now()가 0인 때)입니다 — 앱을 처음 열거나 새로고침할 때만 걸리고,
 * 앱 안에서 탭을 옮겨 다닐 때는 이미 지났으므로 다시 기다리지 않습니다.
 */
export const SPLASH_MIN_MS = 1500;

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
