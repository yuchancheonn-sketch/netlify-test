/**
 * 앱에서 쓰는 아이콘 모음.
 * 외부 아이콘 라이브러리를 넣지 않고 필요한 것만 인라인 SVG로 두어
 * 번들 크기를 아끼고 굵기·색을 한 곳에서 관리합니다.
 * 모두 currentColor를 따르므로 부모의 text-* 색상이 그대로 적용됩니다.
 */

interface IconProps {
  className?: string;
  /** 선 굵기. 하단 탭바에서 선택됐을 때 살짝 굵게 쓰기 위해 열어둡니다. */
  strokeWidth?: number;
}

function base(className?: string) {
  return className ?? "h-6 w-6";
}

export function HomeIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M3.5 10.4 12 4l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V15h-7v5.5H5A1.5 1.5 0 0 1 3.5 19v-8.6Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <circle cx="9.5" cy="8" r="3.3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M3.5 19.2c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M16.2 5.4a3 3 0 0 1 0 5.5M17.6 14.6c2 .6 3.4 2 3.4 4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LibraryIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M3.5 6.2A1.7 1.7 0 0 1 5.2 4.5h3.3l1.7 2h8.6a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V6.2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="m10.6 11.3 3.6 2-3.6 2v-4Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M4 6.4A1.9 1.9 0 0 1 5.9 4.5h12.2A1.9 1.9 0 0 1 20 6.4v7.9a1.9 1.9 0 0 1-1.9 1.9H9.3L5 19.8v-3.6h-.1A.9.9 0 0 1 4 15.3V6.4Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReflectionIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M16.4 3.9 20.1 7.6 9.4 18.3l-4.6.9.9-4.6L16.4 3.9Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="m14.2 6.1 3.7 3.7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <rect
        x="3.6"
        y="5.4"
        width="16.8"
        height="15"
        rx="2.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M3.6 10h16.8M8.4 3.6v3.4M15.6 3.6v3.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M12 7.6V12l2.9 1.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M12 21c4-4.2 6-7.4 6-10a6 6 0 1 0-12 0c0 2.6 2 5.8 6 10Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.8" r="2.2" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function PeopleCountIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <circle cx="8" cy="9.4" r="2.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="16" cy="9.4" r="2.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M3.4 18.4c0-2.3 2-3.7 4.6-3.7s4.6 1.4 4.6 3.7M13.6 15c2.9-.5 7 .6 7 3.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronLeftIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="m14.5 5.5-7 6.5 7 6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="m9.5 5.5 7 6.5-7 6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronUpDownIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="m8.5 10 3.5-3.5L15.5 10M8.5 14l3.5 3.5L15.5 14"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CameraIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M3.6 8.8a1.8 1.8 0 0 1 1.8-1.8h1.9l1.2-2h7l1.2 2h1.9a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8V8.8Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function SearchIcon({ className, strokeWidth = 1.9 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <circle cx="11" cy="11" r="6.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowUpIcon({ className, strokeWidth = 2.1 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M12 19V5m0 0-5.5 5.5M12 5l5.5 5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ className, strokeWidth = 2.1 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckIcon({ className, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="m5 12.5 4.6 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <rect
        x="4.8"
        y="10.2"
        width="14.4"
        height="9.6"
        rx="2.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M8.2 10.2V7.8a3.8 3.8 0 0 1 7.6 0v2.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M21.8 10.2h-.8V10h-9v4h5.6a6 6 0 1 1-1.7-6.5l2.8-2.8A10 10 0 1 0 22 12c0-.6-.1-1.2-.2-1.8Z"
      />
      <path
        fill="#FF3D00"
        d="m3.2 7.3 3.3 2.4A6 6 0 0 1 16 7.5l2.8-2.8A10 10 0 0 0 3.2 7.3Z"
      />
      <path
        fill="#4CAF50"
        d="M12 22a10 10 0 0 0 6.7-2.6l-3.1-2.6A6 6 0 0 1 6.4 14l-3.3 2.5A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#1976D2"
        d="M21.8 10.2H12v4h5.6a6 6 0 0 1-2 2.7l3.1 2.6c-.2.2 3.3-2.5 3.3-7.5 0-.6-.1-1.2-.2-1.8Z"
      />
    </svg>
  );
}
