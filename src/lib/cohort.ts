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

/** 원우수첩 드롭다운에서 "전체"를 뜻하는 값. 기수 값("10기")과 겹치지 않습니다. */
export const ALL_COHORTS = "all";

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
