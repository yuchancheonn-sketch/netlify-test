"use client";

import { useEffect, useRef } from "react";

/** 가운데 높이 말줄임표 — 카톡 대화 목록처럼 (2026-09-27 사용자 "중간 높이의 ... 붙여줘"). */
const MID_ELLIPSIS = "⋯";

/**
 * 한 줄에 안 들어가면 잘라서 끝에 가운데 높이 "⋯"를 붙이는 글자.
 *
 * ★ CSS의 truncate(text-overflow: ellipsis)는 아래에 붙는 "…"만 그립니다. 다른 글자를 쓰는
 *   text-overflow: "⋯"는 파이어폭스만 알아들어 아이폰 사파리에서는 안 됩니다.
 *   그래서 들어갈 만큼을 직접 재어(이분 탐색) 자르고 "⋯"를 붙입니다.
 *
 * - 부모 상자의 폭이 바뀌면(화면 회전·글씨 크기) 원래 글자로 되돌렸다가 다시 잽니다 — 부모를 지켜봅니다.
 * - 글자는 DOM에 직접 적습니다(setState 없이). 이 저장소는 effect 안 setState를 린트로 막고 있고,
 *   리액트는 같은 글자로 다시 그릴 때 DOM을 건드리지 않으므로 잘라 둔 글자가 그대로 남습니다.
 *   글자(text)가 바뀌면 리액트가 새 글자를 적고, 이 effect가 다시 잽니다.
 * - 부모가 flex면 이 칸이 줄어들 수 있게 min-w-0을 둡니다.
 */
export default function MidEllipsis({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const target = element;

    function fit() {
      target.textContent = text;
      if (target.scrollWidth <= target.clientWidth) return;
      // 들어가는 가장 긴 앞부분을 찾습니다.
      let low = 0;
      let high = text.length;
      while (low < high) {
        const middle = (low + high + 1) >> 1;
        target.textContent = text.slice(0, middle).trimEnd() + MID_ELLIPSIS;
        if (target.scrollWidth <= target.clientWidth) low = middle;
        else high = middle - 1;
      }
      target.textContent = text.slice(0, low).trimEnd() + MID_ELLIPSIS;
    }

    fit();
    const parent = target.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;
    let lastWidth = parent.clientWidth;
    const observer = new ResizeObserver(() => {
      if (parent.clientWidth === lastWidth) return;
      lastWidth = parent.clientWidth;
      fit();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={ref} title={text} className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}>
      {text}
    </span>
  );
}
