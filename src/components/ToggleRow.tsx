"use client";

import type { ReactNode } from "react";

/**
 * 켜기/끄기 스위치 한 줄 — 왼쪽에 이름, 오른쪽에 손잡이가 미끄러지는 스위치.
 *
 * 2026-09-24 사용자 요청: 설정의 "알림"·"글씨 크기"·"화면"을 아이폰 설정 앱의
 * "사운드 및 햅틱" 화면처럼 온오프 버튼으로. 켜진 색은 앱 브랜드색(주황)입니다.
 *
 * 스위치 모양은 사용자가 보낸 아이폰 캡처 그대로입니다(2026-09-24) — 동그란 손잡이가 아니라
 * **가로로 긴 알약 손잡이**가 바탕 안에 2px 띄워 앉습니다. 바탕 65×28, 손잡이 38×24.
 * (바탕 폭 62px → 68px, 2026-09-25 사용자 "흰 알약 비율이 커서 회색 알약 가로를 조금만 더" — 손잡이는 그대로.
 *  같은 날 "26px에서 23px로" — 손잡이가 움직이는 거리를 23px로 줄여 바탕도 65px.)
 *
 * 줄 전체가 버튼입니다 — 작은 스위치만 정확히 누르지 않아도 줄 어디를 눌러도 바뀝니다.
 * 상자 높이는 위아래 py-3으로, 로그아웃 단추·관리자 화면 줄과 같은 약 48px입니다.
 */
export default function ToggleRow({
  label,
  checked,
  onChange,
  disabled = false,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** 스위치 왼쪽에 붙는 것 — 지금은 알림 줄의 스피너뿐입니다. */
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      // rounded-full — 한 줄짜리 상자를 알약 모양으로 (2026-09-25 사용자 요청, 아이폰 설정 캡처처럼. 16px 둥근 사각형에서).
      className={`flex w-full items-center justify-between rounded-full bg-surface px-5 py-3 shadow-[var(--shadow-card)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {/* 글씨만 2px 위로 — 설정의 다른 박스 글씨와 같이(2026-09-15). */}
      <span className="-translate-y-[2px] text-[17px] font-bold text-ink">{label}</span>

      <span className="flex items-center gap-2">
        {icon}
        <span
          aria-hidden="true"
          className={`relative h-[28px] w-[65px] shrink-0 rounded-full transition-colors duration-200 ${
            checked ? "bg-brand-500" : "bg-line"
          }`}
        >
          {/* 손잡이 — 켜지면 오른쪽으로 23px(65 − 38 − 2 − 2). 바탕 폭을 바꾸면 이 값도 같이. 꺼졌을 때만 옅은 그림자로 바탕과 떼어 보입니다. */}
          <span
            className={`absolute top-[2px] left-[2px] h-[24px] w-[38px] rounded-full bg-white ${
              checked ? "" : "shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
            }`}
            style={{
              transform: checked ? "translateX(23px)" : "translateX(0)",
              transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </span>
      </span>
    </button>
  );
}
