"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownCircleIcon } from "@/components/icons";
import { ALL_COHORTS, COHORTS } from "@/lib/cohort";

/** 펼친 목록의 폭(px). "10기"·"전체"가 한 줄로 들어가는 만큼만 둡니다. */
const LIST_WIDTH = 76;
/** 단추와 목록 사이 간격(px) */
const LIST_GAP = 6;
/** 목록이 화면 가장자리에 붙지 않게 남기는 여백(px). 카드들의 좌우 여백과 같습니다. */
const SCREEN_EDGE = 16;

/**
 * 제목 옆 기수 고르기. "원우수첩 10기 ⓥ"처럼 제목과 한 줄에 글씨로 섭니다.
 * 원우수첩(원우 누구나, "전체" 있음)과 홈·자료·모임(운영진만)이 함께 씁니다.
 *
 * ★ 폰의 <select> 창을 빌려 쓰지 않고 목록을 직접 그립니다.
 *   예전에는 투명한 select를 덮어 기기 창을 띄웠는데, 그 창의 폭은 기기가
 *   정해서 "10기" 한 단어를 고르는 데 화면 절반만 한 상자가 떴습니다.
 *   직접 그리면 폭을 글자에 맞출 수 있습니다.
 *
 * ★ 목록은 document.body에 따로 띄웁니다(portal).
 *   제목(PageHeader의 h1)이 넘치는 글자를 자르려고 overflow를 막고 있어서,
 *   그 안에 두면 목록이 제목 줄 높이에서 잘려 보이지 않습니다. 대신 자리는
 *   누를 때 단추 위치를 재서 정하고, 화면을 굴리면 목록이 단추에서 떨어져
 *   떠 있게 되므로 닫습니다.
 */
export default function CohortPicker({
  value,
  onChange,
  includeAll = false,
}: {
  value: string;
  onChange: (next: string) => void;
  /** 맨 끝에 "전체"를 둘지 (원우수첩만) */
  includeAll?: boolean;
}) {
  /** 펼친 목록의 화면 위 자리. 닫혀 있으면 null */
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = anchor !== null;

  const options = includeAll ? [...COHORTS, ALL_COHORTS] : COHORTS;
  const labelOf = (option: string) => (option === ALL_COHORTS ? "전체" : option);

  function toggle() {
    if (open) {
      setAnchor(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: rect.bottom + LIST_GAP,
      // 단추 왼쪽 끝에 맞추되, 화면 오른쪽으로 삐져나가지 않게 당깁니다.
      left: Math.max(
        SCREEN_EDGE,
        Math.min(rect.left, window.innerWidth - LIST_WIDTH - SCREEN_EDGE),
      ),
    });
  }

  // 펼쳐져 있는 동안: Esc로 닫고, 화면을 굴리거나 창 크기가 바뀌면 닫습니다.
  useEffect(() => {
    if (!open) return;
    function close() {
      setAnchor(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      {/*
        ★ [font-size:inherit]! 가 꼭 필요합니다.
          globals.css의 `button { font-size: 16px }`는 레이어 밖에 있어서 Tailwind
          글씨 크기를 이깁니다. 이게 없으면 기수 글씨만 16px로 작아져 제목(22px,
          세로가 짧은 화면에서는 18px)과 어긋납니다. 제목 크기를 그대로 물려받게 합니다.
        화살표도 1em이라 제목이 줄어들면 함께 줄어듭니다.
      */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`기수 고르기 (지금 ${labelOf(value)})`}
        className="inline-flex items-center gap-1 text-ink transition [font-size:inherit]! active:opacity-60"
      >
        {labelOf(value)}
        <ChevronDownCircleIcon className="h-[1em] w-[1em]" />
      </button>

      {open
        ? createPortal(
            <>
              {/* 목록 밖 아무 데나 누르면 닫힙니다. 화면을 어둡게 하지는 않습니다. */}
              <span
                aria-hidden="true"
                className="fixed inset-0 z-50"
                onPointerDown={() => setAnchor(null)}
              />
              <ul
                aria-label="기수"
                className="fixed z-50 max-h-[min(60dvh,440px)] overflow-y-auto overscroll-contain rounded-xl bg-surface py-1 shadow-[var(--shadow-float)]"
                style={{ top: anchor.top, left: anchor.left, width: LIST_WIDTH }}
              >
                {options.map((option) => {
                  const selected = option === value;
                  return (
                    <li key={option}>
                      {/* 크기 뒤의 !는 위 단추와 같은 이유입니다 (globals.css의 button 규칙). */}
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          onChange(option);
                          setAnchor(null);
                        }}
                        className={`block w-full py-2 text-center text-[15px]! transition active:bg-fill ${
                          selected ? "bg-fill font-bold text-ink" : "font-medium text-ink-soft"
                        }`}
                      >
                        {labelOf(option)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
