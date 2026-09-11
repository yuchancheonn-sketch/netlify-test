"use client";

import { useSyncExternalStore } from "react";
import { kstDayNumber, msUntilNextKstMidnight } from "@/lib/dosan-quiz";

/**
 * 한국 시간으로 오늘이 며칠째인지 — 한국 자정(새벽 12시)이 되면 화면이 저절로 다시 그려집니다.
 *
 * 그냥 렌더할 때 날짜를 읽으면, 홈을 켜 둔 채 자정을 넘긴 원우는 다른 화면으로
 * 갔다 오기 전까지 어제 문제를 보고 있게 됩니다. 그래서 다음 자정에 울리는 타이머를
 * 걸어 두고, 울리면 다시 그리게 합니다.
 *
 * ★ 폰이 잠들어 있거나 앱이 뒤로 가 있으면 타이머가 늦게 울리거나 아예 멈춥니다.
 *   화면이 다시 보이는 순간(visibilitychange·focus)에도 한 번 더 확인합니다.
 *   날짜가 그대로면 같은 숫자라 다시 그리지 않으므로 자주 불러도 괜찮습니다.
 *
 * effect 안에서 setState를 하면 린트가 빌드를 막아서 useSyncExternalStore로 읽습니다.
 */
function subscribe(onChange: () => void): () => void {
  let timer: number | undefined;

  function schedule() {
    // 자정 바로 그 순간보다 조금 늦게 울려야 확실히 다음 날로 계산됩니다.
    timer = window.setTimeout(() => {
      onChange();
      schedule();
    }, msUntilNextKstMidnight() + 1000);
  }

  function recheck() {
    window.clearTimeout(timer);
    onChange();
    schedule();
  }

  schedule();
  document.addEventListener("visibilitychange", recheck);
  window.addEventListener("focus", recheck);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", recheck);
    window.removeEventListener("focus", recheck);
  };
}

export function useKstDay(): number {
  return useSyncExternalStore(
    subscribe,
    () => kstDayNumber(),
    () => kstDayNumber(),
  );
}
