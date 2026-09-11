/**
 * 기수. 원우수첩·홈·자료는 기수마다 따로 보입니다.
 *
 * 값은 "10기"처럼 글자로 저장합니다. 기수 고르기를 넣기 전부터 users 문서에
 * cohort: "10기"가 적혀 있었기 때문에, 그 모양을 그대로 따릅니다.
 */

import { COHORT } from "@/lib/constants";

/** 고를 수 있는 기수 (1기 ~ 10기) */
export const COHORTS: readonly string[] = Array.from(
  { length: 10 },
  (_, index) => `${index + 1}기`,
);

/**
 * 원우수첩 드롭다운에서 "전체"를 뜻하는 값. 기수 값("10기")과 겹치지 않습니다.
 *
 * 2026-09-11에 한 번 없앴다가 같은 날 다시 넣었습니다. 대신 기본은 내 기수이고,
 * "전체"를 일부러 고를 때만 모든 기수를 불러옵니다(hooks.ts의 useCohortMembers·useCohortRoster).
 * 378명 규모에서 한 번 열 때 약 750건을 읽으므로 가입자가 늘면 사용량을 보며 판단합니다.
 */
export const ALL_COHORTS = "all";

/**
 * 대학생 원우가 없었던 기수. 1기·2기 과정에는 대학생 원우가 없었습니다(공식 원우 명단 기준).
 * 3기부터 일반 원우와 대학생 원우가 함께 들어왔습니다.
 */
const COHORTS_WITHOUT_YOUTH: readonly string[] = ["1기", "2기"];

/**
 * 그 기수에 대학생 원우가 있는지 — 없으면 일반/대학생을 가르는 고르개·배지를 보이지 않고,
 * 저장도 늘 일반 원우로 합니다. "전체"나 아직 고르지 않은 값("")은 가를 수 있는 쪽으로 봅니다.
 */
export function hasYouthMembers(cohort: string | null | undefined): boolean {
  return !(cohort && COHORTS_WITHOUT_YOUTH.includes(cohort));
}

/**
 * 원우수첩에서 "원우 추가하기"로 새 이름을 올릴 수 있는 기수인지 — 지금 기수(10기)만.
 *
 * 1기~9기 명단은 공식 원우 명단으로 이미 다 넣었으므로(2026-09-11), 그 수첩에서는
 * 추가 단추를 보이지 않고 추가 시트에서도 고를 수 없게 합니다. 이미 있는 칸을 고치는 것은 그대로입니다.
 * (화면에서 막는 것이지 보안 규칙이 막는 것은 아닙니다 — roster 쓰기는 원우 누구나.)
 */
export function canAddMembers(cohort: string | null | undefined): boolean {
  return cohort === COHORT;
}

/**
 * 저장된 기수 값을 믿을 수 있는 값으로 바꿉니다.
 *
 * 기수를 나누기 전에 만들어진 문서(명단·일정·투표·앨범·파일)에는 기수 칸이
 * 아예 없고, 그때까지 쌓인 것은 모두 10기 것입니다. 그래서 비어 있거나
 * 알아볼 수 없는 값은 10기로 봅니다. Firestore 문서를 일일이 고치지 않아도
 * 되는 이유입니다.
 */
export function cohortOf(value: string | null | undefined): string {
  return value && COHORTS.includes(value) ? value : COHORT;
}

/** 이 문서가 그 기수의 것인지 (기수 칸이 없으면 10기) */
export function inCohort(item: { cohort?: string | null }, cohort: string): boolean {
  return cohortOf(item.cohort) === cohortOf(cohort);
}

/**
 * 수업 기록 문서(sessions/{id})의 id.
 *
 * 수업 기록은 문서 id가 곧 주차라서, 기수를 칸으로 적는 대신 id에 담습니다.
 * 10기는 예전 그대로 "5", 다른 기수는 "3기-5"입니다. 10기 id를 바꾸면
 * 이미 적어둔 주제·영상과 느낀점 댓글(하위 컬렉션)이 통째로 안 보이게 됩니다.
 */
export function sessionDocId(cohort: string, week: number): string {
  const resolved = cohortOf(cohort);
  return resolved === COHORT ? String(week) : `${resolved}-${week}`;
}

/** sessionDocId를 거꾸로 — 알아볼 수 없는 id면 null */
export function parseSessionDocId(id: string): { cohort: string; week: number } | null {
  if (/^\d+$/.test(id)) return { cohort: COHORT, week: Number(id) };
  const match = /^(\d+기)-(\d+)$/.exec(id);
  if (!match || !COHORTS.includes(match[1])) return null;
  return { cohort: match[1], week: Number(match[2]) };
}
