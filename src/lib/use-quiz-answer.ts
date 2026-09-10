"use client";

import { useSyncExternalStore } from "react";
import type { OxAnswer } from "@/lib/dosan-quiz";

/**
 * 오늘의 OX 퀴즈에 내가 고른 답 — 이 폰에만 적어 둡니다.
 *
 * 누가 맞혔는지 모을 일이 없어 Firestore에 올리지 않습니다. 대신 기기마다
 * 따로라, 다른 폰으로 들어오면 오늘 문제를 다시 풀 수 있습니다.
 *
 * effect 안에서 setState를 하면 린트가 빌드를 막으므로, 보기 설정
 * (use-display-settings.ts)과 같이 useSyncExternalStore로 읽어 옵니다.
 */

const KEY_PREFIX = "agikaeta:quiz:";

/** 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 켜 둔 동안은 답한 걸로 보이게 들고 있습니다. */
const memory = new Map<string, OxAnswer>();
const listeners = new Set<() => void>();

function read(key: string): OxAnswer | null {
  const kept = memory.get(key);
  if (kept) return kept;
  try {
    const value = localStorage.getItem(KEY_PREFIX + key);
    return value === "O" || value === "X" ? value : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // 같은 폰의 다른 창에서 답해도 따라오게 합니다.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(key: string, answer: OxAnswer) {
  memory.set(key, answer);
  try {
    // 지난 문제의 답은 더 쓸 일이 없어 지웁니다. 늘 한 줄만 남습니다.
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const stored = localStorage.key(index);
      if (stored?.startsWith(KEY_PREFIX) && stored !== KEY_PREFIX + key) {
        localStorage.removeItem(stored);
      }
    }
    localStorage.setItem(KEY_PREFIX + key, answer);
  } catch {
    // 저장만 못 할 뿐, 켜 둔 동안에는 memory에서 읽습니다.
  }
  for (const listener of listeners) listener();
}

/**
 * key는 "날짜:문제 id"처럼 오늘 문제를 가리키는 값입니다.
 * 날짜가 바뀌거나 문제 목록이 바뀌면 key가 달라져 새로 풀게 됩니다.
 */
export function useQuizAnswer(key: string) {
  const answer = useSyncExternalStore(
    subscribe,
    () => read(key),
    // 서버에는 브라우저 저장소가 없으니 아직 안 푼 것으로 그립니다.
    () => null,
  );
  return [answer, (value: OxAnswer) => write(key, value)] as const;
}
