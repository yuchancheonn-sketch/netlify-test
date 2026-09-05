"use client";

import { useRef, useState, type CSSProperties, type TouchEvent, type TransitionEvent } from "react";

/**
 * 오른쪽으로 밀어서 앞 화면으로 돌아가기.
 *
 * 아이폰에서 화면을 옆으로 밀어 뒤로 가는 것과 같은 손짓입니다.
 * 대화방과 내 프로필이 이 훅을 함께 씁니다 — 같은 손짓을 두 벌로 적어두면
 * 한쪽만 다듬어져서 화면마다 미는 느낌이 달라집니다.
 *
 * 쓰는 쪽에서 할 일은 두 가지입니다.
 *  1. 바깥 상자에 `handlers`와 `touchAction`을 겁니다.
 *  2. 실제로 밀려나야 할 요소에 `slideStyle`을 겁니다.
 *
 * ★ slideStyle을 아무 데나 걸면 안 됩니다. transform이 걸린 상자는 그 안의
 *   position:fixed 자식이 화면이 아니라 그 상자를 기준으로 자리를 잡습니다.
 *   안에 떠 있는 요소가 있다면 그것들을 피해서, 밀려날 부분에만 따로 거세요.
 *   (대화방이 제목·대화 묶음과 입력줄에 나눠 거는 이유가 이것입니다.)
 */
export function useSwipeBack({
  onCommit,
  onAxisLocked,
  onSettled,
}: {
  /** 화면 절반을 넘겨 손을 뗐을 때. 뒤로 가는 동작을 여기에 적습니다. */
  onCommit: () => void;
  /**
   * 가로로 미는 손짓이라고 판정된 순간.
   * 밀려나면 곧바로 뒤가 드러나므로, 뒤에 깔아둘 화면이 있다면 이때 붙입니다.
   */
  onAxisLocked?: () => void;
  /** 제자리로 되돌아오는 애니메이션이 끝났을 때. 깔아둔 것을 떼어냅니다. */
  onSettled?: () => void;
}) {
  /*
   * dragX는 손가락을 따라 화면이 밀려난 거리입니다. 미는 동안에는 애니메이션
   * 없이 손가락에 딱 붙고(snapping=false), 손을 떼는 순간부터 부드럽게
   * 제자리로 돌아가거나 바깥으로 빠져나갑니다(snapping=true).
   */
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState(false);

  /** 손짓이 시작된 자리. 세로 스크롤로 판정되면 null로 지웁니다. */
  const start = useRef<{ x: number; y: number } | null>(null);
  /** 가로인지 세로인지는 처음 8px을 움직여 본 뒤 한 번만 정하고 끝까지 지킵니다. */
  const axis = useRef<"unknown" | "x" | "y">("unknown");

  function onTouchStart(event: TouchEvent) {
    // 두 손가락은 확대·축소이지 넘기기가 아닙니다.
    if (event.touches.length !== 1) return;
    // 입력칸이나 버튼 위에서 시작한 손짓은 그쪽 몫으로 둡니다.
    if ((event.target as HTMLElement).closest("input, textarea, button, select, a")) return;

    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
    axis.current = "unknown";
    setSnapping(false);
  }

  function onTouchMove(event: TouchEvent) {
    const from = start.current;
    if (!from) return;

    const touch = event.touches[0];
    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;

    if (axis.current === "unknown") {
      // 아직 어느 쪽인지 알기엔 너무 조금 움직였습니다.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      /*
       * 오른쪽으로, 그리고 세로보다 1.5배는 더 갔을 때만 넘기기로 봅니다.
       * 이 기준이 없으면 화면을 비스듬히 훑어 올릴 때마다 뒤로 가버립니다.
       */
      if (dx > 0 && dx > Math.abs(dy) * 1.5) {
        axis.current = "x";
        onAxisLocked?.();
      } else {
        axis.current = "y";
        start.current = null;
        return;
      }
    }

    // 왼쪽으로 되돌아오는 건 따라가되, 시작점보다 왼쪽으로는 넘어가지 않습니다.
    setDragX(Math.max(0, dx));
  }

  function onTouchEnd() {
    const from = start.current;
    start.current = null;
    setSnapping(true);

    if (!from || axis.current !== "x") {
      setDragX(0);
      return;
    }

    // 화면 절반을 넘겼으면 손을 떼는 순간 마저 빠져나가고, 못 넘겼으면 제자리로.
    if (dragX > window.innerWidth / 2) {
      setDragX(window.innerWidth);
      onCommit();
    } else {
      setDragX(0);
    }
  }

  /**
   * 되돌아오는 애니메이션이 끝났을 때 알려줍니다.
   *
   * 손을 떼자마자 알리면 화면이 아직 비스듬히 밀려 있는 340ms 동안
   * 뒤에 깔아둔 것을 떼어내 흰 벽이 드러납니다.
   */
  function onSlideSettled(event: TransitionEvent<HTMLElement>) {
    // 안쪽 요소의 다른 애니메이션이 타고 올라온 것은 흘려보냅니다.
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (dragX === 0) onSettled?.();
  }

  const slideStyle: CSSProperties = {
    transform: dragX ? `translateX(${dragX}px)` : undefined,
    transition: snapping ? "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
  };

  return {
    dragX,
    slideStyle,
    onSlideSettled,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    /*
     * 세로 스크롤만 브라우저에 맡기고 가로는 우리가 씁니다.
     * 이게 없으면 미는 도중에 브라우저가 제 나름의 가로 스크롤·뒤로가기를
     * 끼어들어 처리해서 손짓이 중간에 끊깁니다.
     */
    touchAction: { touchAction: "pan-y" } as CSSProperties,
  };
}
