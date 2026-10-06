"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";

/**
 * 아래에서 올라오는 창 (2026-10-06 사용자 요청 — 뜨는 창 안쪽도 뉴웨이브앱 components/ui.tsx의 Sheet와 똑같이. 색은 애기애타 색).
 *
 * 짜임: 막(modal-scrim 그라데이션) 위에 양옆 12px·아래 홈 바 높이만큼 띄운 상자(네 모서리 32px, 최대 480px).
 *   위 손잡이 칸(pt-3 pb-2, 막대 40×6px) → 굴러가는 가운데 칸(좌우 24px, 제목 19px 굵게 + 아래 20px) → 붙박이 아래 줄(footer: 위 16px·아래 20px).
 * 손잡이를 끌어내리거나 막을 누르면 닫히고, 떠 있는 동안 뒤 화면 스크롤을 잠급니다. footer에는 보통 <SheetActions>를 넘깁니다.
 * ★ document.body에 붙입니다(createPortal) — 카드가 뒤집히려고 3D 변형을 쓰는 곳 안에서도 창이 같이 돌지 않게.
 */
export function Sheet({
  title,
  titlePrefix,
  onClose,
  children,
  footer,
}: {
  title?: string;
  /** 제목 글씨 앞에 붙는 그림(이모지 등) — 글씨와 따로 위치를 맞출 수 있게 분리 */
  titlePrefix?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);
  useLockBodyScroll();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center modal-scrim px-3 pb-[max(12px,calc(-4px+env(safe-area-inset-bottom)))] sm:items-center sm:px-5 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[88dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-[32px] glass-panel"
        style={sheetStyle}
      >
        <div {...handleTouchHandlers} aria-hidden="true" className="flex shrink-0 touch-none justify-center pt-3 pb-2">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-6">
          {title ? (
            <h2 className="mb-5 text-[19px] font-bold text-ink">
              {titlePrefix}
              {title}
            </h2>
          ) : null}
          {children}
        </div>
        {footer ? <div className="shrink-0 px-6 pt-4 pb-5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** 시트 아래 단추 한 줄 — 왼쪽 흰 "취소"(1) + 오른쪽 주황 주 버튼(3). 확인 창(ConfirmDialog)은 1:2. */
export function SheetActions({
  onCancel,
  confirmLabel,
  onConfirm,
  confirmType = "button",
  disabled,
  loading,
}: {
  onCancel: () => void;
  confirmLabel: string;
  /** confirmType이 "submit"이면 생략 — 폼의 제출로 처리합니다. */
  onConfirm?: () => void;
  confirmType?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <SecondaryButton size="sm" onClick={onCancel} className="w-auto flex-1">
        취소
      </SecondaryButton>
      <PrimaryButton
        size="sm"
        type={confirmType}
        onClick={onConfirm}
        disabled={disabled}
        loading={loading}
        raiseText
        className="flex-[3]"
      >
        {confirmLabel}
      </PrimaryButton>
    </div>
  );
}

/**
 * 확인 창 — 가운데 흰 상자(최대 320px). 브라우저 기본 confirm()은 쓰지 않습니다(아이폰 홈 화면 앱에서 주소가 찍힌 투박한 창이 뜸).
 * 되돌릴 수 없는 일(삭제·탈퇴)만 빨강 단추입니다. 뉴웨이브앱 ConfirmDialog를 옮김(2026-10-06).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "삭제",
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  useLockBodyScroll();

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex touch-none items-center justify-center modal-scrim px-8"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()} className="animate-sheet-up w-full max-w-[320px] rounded-3xl glass-panel p-5">
        <p className="text-[17px] font-bold text-ink">{title}</p>
        {description ? <p className="mt-2 text-[14px] leading-relaxed break-keep text-ink-muted">{description}</p> : null}
        <div className="mt-5 flex gap-2">
          <SecondaryButton size="sm" onClick={onClose} className="w-auto flex-1">
            취소
          </SecondaryButton>
          <PrimaryButton size="sm" onClick={confirm} loading={busy} raiseText className={`flex-[2] ${danger ? "bg-red-500!" : ""}`}>
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * ⋯ 를 누르면 뜨는 작은 흰 메뉴 (뉴웨이브앱 ActionMenu를 옮김, 2026-10-06 사용자 요청). 바깥을 누르면 닫힙니다(투명 덮개, 화면을 어둡게 하지 않음).
 * 쓰는 쪽이 relative 상자 안에 둡니다. 다크 모드에서는 surface 색을 따라갑니다.
 */
export function ActionMenu({
  items,
  onClose,
  className = "right-0 top-full mt-1",
}: {
  items: { label: string; onSelect: () => void; danger?: boolean }[];
  onClose: () => void;
  className?: string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        className={`absolute z-40 min-w-[88px] overflow-hidden rounded-xl bg-surface shadow-[0_4px_14px_rgba(0,0,0,0.16)] ${className}`}
      >
        {items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`block w-full px-3.5 py-2 text-left font-bold active:bg-fill ${
              index > 0 ? "border-t border-line" : ""
            } ${item.danger ? "text-danger" : "text-ink"}`}
          >
            <span className="text-[13px]">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
