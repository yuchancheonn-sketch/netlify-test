/**
 * 기수. 원우수첩은 기수마다 따로 한 권씩이고, "전체"로 모아 볼 수도 있습니다.
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
 * 저장된 기수 값을 믿을 수 있는 값으로 바꿉니다.
 *
 * 기수 고르기가 생기기 전의 명단(roster)에는 기수 칸이 아예 없고, 그때까지
 * 올라온 사람은 모두 10기입니다. 그래서 비어 있거나 알아볼 수 없는 값은
 * 10기로 봅니다. Firestore 문서를 일일이 고치지 않아도 되는 이유입니다.
 */
export function cohortOf(value: string | null | undefined): string {
  return value && COHORTS.includes(value) ? value : COHORT;
}
