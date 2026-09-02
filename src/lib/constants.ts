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
export const COURSE_TOTAL_SESSIONS = 10;

/** 단체 채팅방 ID. Phase 2에서 채널을 여러 개로 늘릴 때 이 값을 목록으로 바꾸면 됩니다. */
export const MAIN_CHAT_ROOM_ID = "main";

/** 채팅 한 번에 불러올 메시지 개수 */
export const CHAT_PAGE_SIZE = 50;

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

/** 별칭 길이 제한 */
export const NICKNAME_MIN_LENGTH = 1;
export const NICKNAME_MAX_LENGTH = 15;

/** 브랜드 기준색 (PWA theme_color, 주소창 색 등 CSS 밖에서 필요할 때 사용) */
export const BRAND_COLOR = "#FF7210";
/** 흰 바탕 위의 주황 글씨에 쓰는 진한 주황 (대비 4.7:1) */
export const BRAND_COLOR_STRONG = "#C25100";
export const BRAND_BACKGROUND = "#FFFAF6";
