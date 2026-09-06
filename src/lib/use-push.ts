"use client";

import { useSyncExternalStore } from "react";
import { isPushConfigured, isPushOn, isPushSupported } from "@/lib/push";

/**
 * 이 기기의 알림 상태를 읽는 훅.
 *
 * 보기 설정(use-display-settings.ts)과 같은 방식입니다. 알림 상태는 리액트
 * 바깥(브라우저 권한 + localStorage)에 있으므로, 효과 안에서 setState로
 * 끌어오는 대신 useSyncExternalStore로 그 바깥을 그대로 구독합니다.
 * 서버에는 브라우저가 없으니 "꺼짐"으로 그리고, 브라우저에서 곧 맞춰집니다.
 */

export interface PushState {
  /** 지금 이 기기에서 알림이 켜져 있는지 */
  on: boolean;
  /** 아예 켤 수 없는 상태라면 그 이유. 켤 수 있으면 null */
  blocked: string | null;
}

/*
 * 읽을 때마다 새 객체를 만들면 리액트가 "값이 바뀌었다"고 오해해 끝없이
 * 다시 그립니다. 그래서 한 번 만들어 여기 담아두고, refreshPushState()가
 * 부를 때만 갈아끼웁니다.
 */
let current: PushState | null = null;
const listeners = new Set<() => void>();

const SERVER_STATE: PushState = { on: false, blocked: null };

function read(): PushState {
  if (!isPushSupported()) {
    return {
      on: false,
      blocked:
        "이 브라우저에서는 알림을 받을 수 없어요. 아이폰은 홈 화면에 추가한 뒤 그 아이콘으로 열어야 합니다.",
    };
  }
  if (!isPushConfigured()) {
    return { on: false, blocked: "알림이 아직 준비되지 않았어요. 운영진에게 알려주세요." };
  }
  return { on: isPushOn(), blocked: null };
}

function snapshot(): PushState {
  if (!current) current = read();
  return current;
}

function serverSnapshot(): PushState {
  return SERVER_STATE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 알림을 켜거나 끈 뒤에 불러 화면을 다시 맞춥니다. */
export function refreshPushState(): void {
  current = read();
  for (const listener of listeners) listener();
}

export function usePushState(): PushState {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
