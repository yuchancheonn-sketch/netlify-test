"use client";

import { useSyncExternalStore } from "react";

/**
 * 무기명 투표에서 내가 고른 자리 — 이 폰에만, 계정별로 적어 둡니다.
 *
 * 서버에는 누가 무엇을 골랐는지 남기지 않으므로(lib/polls.ts), 결과 화면에서 "내가 찍은 자리"에
 * 도장을 남기려면 폰이 기억할 수밖에 없습니다. 다른 폰에서는 넣었다는 것만 알고 어디인지는 모릅니다.
 *
 * effect 안에서 setState를 하면 린트가 빌드를 막으므로 useSyncExternalStore로 읽습니다
 * (use-quiz-answer.ts와 같은 방식).
 */

const KEY_PREFIX = "agikaeta:vote:";

/** 저장소를 못 쓰는 브라우저에서도 켜 둔 동안은 기억합니다. */
const memory = new Map<string, number>();
const listeners = new Set<() => void>();

function read(key: string): number | null {
  const kept = memory.get(key);
  if (kept !== undefined) return kept;
  try {
    const value = localStorage.getItem(KEY_PREFIX + key);
    if (value === null) return null;
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 ? index : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(key: string, index: number) {
  memory.set(key, index);
  try {
    localStorage.setItem(KEY_PREFIX + key, String(index));
  } catch {
    // 저장만 못 할 뿐, 켜 둔 동안에는 memory에서 읽습니다.
  }
  for (const listener of listeners) listener();
}

/** [내가 고른 자리(모르면 null), 기억하기] */
export function useVoteChoice(uid: string | undefined, pollId: string) {
  const key = `${uid ?? "guest"}:${pollId}`;
  const choice = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  return [choice, (index: number) => write(key, index)] as const;
}
