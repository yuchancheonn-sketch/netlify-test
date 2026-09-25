"use client";

import { createPortal } from "react-dom";
import EventForm from "@/components/EventForm";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";

/**
 * 일정 등록 시트 (2026-09-25 사용자 "일정등록 창을 투표 만들기 창처럼 — 위는 반투명, 화면 아래만 차지").
 *
 * 투표 만들기 시트(PollCard.tsx의 CreatePollSheet)와 같은 짜임입니다 — 어두운 반투명 바탕, 아래에서 올라오는 시트,
 * 손잡이를 끌어내려 닫기, 뒤 화면 스크롤 잠금. 속의 폼은 등록 화면(/events/new)과 같은 EventForm이라
 * 칸 모양(흰 바탕 위 옅은 회색 칸)도 같습니다. 저장하면 시트만 닫히고 보던 화면에 그대로 남습니다.
 *
 * ★ 이벤트 버블링: 포털이어도 React 이벤트는 부모 컴포넌트까지 올라갑니다. 홈 캘린더는 누르면 화면 가운데로
 *   굴러오는 onClick이 있어서, 시트 안·바탕의 누름이 거기까지 가지 않게 여기서 멈춥니다.
 */
export default function EventSheet({
  initialDate = "",
  onClose,
}: {
  initialDate?: string;
  onClose: () => void;
}) {
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);
  useLockBodyScroll();

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex touch-none items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="일정 등록"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-surface sm:rounded-[16px]"
        style={sheetStyle}
      >
        {/* 손잡이 바 — 끌어내려 닫을 수 있습니다. */}
        <div {...handleTouchHandlers} aria-hidden="true" className="flex shrink-0 touch-none justify-center pt-3 pb-2">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <h2 className="mb-5 px-6 text-[19px] font-bold text-ink">일정 등록</h2>
          <EventForm
            initialDate={initialDate}
            onDone={onClose}
            className="px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
