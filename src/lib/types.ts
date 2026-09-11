import type { Timestamp } from "firebase/firestore";

/** 원우 구분 */
export type MemberType = "general" | "youth";

/** 권한 */
export type UserRole = "member" | "admin";

/** 가입 상태 */
export type UserStatus = "pending" | "approved";

/** 참석 여부 */
export type RsvpStatus = "attending" | "notAttending" | "undecided";

/** users/{uid} */
export interface UserDoc {
  uid: string;
  email: string;
  /** 실명 */
  name: string;
  /** 앱에서 다른 원우들에게 보이는 별칭 */
  nickname: string;
  photoURL: string | null;
  /** "MM-DD" 형식. 예: "03-21" */
  birthdayMonthDay: string;
  /** 태어난 연도 (선택 입력) */
  birthdayYear: number | null;
  /** 연도를 다른 원우에게 공개할지 여부 */
  birthdayYearPublic: boolean;
  memberType: MemberType;
  /** 소속 회사·기관. 원우수첩 카드에 이름 아래로 보입니다. */
  company: string;
  /** 직책. 예: 대표, 본부장 */
  position: string;
  /** 휴대폰 번호. 상세에서만 보이고 눌러서 바로 걸 수 있습니다. */
  phone: string;
  /** 원우회 직위. 고르지 않았으면 빈 문자열 */
  councilRole: string;
  /**
   * 예전 한 줄 소개 — 이제 입력칸이 없습니다. 먼저 써 둔 원우의 문서에만 남아 있고,
   * 자기소개가 비어 있으면 대신 보여줍니다. 본인이 프로필을 저장하면 지워집니다.
   */
  bio?: string;
  /** 상세에서 보이는 자기소개 (본인이 직접 씁니다) */
  introduction: string;
  /** 본인 소개 영상 주소 (유튜브·비메오). 없으면 빈 문자열 */
  introVideoUrl: string;
  role: UserRole;
  status: UserStatus;
  /**
   * 기수 ("1기" ~ "10기"). 최초 프로필 설정에서 꼭 고르고, 내 프로필에서 바꿉니다.
   * 가입 직후에는 빈 문자열이고, 읽을 때는 lib/cohort.ts의 cohortOf를 거칩니다.
   */
  cohort: string;
  /** 가입할 때 사용한 초대 코드 (보안 규칙 검증용) */
  inviteCode: string;
  /** 온보딩(최초 프로필 설정)을 마쳤는지 */
  profileCompleted: boolean;
  createdAt: Timestamp | null;
  /**
   * 이 수첩 항목을 마지막으로 정리한 사람.
   * 원우끼리 서로 채워줄 수 있어서, 누가 손댔는지 남겨둡니다.
   * 예전에 만들어진 문서에는 없을 수 있습니다.
   */
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

/**
 * roster/{rosterId} — 운영진이 미리 등록해 두는 원우 명단.
 *
 * 앱은 Google 계정으로만 가입할 수 있어서 운영진이 남의 계정을 대신 만들 수는 없습니다.
 * 그래서 "이름만 먼저 올려두고", 그 사람이 직접 가입해 승인되는 순간
 * linkedUid로 실제 계정과 이어 붙이는 방식을 씁니다.
 * 아직 가입하지 않은 사람도 원우 소개에서 이름만은 볼 수 있습니다.
 */
export interface RosterDoc {
  id: string;
  name: string;
  /**
   * 기수 ("10기"). 기수 고르기를 넣기 전에 올라온 명단에는 이 칸이 없고,
   * 그건 모두 10기로 봅니다 — lib/cohort.ts의 cohortOf.
   */
  cohort?: string;
  memberType: MemberType;
  /** 연결된 실제 계정의 uid. 아직 가입 전이면 null */
  linkedUid: string | null;
  /** 운영진 메모 (예: 소속, 연락처 힌트) */
  note: string;
  createdBy: string;
  createdAt: Timestamp | null;
  /*
   * 아직 가입하지 않은 원우의 수첩 정보.
   * 원우들이 서로 채워줄 수 있어서, 계정이 없어도 수첩은 완성됩니다.
   * 본인이 가입하면 그때부터는 users 문서의 값이 우선합니다.
   */
  company?: string;
  position?: string;
  phone?: string;
  councilRole?: string;
  /** 예전 한 줄 소개 — 이제 입력칸이 없고, 상세에서 자기소개 자리에 보여줍니다. */
  bio?: string;
  /** 입학식 자기소개 영상처럼, 계정이 없어도 걸어둘 수 있는 소개 영상 */
  introVideoUrl?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

/**
 * memberRegions/{uid} — 원우 지도(홈)에 찍히는 "사는 시·도" 한 줄.
 *
 * ★ 정확한 위치(위도·경도)는 어디에도 저장하지 않습니다. 폰이 위치를 한 번 읽어
 *   그 자리에서 시·도를 가려낸 뒤 좌표는 버리고, 여기에는 "부산" 같은 이름만 남습니다.
 *
 * users 문서에 두지 않고 따로 뺀 이유: 홈은 원우 목록(users)을 읽지 않습니다.
 * users 문서에는 프로필 사진이 통째로 들어 있어, 홈을 열 때마다 전원의 사진을
 * 내려받게 되면 무료 전송량이 가장 먼저 바닥납니다. 여기는 한 줄짜리라 가볍습니다.
 * 문서 id가 곧 본인 uid라, 본인만 쓰고 지울 수 있습니다(보안 규칙).
 */
export interface MemberRegionDoc {
  uid: string;
  /** "서울" … "제주", 또는 "해외" — lib/regions.ts의 REGION_KEYS */
  region: string;
  /** 지도를 기수별로 거르려고 함께 적어 둡니다. 프로필에서 기수를 바꾸면 따라 고칩니다. */
  cohort: string;
  /** 지역을 눌렀을 때 보이는 이름. 프로필에서 이름을 바꾸면 따라 고칩니다. */
  name: string;
  updatedAt: Timestamp | null;
}

/**
 * companyIntros/{uid} — 홈 "원우 회사" 카드에 원우가 직접 올리는 자기 회사 한 장.
 *
 * 원우끼리 서로의 회사를 알리는 자리입니다. 돈을 받는 광고가 아니라 본인이 올리는 소개입니다.
 * 수첩의 회사(users.company)와 따로 두는 이유는 memberRegions와 같습니다 — 홈이 users를 읽지 않게.
 * 문서 id가 곧 본인 uid라, 본인만 쓰고 지울 수 있습니다(보안 규칙).
 */
export interface CompanyIntroDoc {
  uid: string;
  /** 회사 이름. 처음 올릴 때 수첩의 회사로 채워 두고 고쳐 쓸 수 있습니다. */
  company: string;
  /** 한 줄 소개 — 무엇을 하는 회사인지. 없으면 빈 문자열 */
  intro: string;
  /** 홈페이지 주소. 없으면 빈 문자열이고, 있으면 늘 http(s)://로 시작합니다(lib/company-intros.ts). */
  url: string;
  /** 카드 아래 "이름 · 직책". 프로필에서 바꾸면 따라 고칩니다. */
  name: string;
  position: string;
  /** 카드를 기수별로 거르려고 함께 적어 둡니다. */
  cohort: string;
  updatedAt: Timestamp | null;
}

/** events/{eventId} */
export interface EventDoc {
  id: string;
  title: string;
  /** "YYYY-MM-DD" 형식 */
  date: string;
  /** "HH:mm" 형식 */
  startTime: string;
  /** "HH:mm" 형식, 없으면 빈 문자열 */
  endTime: string;
  location: string;
  description: string;
  /** 기수 ("10기"). 이 칸이 없는 예전 일정은 10기로 봅니다 — lib/cohort.ts */
  cohort?: string;
  createdBy: string;
  createdAt: Timestamp | null;
}

/** events/{eventId}/rsvps/{uid} */
export interface RsvpDoc {
  uid: string;
  status: RsvpStatus;
  updatedAt: Timestamp | null;
}

/** photoAlbums/{albumId} — 행사 단위로 사진을 묶는 앨범 */
export interface PhotoAlbumDoc {
  id: string;
  title: string;
  /** "YYYY-MM-DD" 형식 */
  eventDate: string;
  /** 목록에 보여줄 대표 이미지. 첫 사진이 올라오면 자동으로 채워집니다. */
  coverImageUrl: string | null;
  photoCount: number;
  /** 기수 ("10기"). 이 칸이 없는 예전 앨범은 10기로 봅니다 — lib/cohort.ts */
  cohort?: string;
  createdBy: string;
  createdAt: Timestamp | null;
}

/** photoAlbums/{albumId}/photos/{photoId} */
export interface PhotoDoc {
  id: string;
  /** Cloudinary 원본 주소 */
  imageUrl: string;
  /** Cloudinary 식별자. 나중에 보관소를 정리할 때 씁니다. */
  publicId: string;
  width: number;
  height: number;
  caption: string;
  uploadedBy: string;
  uploadedByNickname: string;
  uploadedAt: Timestamp | null;
  likes: string[];
}

/**
 * polls/{pollId} — 원우 누구나 열 수 있는 투표.
 *
 * 운영진 전용이 아닙니다. 모임 날짜를 고르거나 안건에 찬반을 묻는 일은
 * 원우회 임원 누구에게나 생기는 일이라, 일정 등록과 달리 문을 열어 두었습니다.
 */
export interface PollDoc {
  id: string;
  /**
   * 무엇을 모으는 자리인지.
   *  - vote: 고를 것을 미리 정해 두고 표를 셉니다.
   *  - opinion: 정해진 답 없이 글을 **익명으로** 모읍니다.
   *
   * 이 칸이 없는 옛 문서는 vote로 봅니다 (투표가 먼저 있었습니다).
   */
  kind?: "vote" | "opinion";
  /** 물어보는 것. 홈 카드의 네모 안에 그대로 들어갑니다. */
  question: string;
  /** 고를 수 있는 것들 (2~4개). 표는 이 배열의 자리(index)로 셉니다. */
  options: string[];
  /** 기수 ("10기"). 이 칸이 없는 예전 투표는 10기로 봅니다 — lib/cohort.ts */
  cohort?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
  /**
   * 닫힌 투표인지.
   *
   * 닫으면 결과만 남고 더는 고칠 수 없습니다. 지우지 않고 닫는 길을 둔 것은,
   * 지나간 투표의 결과가 남아 있어야 나중에 "그때 뭘로 정했더라"를 볼 수 있어서입니다.
   * 홈 카드에는 열려 있는 것만 올라옵니다.
   */
  closed: boolean;
}

/**
 * polls/{pollId}/votes/{uid} — 한 사람이 한 표.
 *
 * 문서 id가 곧 투표한 사람의 uid입니다. 그래서 **한 사람이 두 표를 넣을 수
 * 없습니다** — 다시 고르면 같은 문서를 덮어씁니다. 규칙에서 문서를 읽지 않고
 * id만 보고 본인인지 가릴 수 있는 것도 같은 이유입니다(1:1 방 id와 같은 수법).
 */
export interface PollVoteDoc {
  uid: string;
  /** options 배열에서 고른 자리 */
  optionIndex: number;
  votedAt: Timestamp | null;
}

/**
 * polls/{pollId}/opinions/{자동id} — 익명으로 모은 의견 한 줄.
 *
 * ★ 누가 썼는지 **아무 데도 적지 않습니다.** uid도 이름도 없고, 문서 id마저
 *   자동으로 만든 값이라 여기서 사람을 되짚을 길이 없습니다. 운영진이 콘솔을
 *   열어도 마찬가지입니다.
 *
 *   표(votes)와 정반대인 점이 여기입니다. 표는 문서 id가 곧 uid라 누가 무엇을
 *   골랐는지 서로 압니다 — 작은 모임의 투표라 그렇게 두었습니다. 하지만 의견은
 *   이름이 붙는 순간 하고 싶은 말을 못 하게 되므로 반대로 설계했습니다.
 *
 *   보안 규칙이 text와 createdAt 말고는 **어떤 칸도 못 넣게** 막고 있어서,
 *   이 익명성은 약속이 아니라 구조로 지켜집니다. 앱을 고쳐 uid를 몰래 끼워
 *   넣으려 해도 규칙이 그 쓰기를 거절합니다.
 *
 * 대신 잃는 것도 분명합니다 — 내가 쓴 글을 나중에 골라 지울 수 없습니다.
 * 어느 것이 내 것인지 앱도 모르기 때문입니다. 지우는 것은 의견을 모은 사람과
 * 운영진만 할 수 있습니다.
 */
export interface OpinionDoc {
  id: string;
  text: string;
  createdAt: Timestamp | null;
}

/**
 * files/{fileId} — 자료 탭에 올리는 문서 파일 (PDF·한글·엑셀 등).
 *
 * 행사 사진(photoAlbums)과 나눠 둔 이유는 쓰임새가 달라서입니다. 사진은
 * 행사별로 묶어 보고, 파일은 최근에 올라온 것부터 훑어 내려받습니다.
 * 실물은 둘 다 Cloudinary에 있고 Firestore에는 주소만 담습니다.
 */
export interface FileDoc {
  id: string;
  /** 올린 사람이 쓰던 원래 파일 이름. 화면에 그대로 보여줍니다. */
  name: string;
  /** Cloudinary 주소 */
  url: string;
  /** Cloudinary 안에서의 식별자. 나중에 보관소를 정리할 때 씁니다. */
  publicId: string;
  /**
   * 확장자 (pdf, hwp, xlsx …).
   * Cloudinary가 알려주지 않는 파일도 있어서, 그럴 때는 파일 이름에서 뽑습니다.
   */
  format: string;
  bytes: number;
  /** 기수 ("10기"). 이 칸이 없는 예전 파일은 10기로 봅니다 — lib/cohort.ts */
  cohort?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp | null;
}

/** chatRooms/{roomId}/messages/{messageId} */
export interface MessageDoc {
  id: string;
  senderId: string;
  /**
   * 보낸 사람의 본명. 보낼 때 함께 적어 둡니다.
   * 다만 화면에는 users 문서의 최신 이름을 먼저 쓰고, 그 사람을 못 찾을 때만
   * 이 값을 씁니다. (이름을 고쳐도 예전 메시지까지 같이 바뀌도록)
   */
  senderName: string;
  /**
   * 별칭을 적어 두던 예전 자리.
   * 본명으로 바꾸기 전에 쌓인 메시지에는 이 값밖에 없어서 아직 읽습니다.
   */
  senderNickname?: string;
  /**
   * 보낸 사람 사진을 메시지마다 복사해 두던 예전 자리.
   *
   * 프로필 사진이 문서 안에 글자로 박히는 구조(data URL, 10~15KB)라
   * 메시지 하나가 수십 배로 무거워져서 더는 넣지 않습니다.
   * 화면에는 users 문서의 사진을 붙이고, 이 값은 예전 메시지에만 남아 있습니다.
   */
  senderPhotoURL?: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: Timestamp | null;
  /**
   * 마지막으로 고친 시각. 한 번도 안 고쳤으면 없습니다.
   *
   * 있기만 하면 말풍선에 "수정됨"을 붙입니다. 고친 흔적을 남기지 않으면
   * 하지도 않은 말을 한 것처럼 만들 수 있어서, 값 자체보다 **있다는 사실**이
   * 중요합니다. 언제 고쳤는지까지 보여주지는 않습니다.
   */
  editedAt?: Timestamp | null;
}

/**
 * sessions/{week} — 주차별 수업 정보 (주제·강사).
 *
 * 원우수첩처럼 **누구나 채울 수 있는 공용 기록**입니다. 한 명이 적어두면
 * 모든 원우가 같은 내용을 봅니다. 수업 주제와 강사는 사실이라 사람마다
 * 다를 이유가 없습니다.
 * 문서 id는 주차 번호를 적은 글자입니다. ("1" ~ "11")
 */
/**
 * 한 주 수업은 1교시·2교시로 나뉩니다.
 * 영상도 느낀점도 교시마다 따로 답니다.
 */
export type SessionPeriod = 1 | 2;

export interface SessionDoc {
  week: number;
  topic: string;
  instructor: string;
  /**
   * 1교시 영상 주소 (유튜브·비메오). 없으면 빈 글자.
   *
   * 이름에 1이 안 붙은 것은 교시를 나누기 전에 쓰던 필드를 그대로
   * 이어받았기 때문입니다. videoUrl1로 바꾸면 이미 적어둔 주의 영상이
   * 통째로 사라지므로(Firestore는 이름이 곧 값의 자리입니다) 그냥 둡니다.
   */
  videoUrl?: string;
  /** 2교시 영상 주소. 교시를 나누면서 새로 생긴 자리입니다. */
  videoUrl2?: string;
  /**
   * 그 주에 달린 댓글 수.
   *
   * 홈의 수업 기록 줄에 "댓글 3"을 보여주려고 둡니다. 이게 없으면 줄마다
   * 댓글을 세어야 해서, 홈을 열 때마다 열 주치 댓글을 전부 읽게 됩니다.
   * 댓글을 쓰고 지울 때 increment로 함께 올리고 내립니다.
   */
  commentCount?: number;
  /** 마지막으로 채운 사람 (원우수첩과 같은 방식으로 남겨둡니다) */
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

/**
 * sessions/{week}/comments/{commentId} — 그 주 수업에 남기는 느낀점.
 *
 * 예전에는 본인만 보는 개인 기록(sessionNotes)이었는데, 서로 무엇을 느꼈는지
 * 나누자는 취지로 **모두에게 보이는 댓글**로 바꿨습니다.
 *
 * 답글은 한 겹만 둡니다. 답글에 다시 답글을 달면 그것도 같은 원 댓글에
 * 매답니다(parentId가 늘 맨 위 댓글을 가리킵니다). 두 겹, 세 겹으로 들어가면
 * 폰 화면에서 글이 오른쪽으로 밀려 읽기 어려워집니다. 인스타·유튜브도
 * 같은 방식입니다.
 */
export interface SessionCommentDoc {
  id: string;
  text: string;
  authorId: string;
  /** 쓴 사람 본명. 화면에는 users 문서의 최신 이름을 먼저 씁니다. */
  authorName: string;
  /** 답글이면 원 댓글의 id, 맨 위 댓글이면 null */
  parentId: string | null;
  /**
   * 몇 교시에 남긴 느낀점인지.
   *
   * 교시를 나누기 전에 달린 댓글에는 이 값이 없습니다. 그런 글은 1교시로
   * 봅니다 — 예전 댓글이 어디에도 안 보이게 되는 것보다 낫고, 그 시절
   * 수업은 어차피 하나였습니다. (읽을 때는 commentPeriod()를 쓰세요)
   */
  period?: SessionPeriod;
  createdAt: Timestamp | null;
}

/**
 * pushTokens/{token} — 웹 푸시 알림을 받을 기기 한 대.
 *
 * 문서 id가 곧 FCM 등록 토큰입니다. 한 원우가 폰·태블릿 여러 대에서 켜면
 * 그 수만큼 문서가 생깁니다. 토큰은 브라우저를 지우거나 오래 안 쓰면
 * 만료되므로, 서버가 발송하다 "없는 토큰" 응답을 받으면 그 문서를 지웁니다.
 *
 * **클라이언트는 이 컬렉션을 읽지 못합니다.** 남의 기기 목록이 보이면
 * 안 되고, 발송은 서버(Admin SDK)가 규칙을 건너뛰고 훑습니다.
 */
export interface PushTokenDoc {
  /** 이 기기를 켠 원우의 uid */
  uid: string;
  /** 어느 기기·브라우저인지 (navigator.userAgent). 목록에서 사람이 알아보라고 남깁니다. */
  userAgent: string;
  createdAt: Timestamp | null;
  /** 앱을 열 때마다 갱신합니다. 오래된 토큰을 골라내는 기준이 됩니다. */
  refreshedAt: Timestamp | null;
}

/**
 * chatRooms/{roomId} — 대화방 한 칸.
 *
 * 지금은 원우 두 명만의 1:1 대화(direct)뿐입니다.
 * group은 2026-09-10에 없앤 단체방("main")의 흔적입니다. 그 문서가 Firestore에
 * 남아 있을 수 있어 타입에 남겨 두었고, 화면에는 올리지 않습니다.
 *
 * 마지막 메시지를 방 문서에 적어 두는 이유는, 채팅 목록에서 방마다
 * 메시지를 뒤지지 않고 방 문서만 읽어 미리보기를 그리기 위해서입니다.
 */
export interface ChatRoomDoc {
  id: string;
  kind: "group" | "direct";
  /** 예전 단체방 이름 자리. 1:1 방은 상대 이름을 화면에서 만들어 쓰므로 비어 있습니다. */
  title: string;
  /** 이 방의 두 사람. 채팅 목록이 이 값으로 내 방을 찾습니다. */
  memberUids: string[];
  /** 목록에 보여줄 마지막 메시지 미리보기 */
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp | null;
}

/**
 * chatReads/{uid} — 내가 각 방을 마지막으로 본 시각.
 *
 * 새 메시지를 알리는 빨간 점이 이 시각을 기준으로 켜집니다 —
 * 방 문서의 lastMessageAt이 이 시각보다 뒤면 안 읽은 것으로 봅니다.
 * users 문서에 넣지 않고 따로 둔 이유는, users 문서에는 프로필 사진이
 * 통째로 들어 있어서 값 하나를 고칠 때마다 그 큰 문서가 모두에게 다시
 * 내려가기 때문입니다. 이 문서는 시각 몇 개뿐이라 아주 가볍습니다.
 */
export interface ChatReadDoc {
  /** 방 id → 그 방을 마지막으로 본 시각 */
  rooms?: Record<string, Timestamp | null>;
}
