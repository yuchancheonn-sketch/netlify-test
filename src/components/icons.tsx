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
  /**
   * 속을 꽉 채운 모양으로 그립니다. 하단 탭에서 지금 보고 있는 탭에만 씁니다.
   * (당근처럼 고른 탭의 아이콘이 통째로 칠해져 또렷하게 보이도록)
   * 선으로 그린 모양을 그대로 칠하면 어색해지는 아이콘은 채운 모양을 따로 그렸습니다.
   */
  filled?: boolean;
}

function base(className?: string) {
  return className ?? "h-6 w-6";
}

export function HomeIcon({ className, strokeWidth = 1.8, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      {/* 문이 바깥선의 홈으로 이어져 있어, 그대로 칠하면 문만 파인 집이 됩니다. */}
      <path
        d="M3.5 10.4 12 4l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V15h-7v5.5H5A1.5 1.5 0 0 1 3.5 19v-8.6Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className, strokeWidth = 1.8, filled }: IconProps) {
  // 몸통이 열린 곡선이라 그대로 칠하면 뭉개집니다. 채운 모양은 따로 그립니다.
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden="true">
        <circle cx="9.4" cy="7.9" r="3.7" />
        <path d="M2.8 19.7c0-3.5 3-5.6 6.6-5.6s6.6 2.1 6.6 5.6a.8.8 0 0 1-.8.8H3.6a.8.8 0 0 1-.8-.8Z" />
        <circle cx="17.7" cy="8.3" r="2.7" />
        <path d="M17.9 13.8c2.6.1 4.6 1.8 4.6 4.4a.8.8 0 0 1-.8.8h-3.5c.1-.4.2-.9.2-1.4 0-1.5-.2-2.8-.5-3.8Z" />
      </svg>
    );
  }

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

export function LibraryIcon({ className, strokeWidth = 1.8, filled }: IconProps) {
  /*
   * 채울 때는 폴더와 재생 삼각형을 한 path로 합치고 evenodd 규칙을 씁니다.
   * 따로 두면 삼각형까지 같은 색으로 칠해져 보이지 않게 됩니다.
   * 한 path 안에 넣으면 삼각형이 구멍으로 뚫립니다.
   */
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.5 6.2A1.7 1.7 0 0 1 5.2 4.5h3.3l1.7 2h8.6a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V6.2Zm7.1 5.1 3.6 2-3.6 2v-4Z"
          fill="currentColor"
        />
      </svg>
    );
  }

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

export function ChatIcon({ className, strokeWidth = 1.8, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      {/* 말풍선은 닫힌 모양 하나라 그대로 칠하면 됩니다. */}
      <path
        d="M4 6.4A1.9 1.9 0 0 1 5.9 4.5h12.2A1.9 1.9 0 0 1 20 6.4v7.9a1.9 1.9 0 0 1-1.9 1.9H9.3L5 19.8v-3.6h-.1A.9.9 0 0 1 4 15.3V6.4Z"
        fill={filled ? "currentColor" : "none"}
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

/** 도산아카데미 소식 탭 — 안내 방송을 뜻하는 확성기 */
export function MegaphoneIcon({ className, strokeWidth = 1.8, filled }: IconProps) {
  // 손잡이가 열린 곡선이라, 채울 때는 닫힌 모양으로 바꿔 그립니다.
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden="true">
        <path d="M19 4.5v15l-9.5-4H6a2.5 2.5 0 0 1 0-5h3.5L19 4.5Z" />
        <path d="M8 15.6h3.4v2.7a1.7 1.7 0 0 1-3.4 0v-2.7Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M19 4.5v15l-9.5-4H6a2.5 2.5 0 0 1 0-5h3.5L19 4.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M8 15.5v2.8a1.7 1.7 0 0 0 3.4 0v-1.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/**
 * 사람 하나. 제목 줄 오른쪽의 "내 프로필" 단추에 씁니다.
 * (여럿이 나오는 UsersIcon은 원우수첩 탭이 이미 쓰고 있어 헷갈리지 않게 따로 그렸습니다.)
 */
export function PersonIcon({ className, strokeWidth = 1.9 }: IconProps) {
  /*
    24 상자를 꽤 꽉 채웁니다(가로 3.9~20.1). 옆에 서는 톱니바퀴가 상자를
    거의 다 쓰기 때문에, 여백을 넉넉히 두면 같은 크기로 지정해도 사람만
    작아 보입니다. 둘의 크기는 지정값이 아니라 눈으로 맞춰야 합니다.
  */
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <circle cx="12" cy="7.44" r="4.1" stroke="currentColor" strokeWidth={strokeWidth} />
      {/* 어깨선은 양 끝을 열어 둡니다. 닫으면 반원처럼 보여 사람 같지 않습니다. */}
      <path
        d="M3.91 20.66c0-3.88 3.65-6.27 8.09-6.27s8.09 2.39 8.09 6.27"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 톱니바퀴. 제목 줄 오른쪽의 "설정" 단추에 씁니다.
 *
 * 둥근 돌기 여덟 개가 달린 고리 + 가운데 원입니다. 바깥선은 손으로 찍지
 * 않고 "몸통 원 하나와 돌기 원 여덟 개를 합친 도형의 경계"로 계산했습니다.
 *   · 몸통 반지름 7.2, 돌기 반지름 1.9, 돌기 중심까지 7.6 (바깥 9.5)
 * 그래서 돌기와 고리가 만나는 자리가 정확히 맞물려 이어집니다.
 * 눈대중으로 좌표를 찍으면 이음매에 미세한 각이 생겨 작게 줄였을 때 지저분해집니다.
 *
 * 비율을 바꾸고 싶으면 저 세 값으로 경로를 다시 계산하는 편이 안전합니다.
 */
export function SettingsIcon({ className, strokeWidth = 1.9 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(className)} aria-hidden="true">
      <path
        d="M10.206 5.027A1.9 1.9 0 1 1 13.794 5.027A7.2 7.2 0 0 1 15.662 5.801A1.9 1.9 0 1 1 18.199 8.338A7.2 7.2 0 0 1 18.973 10.206A1.9 1.9 0 1 1 18.973 13.794A7.2 7.2 0 0 1 18.199 15.662A1.9 1.9 0 1 1 15.662 18.199A7.2 7.2 0 0 1 13.794 18.973A1.9 1.9 0 1 1 10.206 18.973A7.2 7.2 0 0 1 8.338 18.199A1.9 1.9 0 1 1 5.801 15.662A7.2 7.2 0 0 1 5.027 13.794A1.9 1.9 0 1 1 5.027 10.206A7.2 7.2 0 0 1 5.801 8.338A1.9 1.9 0 1 1 8.338 5.801A7.2 7.2 0 0 1 10.206 5.027Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth={strokeWidth} />
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
