"use client";

import EventForm from "@/components/EventForm";

/**
 * 일정 등록 시트 (2026-09-25 사용자 "일정등록 창을 투표 만들기 창처럼 — 위는 반투명, 화면 아래만 차지").
 *
 * 2026-10-06 사용자 요청으로 껍데기(손잡이·제목·아래 취소|등록하기 줄)는 공용 Sheet(components/Sheet.tsx)를 쓰고,
 * 그 안쪽 짜임은 EventForm이 onDone 모드에서 그립니다(뉴웨이브앱 시트와 같은 간격). 저장하면 시트만 닫히고 보던 화면에 남습니다.
 * 홈 캘린더 onClick으로 이벤트가 새지 않게 막는 일도 EventForm 쪽 래퍼가 합니다.
 */
export default function EventSheet({
  initialDate = "",
  onClose,
}: {
  initialDate?: string;
  onClose: () => void;
}) {
  return <EventForm initialDate={initialDate} onDone={onClose} />;
}
