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
  senderNickname: string;
  senderPhotoURL: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: Timestamp | null;
}
