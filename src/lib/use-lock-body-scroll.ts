"use client";

import { useEffect } from "react";

/**
 * 바텀시트·뷰어가 떠 있는 동안 뒤쪽 화면이 같이 스크롤되지 않게 막습니다.
 *
 * 이 앱은 페이지 자체(창)가 스크롤됩니다. body에 overflow: hidden을 걸면 html이 visible이라
 * 그 값이 창으로 넘어가 창 스크롤이 멈춥니다. html에까지 걸지 않는 이유 — 그러면 body가
 * 따로 스크롤 상자가 되어, 스크롤해 둔 화면의 sticky 제목 줄이 제자리를 잃고 튑니다.
 *
 * ★ 아이폰은 이것만으로는 손가락 스크롤이 새는 경우가 있습니다. 그래서 시트 쪽에서
 *   어두운 바탕에 touch-none을 함께 겁니다 — 바탕에서 시작한 손짓이 스크롤로 읽히지 않고
 *   탭(닫기)으로만 읽힙니다. 시트 안의 스크롤 상자는 제 안에서 따로 스크롤되므로 영향이 없습니다.
 *
 * 떠날 때는 걸기 전 값으로 되돌립니다(시트 위에 뷰어가 겹쳐 떠도 차례대로 풀립니다).
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}
