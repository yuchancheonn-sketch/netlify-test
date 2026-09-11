/**
 * 홈 바로가기에 쓰는 작은 그림 아이콘.
 *
 * icons.tsx의 선 아이콘은 글씨 색(currentColor)을 따르는 한 가지 색이지만,
 * 이것들은 은행 앱 "추천 서비스"의 그림처럼 색이 여러 개 들어간 그림이라 따로 둡니다.
 * 색은 화면(라이트/다크)을 따르지 않는 고정색입니다 — 어두운 화면에서도 밝은 그림이 그대로 또렷합니다.
 *
 * ★ 그림마다 제 색이 있습니다 (2026-09-11). 처음엔 넷 다 브랜드 주황의 밝기 단계였는데,
 *   한 상자에 나란히 놓이니 단조로워 그림에 어울리는 색으로 나눴습니다.
 *   투표함은 파랑, 말풍선은 초록, 공책은 보라, 역대 투표 클립보드는 청록.
 *   한 그림 안에서는 같은 색의 진하기만 달리 씁니다.
 *   (원우 지도의 누런 지도·빨간 핀 그림은 2026-09-11에 기능과 함께 없앴습니다.)
 */

const BLUE = "#3182F6";
const BLUE_DEEP = "#1B64DA";
const BLUE_LIGHT = "#90C2FF";

const GREEN = "#15B777";
const GREEN_MID = "#7FD9B0";
const GREEN_LIGHT = "#C6F0DC";

const PURPLE = "#7C5CFA";
const PURPLE_MID = "#B8A4FF";
const PURPLE_LIGHT = "#DCD2FF";
const LAVENDER = "#F1EDFF";

const TEAL = "#0FA5A0";
const TEAL_MID = "#62D2CC";
const TEAL_LIGHT = "#B5EDE9";

/** 역대 투표 — 클립보드에 끼운 결과표(길이가 다른 막대 셋) (청록) */
export function PollHistoryIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 클립보드 판 */}
      <rect x="8" y="7" width="32" height="37" rx="4" fill={TEAL_LIGHT} />
      {/* 끼운 종이 */}
      <rect x="12.5" y="12" width="23" height="28" rx="2" fill="#FFFFFF" />
      {/* 위 집게 */}
      <rect x="17" y="4" width="14" height="7.5" rx="2.5" fill={TEAL} />
      <rect x="21.5" y="6.3" width="5" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.8" />
      {/* 결과 막대 — 맨 위가 가장 긴(이긴) 막대 */}
      <rect x="16.5" y="18" width="15" height="3.4" rx="1.7" fill={TEAL} />
      <rect x="16.5" y="24.5" width="9" height="3.4" rx="1.7" fill={TEAL_MID} />
      <rect x="16.5" y="31" width="12" height="3.4" rx="1.7" fill={TEAL_MID} />
    </svg>
  );
}

/** 투표 만들기 — 체크한 투표용지가 투표함 투입구로 들어가는 모습 (파랑) */
export function BallotBoxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 투표함 몸통과 앞면 이름표 */}
      <rect x="8" y="22" width="32" height="20" rx="3" fill={BLUE_LIGHT} />
      <rect x="18" y="29" width="12" height="6" rx="1.5" fill="#FFFFFF" opacity="0.75" />
      {/* 뚜껑 */}
      <rect x="6" y="18" width="36" height="7" rx="2.5" fill={BLUE} />
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
        stroke={BLUE}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 투입구 */}
      <rect x="15" y="20.5" width="18" height="2.2" rx="1.1" fill={BLUE_DEEP} />
    </svg>
  );
}

/** 의견 모으기 — 겹쳐 놓인 말풍선 두 개 (뒤는 적어 둔 글, 앞은 쓰는 중인 "…") (초록) */
export function OpinionIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 뒤 말풍선 — 연한 초록에 글줄 두 줄 */}
      <rect x="4" y="7" width="27" height="20" rx="7" fill={GREEN_LIGHT} />
      <path d="M9.5 25.5 7.5 32l7.5-5.5z" fill={GREEN_LIGHT} />
      <rect x="10" y="13" width="14" height="2.6" rx="1.3" fill={GREEN_MID} />
      <rect x="10" y="18.5" width="9" height="2.6" rx="1.3" fill={GREEN_MID} />
      {/* 앞 말풍선 — 초록에 흰 점 세 개 */}
      <rect x="16" y="17" width="28" height="20" rx="7" fill={GREEN} />
      <path d="M38.5 35.5 40.5 42l-7.5-5.5z" fill={GREEN} />
      <circle cx="23.5" cy="27" r="2.3" fill="#FFFFFF" />
      <circle cx="30" cy="27" r="2.3" fill="#FFFFFF" />
      <circle cx="36.5" cy="27" r="2.3" fill="#FFFFFF" />
    </svg>
  );
}

/** 수업 기록 — 펼친 공책(왼쪽은 필기 줄, 오른쪽은 수업 영상 재생 표시) (보라) */
export function LessonIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* 겉표지 — 펼친 쪽들보다 조금 크게 아래에 깔아 두께를 냅니다 */}
      <path d="M5 14v25.5c7-1 13.5 0 19 3 5.5-3 12-4 19-3V14z" fill={PURPLE_MID} />
      {/* 왼쪽·오른쪽 쪽 */}
      <path d="M24 13c-4.5-3-10.5-4-17-3v26c6.5-1 12.5 0 17 3z" fill={LAVENDER} />
      <path d="M24 13c4.5-3 10.5-4 17-3v26c-6.5-1-12.5 0-17 3z" fill={PURPLE_LIGHT} />
      {/* 가운데 책등 */}
      <path d="M24 13v26" stroke={PURPLE} strokeWidth="2.4" strokeLinecap="round" />
      {/* 왼쪽 필기 줄 */}
      <path
        d="M11 17.5c3.5-.5 6.5 0 9 1.3M11 23c3.5-.5 6.5 0 9 1.3M11 28.5c3.5-.5 6.5 0 9 1.3"
        stroke={PURPLE_MID}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* 오른쪽 재생 표시 — 주차마다 걸어 두는 수업 영상 */}
      <circle cx="32.5" cy="23.5" r="6" fill={PURPLE} />
      <path d="m30.8 20.8 4.4 2.7-4.4 2.7z" fill="#FFFFFF" />
    </svg>
  );
}
