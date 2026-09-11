"use client";

import { useSyncExternalStore } from "react";
import type { OxAnswer } from "@/lib/dosan-quiz";

/**
 * 오늘의 OX 퀴즈에 내가 고른 답 — 이 폰에, 로그인한 계정별로 적어 둡니다.
 *
 * 누가 맞혔는지 모을 일이 없어 Firestore에 올리지 않습니다. 대신 기기마다
 * 따로라, 다른 폰으로 들어오면 오늘 문제를 다시 풀 수 있습니다.
 *
 * ★ 퀴즈는 원우 한 사람 한 사람이 각자 풉니다. 누가 먼저 풀었다고 다른 사람에게
 *   정답·해설이 열리면 안 됩니다. 답은 서버로 가지 않으니 다른 폰에는 애초에 안 보이고,
 *   한 폰에 여러 계정이 로그인하는 경우를 위해 저장 열쇠에 uid를 넣습니다(2026-09-11) —
 *   예전엔 열쇠가 날짜·문제뿐이라 같은 폰의 다른 계정에 이미 푼 것으로 보였습니다.
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

function write(key: string, quizKey: string, answer: OxAnswer) {
  memory.set(key, answer);
  try {
    /*
     * 지난 문제의 답은 더 쓸 일이 없어 지웁니다. 오늘 문제의 답은 계정마다 남겨 둡니다 —
     * 같은 폰의 다른 계정이 오늘 푼 답까지 지우면 그 사람이 한 번 더 풀게 됩니다.
     */
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const stored = localStorage.key(index);
      if (stored?.startsWith(KEY_PREFIX) && !stored.endsWith(`:${quizKey}`)) {
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
 * 이 폰에 적어 둔 퀴즈 답을 모두 지웁니다 — 오늘 문제를 다시 풀 수 있게.
 * 화면에는 입구가 없고, 주소 끝에 `?quiz-reset`을 붙여 홈을 열면 불립니다(DosanQuizCard).
 *
 * 2026-09-11까지 있던 카드 접어 두기 표시("agikaeta:quiz-collapsed:…")도 앞머리가
 * 같아(LEGACY_PREFIX) 함께 지워집니다. 접기 기능은 없앴고 남은 한 줄은 쓰이지 않습니다.
 */
const LEGACY_PREFIX = "agikaeta:quiz";

export function resetQuizAnswers() {
  memory.clear();
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const stored = localStorage.key(index);
      if (stored?.startsWith(LEGACY_PREFIX)) {
        localStorage.removeItem(stored);
      }
    }
  } catch {
    // 저장소를 못 쓰는 브라우저는 memory만 비우면 됩니다.
  }
  for (const listener of listeners) listener();
}

/**
 * uid는 로그인한 원우, quizKey는 "날짜:문제 id"처럼 오늘 문제를 가리키는 값입니다.
 * 저장 열쇠는 "uid:날짜:문제 id" — 계정마다 따로 풀고, 날짜나 문제 목록이 바뀌면 새로 풉니다.
 */
export function useQuizAnswer(uid: string | undefined, quizKey: string) {
  const key = `${uid ?? "guest"}:${quizKey}`;
  const answer = useSyncExternalStore(
    subscribe,
    () => read(key),
    // 서버에는 브라우저 저장소가 없으니 아직 안 푼 것으로 그립니다.
    () => null,
  );
  return [answer, (value: OxAnswer) => write(key, quizKey, value)] as const;
}
