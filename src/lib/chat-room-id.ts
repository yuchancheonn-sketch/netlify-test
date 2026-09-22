/**
 * 대화방 id를 읽고 만드는 순수 함수들.
 *
 * ★ 이 파일에는 "use client"가 없습니다 — 일부러입니다.
 *   같은 규칙을 앱(브라우저)과 서버 라우트(/api/push/chat)가 함께 써야 하는데,
 *   lib/chat-rooms.ts는 Firestore 클라이언트 SDK를 쓰는 "use client" 모듈이라
 *   서버에서 불러올 수 없습니다. 그래서 id 규칙만 여기로 뺐습니다.
 *   방을 만들고 읽는 일은 그대로 lib/chat-rooms.ts에 있고, 거기서 이 파일을 다시 내보냅니다.
 *
 * 방 id는 두 모양입니다.
 *   1:1 방      두 uid를 정렬해 "__"로 이은 것 (abc123__xyz789)
 *   기수 단체방  "cohort-" 뒤에 기수 숫자 (cohort-10)
 */

import { COHORTS, cohortOf } from "@/lib/cohort";

/** 1:1 방 id에서 두 사람의 uid를 잇는 글자. uid에는 쓰이지 않는 모양으로 골랐습니다. */
export const DIRECT_SEPARATOR = "__";

/**
 * 기수 단체방 id의 머리말. "10기" → "cohort-10".
 *
 * ★ 한글("10기")을 id에 넣지 않는 이유
 *   방 id가 그대로 주소가 됩니다(/chat/{roomId}). 한글은 주소에서 %EA%B8%B0처럼
 *   부호로 바뀌어, 로그·공유 링크·보안 규칙의 글자 비교가 모두 지저분해집니다.
 *   숫자만 담고 "기"는 읽을 때 붙입니다.
 *
 * ★ 이 모양을 바꾸면 firestore.rules의 isCohortRoom도 같이 고쳐야 합니다.
 *   규칙이 같은 모양을 정규식으로 확인합니다.
 */
const COHORT_ROOM_PREFIX = "cohort-";

/** "10기" → "cohort-10". 알아볼 수 없는 기수는 기본 기수로 바뀝니다(cohortOf). */
export function cohortRoomId(cohort: string): string {
  return `${COHORT_ROOM_PREFIX}${cohortOf(cohort).replace("기", "")}`;
}

/** "cohort-10" → "10기". 기수 단체방 id가 아니면 null. */
export function cohortOfRoomId(roomId: string): string | null {
  if (!roomId.startsWith(COHORT_ROOM_PREFIX)) return null;
  const cohort = `${roomId.slice(COHORT_ROOM_PREFIX.length)}기`;
  return COHORTS.includes(cohort) ? cohort : null;
}

/** 기수 단체방 id인지 */
export function isCohortRoomId(roomId: string): boolean {
  return cohortOfRoomId(roomId) !== null;
}

/** 기수 단체방에 보여줄 이름. "10기 단체 대화방" */
export function cohortRoomTitle(cohort: string): string {
  return `${cohortOf(cohort)} 단체 대화방`;
}

/**
 * 1:1 방에서 나 말고 상대의 uid.
 * 1:1 방 모양이 아니거나(기수 단체방, 예전 단체방 "main" 등) 내가 낀 방이 아니면 null.
 */
export function otherUidOf(roomId: string, myUid: string): string | null {
  const uids = roomId.split(DIRECT_SEPARATOR);
  if (uids.length !== 2 || !uids.includes(myUid)) return null;
  const other = uids.find((uid) => uid !== myUid);
  return other ?? null;
}

/**
 * 두 원우의 1:1 방 id.
 *
 * 누가 먼저 말을 걸든 같은 id가 나오도록 uid를 정렬해 붙입니다. 그래야
 *  - 방을 찾으려고 따로 조회할 필요가 없고,
 *  - 같은 상대와 방이 두 개 생기는 일이 없습니다.
 */
export function directRoomId(a: string, b: string): string {
  return [a, b].sort().join(DIRECT_SEPARATOR);
}
