"use client";

/**
 * 켜기/끄기 스위치 한 줄 — 왼쪽에 이름, 오른쪽에 동그란 손잡이가 미끄러지는 스위치.
 *
 * 2026-09-24 사용자 요청: 설정의 "글씨 크기"·"화면"을 아이폰 설정 앱의
 * "사운드 및 햅틱" 화면처럼 온오프 버튼으로. 켜진 색은 아이폰의 초록 대신
 * 앱 브랜드색(주황)입니다.
 *
 * 줄 전체가 버튼입니다 — 작은 스위치만 정확히 누르지 않아도 줄 어디를 눌러도 바뀝니다.
 * 상자 높이는 위아래 py-3으로, 로그아웃 단추·관리자 화면 줄과 같은 약 48px입니다.
 */
export default function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-3 shadow-[var(--shadow-card)]"
    >
      {/* 글씨만 2px 위로 — 설정의 다른 박스 글씨와 같이(2026-09-15). */}
      <span className="-translate-y-[2px] text-[17px] font-bold text-ink">{label}</span>

      {/* 스위치 — 아이폰과 같은 51×31 크기, 손잡이는 27px. */}
      <span
        aria-hidden="true"
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-brand-500" : "bg-line"
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
          style={{
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </span>
    </button>
  );
}
