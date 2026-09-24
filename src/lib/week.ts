/**
 * 원우 소식을 "화요일 ~ 다음주 월요일" 단위로 묶는 주차 계산 (2026-09-24 사용자 요청).
 *
 * 한국 시간 화요일 자정에 새 주가 시작합니다. dosan-quiz.ts의 kstDayNumber와 같은 날짜 기준(하루 늘어나는
 * 시점이 한국 자정)을 그대로 씁니다 — day 0 = 1970-01-01(한국 시간으로도 그날, 목요일)이라
 * day % 7 은 0=목 1=금 2=토 3=일 4=월 5=화 6=수 순서입니다.
 */
import { kstDateString, kstDayNumber } from "@/lib/dosan-quiz";
import { parseDateString } from "@/lib/format";

/** 그 날이 속한 주의 화요일로 되돌립니다(화요일이면 그대로). */
function weekStartDay(day: number): number {
  const sinceTuesday = (((day - 5) % 7) + 7) % 7;
  return day - sinceTuesday;
}

/**
 * 그 날이 속한 주의 이름표 — 주가 시작하는 화요일의 "YYYY-MM-DD".
 * photoAlbums 문서의 weekId, weeklyDrafts 문서의 id로 그대로 씁니다.
 */
export function weekIdForDay(day: number): string {
  return kstDateString(weekStartDay(day));
}

/** 지금 이 순간이 속한 주. */
export function currentWeekId(now: number = Date.now()): string {
  return weekIdForDay(kstDayNumber(now));
}

/** 어느 시각(ms)이 속한 주 — weekId가 없는 옛 소식을 지난 주로 묶을 때 씁니다. */
export function weekIdForMillis(millis: number): string {
  return weekIdForDay(kstDayNumber(millis));
}

/** "2026-09-22"(그 주 화요일) → "9월 22일~28일" */
export function weekRangeLabel(weekId: string): string {
  const start = parseDateString(weekId);
  if (!start) return weekId;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${start.getMonth() + 1}월 ${start.getDate()}일`;
  const endLabel = sameMonth ? `${end.getDate()}일` : `${end.getMonth() + 1}월 ${end.getDate()}일`;
  return `${startLabel}~${endLabel}`;
}
