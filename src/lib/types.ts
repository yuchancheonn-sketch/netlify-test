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
  /** 카드에 미리보기로 뜨는 한 줄 소개 */
  bio: string;
  /** 상세에서 보이는 긴 자기소개 (본인이 직접 씁니다) */
  introduction: string;
  /** 본인 소개 영상 주소 (유튜브·비메오). 없으면 빈 문자열 */
  introVideoUrl: string;
  role: UserRole;
  status: UserStatus;
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
  bio?: string;
  /** 입학식 자기소개 영상처럼, 계정이 없어도 걸어둘 수 있는 소개 영상 */
  introVideoUrl?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
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
}

/**
 * sessions/{week} — 주차별 수업 정보 (주제·강사).
 *
 * 원우수첩처럼 **누구나 채울 수 있는 공용 기록**입니다. 한 명이 적어두면
 * 모든 원우가 같은 내용을 봅니다. 수업 주제와 강사는 사실이라 사람마다
 * 다를 이유가 없습니다.
 * 문서 id는 주차 번호를 적은 글자입니다. ("1" ~ "11")
 */
export interface SessionDoc {
  week: number;
  topic: string;
  instructor: string;
  /** 마지막으로 채운 사람 (원우수첩과 같은 방식으로 남겨둡니다) */
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp | null;
}

/**
 * sessionNotes/{uid} — 내가 주차별로 남긴 느낀점.
 *
 * **본인만 읽고 씁니다.** 수업을 듣고 스스로 남기는 기록이라 남에게 보이면
 * 안 됩니다. 주차마다 문서를 따로 두지 않고 한 문서에 모아 담습니다.
 * 열한 칸뿐이라 한 번만 읽으면 되고, 무료 한도의 읽기 횟수도 아낍니다.
 */
export interface SessionNotesDoc {
  /** 주차 번호를 적은 글자 → 그 주에 남긴 느낀점 */
  notes?: Record<string, string>;
}

/**
 * chatRooms/{roomId} — 대화방 한 칸.
 *
 * 방은 두 종류입니다.
 *  - group: 10기 전체가 함께 쓰는 단체방. 지금은 "main" 하나뿐입니다.
 *  - direct: 원우 두 명만의 1:1 대화.
 *
 * 마지막 메시지를 방 문서에 적어 두는 이유는, 채팅 목록에서 방마다
 * 메시지를 뒤지지 않고 방 문서만 읽어 미리보기를 그리기 위해서입니다.
 */
export interface ChatRoomDoc {
  id: string;
  kind: "group" | "direct";
  /** 단체방 이름. 1:1 방은 상대 이름을 화면에서 만들어 쓰므로 비어 있습니다. */
  title: string;
  /** 이 방에 들어올 수 있는 사람. 단체방은 모두가 들어오므로 비어 있습니다. */
  memberUids: string[];
  /** 목록에 보여줄 마지막 메시지 미리보기 */
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp | null;
}

/**
 * chatReads/{uid} — 내가 각 방을 마지막으로 본 시각.
 *
 * 하단 탭의 안 읽은 개수 배지가 이 시각을 기준으로 셉니다.
 * users 문서에 넣지 않고 따로 둔 이유는, users 문서에는 프로필 사진이
 * 통째로 들어 있어서 값 하나를 고칠 때마다 그 큰 문서가 모두에게 다시
 * 내려가기 때문입니다. 이 문서는 시각 몇 개뿐이라 아주 가볍습니다.
 */
export interface ChatReadDoc {
  /** 방 id → 그 방을 마지막으로 본 시각 */
  rooms?: Record<string, Timestamp | null>;
  /**
   * 방이 단체방 하나뿐이던 시절에 쓰던 자리.
   * 예전에 읽은 기록이 남아 있는 원우를 위해 단체방 기준으로 계속 읽습니다.
   */
  lastReadAt?: Timestamp | null;
}
