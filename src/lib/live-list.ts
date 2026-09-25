"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ListState } from "@/lib/hooks";

/**
 * 앱이 켜져 있는 동안 한 번 받은 목록을 들고 있는 곳 (2026-09-26 사용자 "홈 일정 칸이랑 원우탭이 너무 로딩이 오래 걸려").
 *
 * 예전엔 화면마다 열 때 Firestore 구독을 새로 걸고 닫을 때 끊었습니다. 그래서
 *  - 로딩 화면(1초)이 끝나고 홈이 그려진 **뒤에야** 일정을 받기 시작했고,
 *  - 원우탭 → 홈 → 원우탭처럼 오갈 때마다 회색 자리 표시부터 다시 봤습니다.
 * 이제 키 하나에 구독 하나를 걸어 두고 끊지 않습니다. 화면은 들고 있는 값을 곧바로 그리고,
 * warmLiveList로 로딩 화면이 떠 있는 동안 미리 받기 시작할 수 있습니다(StageGate).
 * 자료가 작고(일정 수십 건·원우 수십 명) 바뀔 때만 다시 읽으므로 읽기 비용은 그대로입니다.
 *
 * ★ 구독이 오류로 끝나면(로그아웃해 권한이 없어진 경우 등) 다음에 화면이 붙을 때 새로 겁니다.
 * ★ 키에는 결과를 가르는 값(기수, 로그인한 사람 uid)을 모두 넣습니다.
 */

type Start<T> = (emit: (state: ListState<T>) => void) => void;

interface Entry {
  state: ListState<unknown>;
  listeners: Set<() => void>;
  failed: boolean;
}

const LOADING: ListState<never> = { data: [], loading: true, error: null };
const entries = new Map<string, Entry>();

function ensure<T>(key: string, start: Start<T>): Entry {
  const existing = entries.get(key);
  if (existing && !existing.failed) return existing;
  const entry: Entry = existing ?? { state: LOADING, listeners: new Set(), failed: false };
  entry.failed = false;
  entries.set(key, entry);
  start((state) => {
    entry.state = state as ListState<unknown>;
    if (state.error) entry.failed = true;
    for (const listener of entry.listeners) listener();
  });
  return entry;
}

/** 화면이 그려지기 전에 미리 받기 시작합니다. 이미 받고 있으면 아무것도 안 합니다. */
export function warmLiveList<T>(key: string, start: Start<T>) {
  ensure(key, start);
}

/** key가 null이면 아직 받을 수 없는 때(로그인 확인 중 등) — 불러오는 중으로 둡니다. */
export function useLiveList<T>(key: string | null, start: Start<T>): ListState<T> {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const entry = ensure(key, start);
      entry.listeners.add(onChange);
      return () => {
        entry.listeners.delete(onChange);
      };
    },
    // start는 매번 새 함수지만 같은 키면 같은 일을 하므로 키만 봅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const getSnapshot = () => (key ? (entries.get(key)?.state ?? LOADING) : LOADING) as ListState<T>;
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING as ListState<T>);
}
