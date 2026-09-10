"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronLeftIcon } from "@/components/icons";
import { ALL_COHORTS, COHORTS } from "@/lib/cohort";

/**
 * 펼친 목록의 폭 = 글씨 크기 × 이 배수. 체크 칸 + "10기"·"전체"가 한 줄로 들어가는 만큼만 둡니다.
 * 목록 글씨가 제목 크기(22px, 세로가 짧은 화면 18px)를 따라가므로 폭도 함께 따라갑니다.
 */
const LIST_WIDTH_EM = 5.5;
/** 단추와 목록 사이 간격(px) */
const LIST_GAP = 8;
/** 목록이 화면 가장자리에 붙지 않게 남기는 여백(px). 카드들의 좌우 여백과 같습니다. */
const SCREEN_EDGE = 16;
/**
 * 목록을 단추보다 이만큼 왼쪽에서 시작합니다(px).
 * 목록 안쪽 여백 + 체크 칸만큼이라, 목록의 글자와 단추의 글자가 대략 한 줄로 섭니다.
 */
const LIST_SHIFT = 8;

/**
 * 제목 옆 기수 고르기. "원우수첩 10기 ⌄"처럼 제목과 한 줄에 글씨로 섭니다.
 * 원우수첩(원우 누구나, "전체" 있음)과 홈·자료·모임(운영진만)이 함께 씁니다.
 *
 * ★ 폰의 <select> 창을 빌려 쓰지 않고 목록을 직접 그립니다.
 *   기기 창은 아이폰의 유리 메뉴라 보기엔 좋았지만 폭을 기기가 정해서,
 *   "10기" 한 단어를 고르는 데 화면 절반만 한 상자가 떴습니다.
 *   직접 그리되 **그 유리 메뉴의 결을 따릅니다** — 반투명 바탕 뒤를 흐리게
 *   비추고(backdrop-blur·saturate), 크게 둥근 모서리, 위쪽 가장자리의 가는
 *   빛, 고른 것 앞의 체크, 단추 쪽 모서리에서 살짝 커지며 열리는 움직임.
 *   하단 탭바의 유리 알약과 같은 재료라 앱 안에서도 한 식구로 보입니다.
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
  const [anchor, setAnchor] = useState<{ top: number; left: number; fontSize: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = anchor !== null;

  const options = includeAll ? [...COHORTS, ALL_COHORTS] : COHORTS;
  const labelOf = (option: string) => (option === ALL_COHORTS ? "전체" : option);

  function toggle() {
    if (open) {
      setAnchor(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    /*
     * 목록 글씨는 단추(= 제목 "원우수첩") 글씨와 같은 크기로 씁니다.
     * 목록은 body에 따로 떠서 제목 크기를 물려받지 못하므로, 열 때 재어 옮겨 줍니다.
     * 세로가 짧은 화면에서 제목이 18px로 줄어드는 것도 이렇게 따라갑니다.
     */
    const fontSize = parseFloat(getComputedStyle(trigger).fontSize) || 22;
    const width = Math.round(fontSize * LIST_WIDTH_EM);
    setAnchor({
      top: rect.bottom + LIST_GAP,
      // 단추 글자에 맞추되, 화면 양옆으로 삐져나가지 않게 당깁니다.
      left: Math.max(
        SCREEN_EDGE,
        Math.min(rect.left - LIST_SHIFT, window.innerWidth - width - SCREEN_EDGE),
      ),
      fontSize,
    });
  }

  /*
   * 목록이 나타나는 순간 한 번 — 커지며 열리는 움직임과, 고른 줄 보이기.
   *
   * CSS 애니메이션 대신 브라우저의 animate()를 씁니다. 목록은 열 때마다 새로
   * 붙으므로 붙는 순간(ref) 한 번 부르면 되고, globals.css에 키프레임을 따로
   * 두지 않아도 됩니다. useCallback으로 묶어야 화면이 다시 그려질 때
   * (원우 목록이 새로 들어올 때 등) 움직임이 되풀이되지 않습니다.
   *
   * 끝이 살짝 넘쳤다 돌아오는 곡선(1.2)이 아이폰 메뉴의 탄력을 흉내 냅니다.
   * "움직임 줄이기"를 켠 폰에서는 건너뜁니다.
   */
  const listRef = useCallback((node: HTMLUListElement | null) => {
    if (!node) return;
    node.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.animate(
      [
        { opacity: 0, transform: "scale(0.85)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1.2, 0.36, 1)" },
    );
  }, []);

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
        화살표는 원 없는 가는 꺾쇠입니다. (원 안의 화살표로 바꿔 봤다가 되돌렸습니다.)
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
        <ChevronLeftIcon className="h-5 w-5 -rotate-90" strokeWidth={2.5} />
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
              {/*
                유리판 — 하단 탭바와 같은 재료입니다.
                · bg-surface/70 + backdrop-blur-2xl + backdrop-saturate-200:
                  뒤 화면이 흐리게, 색은 조금 더 진하게 비칩니다.
                · 그림자 넷: 바깥 두 겹은 떠 있는 높이, 안쪽 두 겹은 유리
                  가장자리의 빛(위쪽 1px)과 둘레의 아주 옅은 테두리입니다.
                · 모서리 20px, 줄의 모서리 14px = 20 - 안쪽 여백 6px.
                  둘을 이렇게 맞춰야 누른 줄의 둥근 칠이 판의 둥근 모서리와
                  나란히 돕니다.
              */}
              <ul
                ref={listRef}
                aria-label="기수"
                className="fixed z-50 max-h-[min(70dvh,560px)] origin-top-left overflow-y-auto overscroll-contain rounded-[20px] bg-surface/70 p-1.5 shadow-[0_16px_48px_rgba(17,20,24,0.2),0_2px_8px_rgba(17,20,24,0.08),inset_0_1px_0_rgba(255,255,255,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.3)] backdrop-blur-2xl backdrop-saturate-200"
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  width: Math.round(anchor.fontSize * LIST_WIDTH_EM),
                  fontSize: anchor.fontSize,
                }}
              >
                {options.map((option) => {
                  const selected = option === value;
                  return (
                    <Fragment key={option}>
                      {/* "전체"는 기수들과 성격이 달라 가는 선으로 한 칸 떼어 둡니다. */}
                      {option === ALL_COHORTS ? (
                        <li aria-hidden="true" className="mx-2 my-1 h-px bg-ink/10" />
                      ) : null}
                      <li>
                        {/*
                          글씨 크기는 목록(ul)에 옮겨 둔 제목 크기를 물려받습니다.
                          !는 위 단추와 같은 이유입니다 (globals.css의 button 규칙).
                        */}
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            onChange(option);
                            setAnchor(null);
                          }}
                          className={`flex w-full items-center gap-1 rounded-[14px] py-2 pr-3 pl-1.5 text-left text-ink [font-size:inherit]! transition-colors active:bg-ink/[0.08] ${
                            selected ? "font-semibold" : "font-normal"
                          }`}
                        >
                          {/*
                            체크 칸은 고르지 않은 줄에도 자리를 남겨 둡니다.
                            그래야 모든 줄의 글자가 같은 자리에서 시작합니다.
                          */}
                          <CheckIcon
                            className={`h-[0.85em] w-[0.85em] shrink-0 ${selected ? "" : "invisible"}`}
                            strokeWidth={2.4}
                          />
                          {labelOf(option)}
                        </button>
                      </li>
                    </Fragment>
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
