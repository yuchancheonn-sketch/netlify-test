/**
 * 앱 전역에서 쓰는 상수 모음.
 * 앱 이름·기수처럼 나중에 바뀔 수 있는 값은 전부 여기 모아두었으니
 * 이름이 확정되면 이 파일만 고치면 됩니다.
 */

/** 앱 이름 (홈 화면 아이콘·로그인 화면·PWA manifest에 함께 쓰입니다) */
export const APP_NAME = "애기애타 10기";

/** 홈 화면에 추가했을 때 아이콘 아래 표시될 짧은 이름 (12자 이내 권장) */
export const APP_SHORT_NAME = "애기애타10";

/** 과정 공식 명칭 (포스터 기준) */
export const COURSE_FULL_NAME = "2026 도산 애기애타 리더십 과정";

/** 로그인 화면 부제 */
export const APP_TAGLINE = "우리 10기가 함께한 시간이 남는 곳";

/**
 * 애기애타의 정의. 로그인 화면에 명조체로 표시합니다.
 * 배경에 도산 선생 사진이 들어가므로 설명을 덜어내고 뜻만 남겼습니다.
 */
export const APP_DEFINITION_HANJA = "愛己愛他";
export const APP_DEFINITION_TITLE = "애기애타";
export const APP_DEFINITION_BODY = "나를 사랑하고 남을 사랑한다";

/** 이 앱이 담당하는 기수. 가입하는 모든 사용자 문서에 기록됩니다. */
export const COHORT = "10기";

/** 10기 수업 기간 (포스터 기준: 2026년 8월 25일 ~ 11월 24일, 10주) */
export const COURSE_START_DATE = "2026-08-25";
export const COURSE_END_DATE = "2026-11-24";
export const COURSE_TOTAL_SESSIONS = 11;

/** 수업 기록에 적는 주제·강사·느낀점의 길이 제한 */
export const SESSION_TOPIC_MAX_LENGTH = 40;
export const SESSION_INSTRUCTOR_MAX_LENGTH = 20;
/**
 * 느낀점 최대 글자 수.
 * 열한 주차를 한 문서에 모아 담으므로, 넉넉히 잡아도 문서가 6KB를 넘지 않습니다.
 */
export const SESSION_NOTE_MAX_LENGTH = 500;

/** 10기 전체가 쓰는 단체방 ID. 채팅 목록에서 늘 맨 위에 고정됩니다. */
export const MAIN_CHAT_ROOM_ID = "main";

/** 단체방 이름 (채팅 목록과 대화방 제목에 함께 쓰입니다) */
export const MAIN_CHAT_ROOM_TITLE = `${COHORT} 단체방`;

/** 채팅 목록의 미리보기에 보여줄 마지막 메시지 최대 길이 */
export const CHAT_PREVIEW_MAX_LENGTH = 60;

/** 채팅 한 번에 불러올 메시지 개수 */
export const CHAT_PAGE_SIZE = 50;

/**
 * 대화방을 보고 있을 때 "읽음"을 다시 적기까지 기다리는 시간(밀리초).
 *
 * 메시지가 올 때마다 적으면, 단체방에 원우 마흔 명이 들어와 있을 때 메시지
 * 한 통에 쓰기가 마흔 건 나갑니다. 게다가 그 기록이 바뀔 때마다 방마다 걸어둔
 * 안 읽은 개수 구독이 전부 끊겼다 다시 붙어서 읽기까지 함께 늘어납니다.
 * 방을 나갈 때 미뤄둔 몫을 마저 적으므로, 이만큼 묶어도 배지는 정확합니다.
 */
export const MARK_READ_GAP = 8_000;

/**
 * 하단 탭 배지에 표시할 안 읽은 메시지의 최대 개수.
 * 이 수를 넘으면 "99+"로 줄여 보여줍니다. (카카오톡과 같은 방식)
 * 세는 개수에도 상한이 되어, 한참 만에 들어와도 읽기 한도를 크게 쓰지 않습니다.
 */
export const UNREAD_BADGE_MAX = 99;

/**
 * 프로필 사진 한 변의 길이(px).
 *
 * 사진을 Firebase Storage에 올리지 않고 Firestore 문서에 문자열로 담기 때문에
 * 일부러 작게 잡았습니다. 화면에서 가장 크게 보이는 곳이 112px(프로필 화면)이라
 * 고해상도 화면을 감안해도 192px면 충분합니다.
 */
export const PROFILE_IMAGE_SIZE = 192;

/**
 * 프로필 사진 문자열의 최대 크기(바이트).
 *
 * Firestore 문서 하나는 1MiB를 넘을 수 없고, 원우 목록을 불러올 때
 * 모든 사람의 사진을 함께 받아오므로 넉넉잡아 40KB로 제한합니다.
 * (보통 192px 사진은 8~15KB 정도로 나옵니다.)
 */
export const MAX_PROFILE_PHOTO_BYTES = 40_000;

/**
 * 행사 사진을 올릴 때 줄이는 긴 변의 길이(px).
 * "원본 그대로 올리기"를 켜면 이 값을 무시하고 원본을 그대로 보냅니다.
 */
export const PHOTO_MAX_DIMENSION = 2560;

/** 한줄 소개 최대 글자 수 */
export const BIO_MAX_LENGTH = 50;

/**
 * 긴 자기소개 최대 글자 수.
 * 원우 소개 목록을 열 때 모든 원우의 문서를 함께 받아오므로,
 * 너무 길면 목록이 무거워집니다. 40명 기준 500자면 약 40KB입니다.
 */
export const INTRODUCTION_MAX_LENGTH = 500;

/**
 * 별칭 길이 제한.
 * 별칭은 선택 입력이라 최소 길이는 두지 않습니다. 비워두면 이름이 대신 보입니다.
 */
export const NICKNAME_MAX_LENGTH = 15;

/** 회사·직책 길이 제한 (원우수첩 카드 한 줄에 들어가는 정도) */
export const COMPANY_MAX_LENGTH = 40;
export const POSITION_MAX_LENGTH = 20;

/**
 * 원우회 직위 목록.
 * 직위를 고르면 원우수첩 이름 옆에 배지로 표시됩니다.
 * 기수마다 조직이 달라질 수 있으니 여기만 고치면 됩니다.
 */
export const COUNCIL_ROLES = [
  "회장",
  "수석부회장",
  "부회장",
  "총무",
  "서기",
  "재무",
  "홍보",
  "봉사",
  "체육",
  "감사",
  "고문",
] as const;

/**
 * 브랜드 기준색 (PWA theme_color, 주소창 색 등 CSS 밖에서 필요할 때 사용).
 * 앱에서 쓰는 주황은 이 색 하나뿐입니다. 더 진한 주황은 두지 않습니다.
 */
export const BRAND_COLOR = "#FF7210";
/**
 * 앱 배경색 (PWA 스플래시·body 배경).
 * globals.css의 --color-canvas와 항상 같은 값을 유지해 주세요.
 * 다르면 홈 화면에서 앱을 열 때 뜨는 첫 화면 색만 튑니다.
 */
export const BRAND_BACKGROUND = "#F4F5F6";
