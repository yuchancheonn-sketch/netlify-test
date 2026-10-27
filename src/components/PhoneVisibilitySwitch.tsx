"use client";

import { PhoneIcon } from "@/components/icons";

/**
 * 전화번호 공개 스위치 (2026-10-27 사용자 요청 "뉴웨이브앱처럼 전화번호 공개는 본인이 선택, 디자인도 똑같이" — 뉴웨이브 components/PhoneVisibilitySwitch.tsx를 그대로 옮김, 켜짐 색만 이 앱 주황):
 * 가로로 긴 알약 바탕(켜짐 주황·꺼짐 회색) + 흰 동그란 손잡이, 손잡이 안에 전화 그림.
 * 비율은 뉴웨이브와 같음: 알약 가로:세로 = 126:72(1.75), 손잡이 지름 = 세로의 2/3, 둘레 여백 = 세로의 1/6 → 52×30px · 손잡이 20px · 여백 5px.
 * 켜면 다른 원우에게 내 전화번호가 보이고, 끄면 나만 봅니다(운영진 화면에서는 여전히 보입니다).
 */
export default function PhoneVisibilitySwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="전화번호 공개"
      onClick={() => onChange(!checked)}
      className="relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? "var(--color-brand-500)" : "var(--color-line)" }}
    >
      {/* 켜지면 오른쪽 끝으로 22px(52 − 20 − 5 − 5) */}
      <span
        aria-hidden="true"
        className="absolute top-[5px] left-[5px] flex h-5 w-5 items-center justify-center rounded-full bg-white"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(0)",
          transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <PhoneIcon className={`h-[12px] w-[12px] ${checked ? "text-brand-500" : "text-ink-faint"}`} strokeWidth={2.2} />
      </span>
    </button>
  );
}
