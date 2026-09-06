/**
 * 주차별 수업을 교시로 나눠 다루는 자잘한 일들.
 *
 * 한 주 수업은 1교시·2교시 둘입니다. 영상도 느낀점도 교시마다 따로 답니다.
 * 화면 세 곳(수업 화면 · 수정 시트 · 느낀점)이 같은 규칙을 봐야 해서
 * 여기 모아 두었습니다.
 */

import type { SessionCommentDoc, SessionDoc, SessionPeriod } from "@/lib/types";

/** 교시 목록. 화면의 고르개도 이 순서를 따릅니다. */
export const SESSION_PERIODS: readonly SessionPeriod[] = [1, 2];

/** 화면에 적는 교시 이름 */
export function periodLabel(period: SessionPeriod): string {
  return `${period}교시`;
}

/**
 * 그 주 문서에서 해당 교시의 영상 주소를 꺼냅니다.
 *
 * 1교시가 videoUrl2가 아니라 videoUrl인 이유는 types.ts의 SessionDoc 주석에
 * 적어두었습니다 — 교시를 나누기 전에 쓰던 자리를 그대로 이어받았습니다.
 */
export function sessionVideoUrl(
  session: SessionDoc | null | undefined,
  period: SessionPeriod,
): string {
  return (period === 1 ? session?.videoUrl : session?.videoUrl2) ?? "";
}

/**
 * 이 댓글이 몇 교시 것인지.
 *
 * 교시를 나누기 전에 달린 댓글에는 period가 없습니다. 그 글들은 1교시로
 * 봅니다 — 안 그러면 어느 교시에서도 안 보여 사라진 것처럼 됩니다.
 */
export function commentPeriod(comment: SessionCommentDoc): SessionPeriod {
  return comment.period === 2 ? 2 : 1;
}
