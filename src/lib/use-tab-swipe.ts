"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 탭 화면을 옆으로 밀어 옆 탭으로 — 인스타그램처럼 (2026-09-25 사용자 요청).
 *
 * 다섯 탭의 첫 화면(roots)에서만 동작합니다. 왼쪽으로 밀면 오른쪽 탭, 오른쪽으로 밀면 왼쪽 탭.
 * 미는 동안 화면이 손가락을 따라오고(끝 탭에서 더 갈 곳이 없으면 고무줄처럼 조금만),
 * 화면 폭의 1/4을 넘기거나 빠르게 튕기면 넘어갑니다. 새 탭은 반대쪽에서 미끄러져 들어옵니다.
 *
 * ★ 따라 움직이는 것은 transform이 아니라 position: relative + left입니다.
 *   transform을 걸면 그 안의 position: fixed(떠 있는 "소식 올리기"·"파일 올리기" 알약, 아래 시트들)가
 *   화면이 아니라 <main>을 기준으로 자리를 잡아, 미는 순간 알약이 엉뚱한 곳으로 튑니다. left는 그러지 않습니다.
 *   손을 떼고 나면 인라인 값은 모두 지웁니다 — 평소 <main>에는 아무것도 걸려 있지 않습니다.
 *
 * 밀기를 받지 않는 곳:
 *   - 화면 좌우 끝 24px — 아이폰 자체 손짓(뒤로 가기) 자리.
 *   - [data-no-tab-swipe] 안 — 위원회·원우 소식 카드 책(카드를 옆으로 넘김).
 *   - 가로로 굴러가는 줄(overflow-x가 auto/scroll이고 실제로 넘치는 것) — 그 줄을 굴리려는 손짓.
 *   - 입력칸, 창(role="dialog").
 *   - 세로로 더 많이 움직인 손짓 — 그냥 스크롤입니다.
 *
 * ★ React의 onTouchMove가 아니라 addEventListener(passive: false)로 붙입니다 — 옆으로 미는 동안
 *   세로 스크롤을 막으려면 preventDefault가 먹어야 하는데, React는 passive로 붙입니다.
 *   게다가 React 이벤트는 포털(document.body에 붙인 시트)에서도 트리를 따라 올라와서, 시트 위를 밀면
 *   탭이 넘어갑니다. 브라우저 이벤트는 실제 DOM만 따라가 그런 일이 없습니다.
 */

/** 새 탭이 들어올 쪽(-1 왼쪽, 1 오른쪽). 넘기는 순간 적고, 주소가 바뀐 뒤 들어오는 움직임에 씁니다. */
let pendingEnter: -1 | 1 | null = null;

const EDGE = 24;
const OUT_MS = 140;
const IN_MS = 220;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function clearInline(element: HTMLElement) {
  element.style.position = "";
  element.style.left = "";
  element.style.opacity = "";
  element.style.transition = "";
}

/** 이 손짓을 탭 넘기기로 받지 않을 곳에서 시작했는지. */
function isBlocked(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (
    target.closest(
      '[data-no-tab-swipe], input, textarea, select, [contenteditable="true"], [role="dialog"]',
    )
  ) {
    return true;
  }
  for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
    const overflowX = getComputedStyle(node).overflowX;
    if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 1) {
      return true;
    }
  }
  return false;
}

export function useTabSwipe(roots: readonly string[]) {
  const ref = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const index = roots.indexOf(pathname);

  // 넘긴 뒤 새 탭이 그려지면 반대쪽에서 미끄러져 들어옵니다.
  useEffect(() => {
    const main = ref.current;
    if (!main || pendingEnter === null) return;
    const from = pendingEnter;
    pendingEnter = null;
    clearInline(main);
    main.style.position = "relative";
    const animation = main.animate(
      [
        { left: `${from * 28}vw`, opacity: 0 },
        { left: "0px", opacity: 1 },
      ],
      { duration: IN_MS, easing: EASE },
    );
    animation.onfinish = () => clearInline(main);
    animation.oncancel = () => clearInline(main);
  }, [pathname]);

  useEffect(() => {
    const main = ref.current;
    if (!main || index < 0) return;
    const element: HTMLElement = main;

    let start: { x: number; y: number; time: number } | null = null;
    /** null = 아직 방향을 못 정함, true = 옆으로 미는 중, false = 세로(스크롤) */
    let horizontal: boolean | null = null;
    let dx = 0;

    function onStart(event: TouchEvent) {
      start = null;
      horizontal = null;
      dx = 0;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return;
      if (isBlocked(event.target, element)) return;
      start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
    }

    function onMove(event: TouchEvent) {
      if (!start) return;
      const touch = event.touches[0];
      if (!touch) return;
      const moveX = touch.clientX - start.x;
      const moveY = touch.clientY - start.y;
      if (horizontal === null) {
        if (Math.abs(moveX) < 10 && Math.abs(moveY) < 10) return;
        horizontal = Math.abs(moveX) > Math.abs(moveY) * 1.2;
        if (!horizontal) {
          start = null;
          return;
        }
      }
      event.preventDefault();
      dx = moveX;
      const hasNeighbor = roots[index + (dx < 0 ? 1 : -1)] !== undefined;
      element.style.position = "relative";
      element.style.transition = "none";
      element.style.left = `${hasNeighbor ? dx : dx * 0.2}px`;
    }

    function onEnd(event: TouchEvent) {
      if (!start || !horizontal) {
        start = null;
        return;
      }
      const elapsed = Math.max(1, event.timeStamp - start.time);
      start = null;
      const next = roots[index + (dx < 0 ? 1 : -1)];
      const fast = Math.abs(dx) / elapsed > 0.5 && Math.abs(dx) > 40;
      if (next && (Math.abs(dx) > window.innerWidth / 4 || fast)) {
        const direction = dx < 0 ? -1 : 1;
        element.style.transition = `left ${OUT_MS}ms ease-out, opacity ${OUT_MS}ms ease-out`;
        element.style.left = `${direction * 50}vw`;
        element.style.opacity = "0";
        // 새 탭은 반대쪽에서 들어옵니다 — 왼쪽으로 밀었으면 오른쪽에서.
        pendingEnter = direction === -1 ? 1 : -1;
        window.setTimeout(() => router.replace(next), OUT_MS);
        // 혹시 주소가 안 바뀌면(이동 실패) 화면이 빈 채로 남지 않게 되돌립니다.
        window.setTimeout(() => {
          if (pendingEnter !== null) {
            pendingEnter = null;
            clearInline(element);
          }
        }, 1500);
      } else {
        element.style.transition = `left ${IN_MS}ms ${EASE}`;
        element.style.left = "0px";
        window.setTimeout(() => clearInline(element), IN_MS);
      }
    }

    function onCancel() {
      start = null;
      clearInline(element);
    }

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancel);
    return () => {
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onCancel);
    };
  }, [index, roots, router]);

  return ref;
}
