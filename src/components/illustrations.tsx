/**
 * 홈 바로가기에 쓰는 작은 그림 아이콘.
 *
 * icons.tsx의 선 아이콘은 글씨 색(currentColor)을 따르는 한 가지 색이지만,
 * 이것들은 은행 앱 "추천 서비스"의 그림처럼 색이 여러 개 들어간 그림이라 따로 둡니다.
 * 색은 화면(라이트/다크)을 따르지 않는 고정색이고, 브랜드 주황의 밝기 단계만 씁니다 —
 * 어두운 화면에서도 밝은 그림이 그대로 또렷합니다.
 *
 * ★ 색의 역사 (모두 2026-09-11)
 *   처음엔 넷 다 주황 단계였다가, 그림마다 제 색(파랑·초록·보라·청록)으로 나눴고,
 *   사용자 요청으로 다시 주황 계열로 모았습니다. 홈의 D-day 카드·일정 날짜 칸이
 *   주황으로 꽉 차면서, 바로가기까지 여러 색이면 홈이 어수선해 보인다는 판단입니다.
 *   한 그림 안에서 주황의 진하기(ORANGE → PEACH → CREAM)로 앞뒤를 가릅니다.
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

/** 수업 기록 — 펼친 공책(왼쪽은 필기 줄, 오른쪽은 수업 영상 재생 표시) */
export function LessonIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 겉표지 — 펼친 쪽들보다 조금 크게 아래에 깔아 두께를 냅니다 */}
      <path d="M5 14v25.5c7-1 13.5 0 19 3 5.5-3 12-4 19-3V14z" fill={PEACH} />
      {/* 왼쪽·오른쪽 쪽 */}
      <path d="M24 13c-4.5-3-10.5-4-17-3v26c6.5-1 12.5 0 17 3z" fill={CREAM} />
      <path d="M24 13c4.5-3 10.5-4 17-3v26c-6.5-1-12.5 0-17 3z" fill={PEACH_LIGHT} />
      {/* 가운데 책등 */}
      <path d="M24 13v26" stroke={ORANGE} strokeWidth="2.4" strokeLinecap="round" />
      {/* 왼쪽 필기 줄 */}
      <path
        d="M11 17.5c3.5-.5 6.5 0 9 1.3M11 23c3.5-.5 6.5 0 9 1.3M11 28.5c3.5-.5 6.5 0 9 1.3"
        stroke={PEACH}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* 오른쪽 재생 표시 — 주차마다 걸어 두는 수업 영상 */}
      <circle cx="32.5" cy="23.5" r="6" fill={ORANGE} />
      <path d="m30.8 20.8 4.4 2.7-4.4 2.7z" fill="#FFFFFF" />
    </svg>
  );
}

/** 역대 투표 — 클립보드에 끼운 결과표(길이가 다른 막대 셋) */
export function PollHistoryIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 클립보드 판 */}
      <rect x="8" y="7" width="32" height="37" rx="4" fill={PEACH_LIGHT} />
      {/* 끼운 종이 */}
      <rect x="12.5" y="12" width="23" height="28" rx="2" fill="#FFFFFF" />
      {/* 위 집게 */}
      <rect x="17" y="4" width="14" height="7.5" rx="2.5" fill={ORANGE} />
      <rect x="21.5" y="6.3" width="5" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.8" />
      {/* 결과 막대 — 맨 위가 가장 긴(이긴) 막대 */}
      <rect x="16.5" y="18" width="15" height="3.4" rx="1.7" fill={ORANGE} />
      <rect x="16.5" y="24.5" width="9" height="3.4" rx="1.7" fill={PEACH} />
      <rect x="16.5" y="31" width="12" height="3.4" rx="1.7" fill={PEACH} />
    </svg>
  );
}
