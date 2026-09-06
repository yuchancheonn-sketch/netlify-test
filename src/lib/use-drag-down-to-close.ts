"use client";

import { useRef, useState } from "react";

/** 이만큼 아래로 끌면 놓아도 손가락 속도와 상관없이 닫힙니다. */
const DISMISS_DISTANCE = 120;
/** 짧게 끌어도 이 속도(px/ms)보다 빠르게 놓으면 닫힙니다 — 툭 튕기는 손짓. */
const DISMISS_VELOCITY = 0.6;

/**
 * 시트 위쪽 손잡이 바를 아래로 끌어서 닫는 손짓.
 *
 * 손잡이에서 시작한 손짓만 받습니다 — 시트 전체(특히 안에서 스크롤해야 하는
 * 화면)에 걸면 스크롤 손짓과 부딪힙니다. 대화방·프로필의 옆으로 미는 손짓
 * (use-swipe-back.ts)과 같은 자리에서 쓰는, 그 세로 방향 짝입니다.
 *
 * 반환하는 sheetStyle은 시트 전체(손잡이+내용)를 감싸는 바깥 상자에 걸어야
 * 손잡이만이 아니라 시트 전체가 손가락을 따라 내려옵니다. 손잡이 자체는
 * 스크롤되는 영역 바깥에 따로 두어야 스크롤 중에 다른 글자가 그 위로
 * 겹쳐 보이는 일이 없습니다.
 */
export function useDragDownToClose(onDismiss: () => void) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);

  function onTouchStart(event: React.TouchEvent) {
    setIsDragging(true);
    startY.current = event.touches[0].clientY;
    startTime.current = Date.now();
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!isDragging) return;
    const delta = event.touches[0].clientY - startY.current;
    setDragY(Math.max(0, delta));
  }

  function onTouchEnd() {
    if (!isDragging) return;
    setIsDragging(false);
    const elapsed = Date.now() - startTime.current || 1;
    const velocity = dragY / elapsed;
    if (dragY > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      onDismiss();
    } else {
      setDragY(0);
    }
  }

  return {
    /** 손잡이 바에만 붙입니다. */
    handleTouchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    /** 손잡이+내용을 함께 감싸는 바깥 상자에 붙입니다. */
    sheetStyle: {
      transform: dragY ? `translateY(${dragY}px)` : undefined,
      transition: isDragging ? "none" : "transform 240ms cubic-bezier(0.22,1,0.36,1)",
    },
  };
}
