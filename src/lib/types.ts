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
  bio: string;
  role: UserRole;
  status: UserStatus;
  cohort: string;
  /** 가입할 때 사용한 초대 코드 (보안 규칙 검증용) */
  inviteCode: string;
  /** 온보딩(최초 프로필 설정)을 마쳤는지 */
  profileCompleted: boolean;
  createdAt: Timestamp | null;
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
