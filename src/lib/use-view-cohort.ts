"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth-context";
import { COHORTS, cohortOf } from "@/lib/cohort";

/**
 * 홈·자료처럼 기수마다 따로 보이는 화면이 지금 몇 기를 보여줄지.
 *
 * 원우는 늘 자기 기수만 봅니다. **운영진만** 제목 옆 드롭다운으로 다른 기수를
 * 골라 볼 수 있고, 고른 값은 기기에 적어 두어 홈·자료·일정·수업 화면이 함께
 * 따릅니다. 홈에서 3기를 골랐는데 수업 화면에 들어가니 10기가 나오면 헷갈립니다.
 *
 * (원우수첩의 기수 고르기는 원우 누구나 쓰는 것이라 이 값과 따로 놉니다.)
 *
 * ★ 화면에서 가르는 것이지 잠금이 아닙니다. 보안 규칙은 기수를 보지 않습니다 —
 *   기수 칸이 없는 예전 문서가 10기로 읽혀야 해서 규칙으로는 거를 수 없습니다.
 *
 * 브라우저 저장소를 리액트로 끌어오므로 useSyncExternalStore를 씁니다
 * (effect 안 setState는 이 저장소의 린트가 빌드를 막습니다).
 */

const STORAGE_KEY = "agikaeta:view-cohort";

const listeners = new Set<() => void>();

/** 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 이번에 켜 둔 동안은 고른 대로 보이게 */
let fallback: string | null = null;

function snapshot(): string | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  const value = stored ?? fallback;
  return value && COHORTS.includes(value) ? value : null;
}

function serverSnapshot(): string | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useViewCohort() {
  const { profile, isAdmin } = useAuth();
  const picked = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const cohort = isAdmin && picked ? picked : cohortOf(profile?.cohort);

  function setCohort(next: string) {
    fallback = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장만 못 할 뿐, fallback으로 이번에는 고른 대로 보입니다.
    }
    for (const listener of listeners) listener();
  }

  return { cohort, canSwitch: isAdmin, setCohort };
}
