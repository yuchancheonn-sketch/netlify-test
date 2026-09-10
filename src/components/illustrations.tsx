/**
 * 홈 바로가기에 쓰는 작은 그림 아이콘.
 *
 * icons.tsx의 선 아이콘은 글씨 색(currentColor)을 따르는 한 가지 색이지만,
 * 이것들은 은행 앱 "추천 서비스"의 그림처럼 색이 여러 개 들어간 그림이라 따로 둡니다.
 * 색은 화면(라이트/다크)을 따르지 않는 고정색이고, 브랜드 주황의 밝기 단계만 씁니다 —
 * 어두운 화면에서도 밝은 그림이 그대로 또렷합니다.
 */

const ORANGE = "#FF7210";
const ORANGE_DEEP = "#C25100";
const PEACH = "#FFB066";
const PEACH_LIGHT = "#FFD9B8";
const CREAM = "#FFEFE0";

/** 투표 만들기 — 체크한 투표용지가 투표함 투입구로 들어가는 모습 */
export function BallotBoxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 투표함 몸통과 앞면 이름표 */}
      <rect x="8" y="22" width="32" height="20" rx="3" fill={PEACH} />
      <rect x="18" y="29" width="12" height="6" rx="1.5" fill="#FFFFFF" opacity="0.75" />
      {/* 뚜껑 */}
      <rect x="6" y="18" width="36" height="7" rx="2.5" fill={ORANGE} />
      {/* 투표용지 — 투입구보다 먼저 그려서, 아랫단이 투입구 속으로 들어간 것처럼 보이게 */}
      <rect
        x="17.5"
        y="5"
        width="13"
        height="17"
        rx="2"
        fill="#FFFFFF"
        stroke="#E7E5E4"
        strokeWidth="1.2"
      />
      <path
        d="m20.6 13.2 2.6 2.6 4.6-5.2"
        stroke={ORANGE}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 투입구 */}
      <rect x="15" y="20.5" width="18" height="2.2" rx="1.1" fill={ORANGE_DEEP} />
    </svg>
  );
}

/** 의견 모으기 — 겹쳐 놓인 말풍선 두 개 (뒤는 적어 둔 글, 앞은 쓰는 중인 "…") */
export function OpinionIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 뒤 말풍선 — 연한 살구색에 글줄 두 줄 */}
      <rect x="4" y="7" width="27" height="20" rx="7" fill={PEACH_LIGHT} />
      <path d="M9.5 25.5 7.5 32l7.5-5.5z" fill={PEACH_LIGHT} />
      <rect x="10" y="13" width="14" height="2.6" rx="1.3" fill={PEACH} />
      <rect x="10" y="18.5" width="9" height="2.6" rx="1.3" fill={PEACH} />
      {/* 앞 말풍선 — 주황에 흰 점 세 개 */}
      <rect x="16" y="17" width="28" height="20" rx="7" fill={ORANGE} />
      <path d="M38.5 35.5 40.5 42l-7.5-5.5z" fill={ORANGE} />
      <circle cx="23.5" cy="27" r="2.3" fill="#FFFFFF" />
      <circle cx="30" cy="27" r="2.3" fill="#FFFFFF" />
      <circle cx="36.5" cy="27" r="2.3" fill="#FFFFFF" />
    </svg>
  );
}

/** 원우 지도 — 세 번 접은 지도 위에 꽂힌 위치 핀 */
export function MapIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 접힌 지도 세 쪽 — 가운데만 밝게 해서 접힌 결이 보이게 */}
      <path d="M5 15 17 11v28L5 43z" fill={PEACH_LIGHT} />
      <path d="m17 11 14 4v28l-14-4z" fill={CREAM} />
      <path d="m31 15 12-4v28l-12 4z" fill={PEACH_LIGHT} />
      {/* 지도 위 점선 길 */}
      <path
        d="M9 35c4-3 7 1 11-2s7-6 12-3"
        stroke={PEACH}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="0.1 3.4"
      />
      {/* 핀 그림자와 핀 */}
      <ellipse cx="29" cy="35.5" rx="5" ry="1.6" fill={ORANGE_DEEP} opacity="0.25" />
      <path
        d="M29 6c-5.8 0-10.5 4.5-10.5 10.1 0 7 10.5 18.4 10.5 18.4s10.5-11.4 10.5-18.4C39.5 10.5 34.8 6 29 6z"
        fill={ORANGE}
      />
      <circle cx="29" cy="16" r="3.8" fill="#FFFFFF" />
    </svg>
  );
}
