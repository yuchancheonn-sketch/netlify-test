/** 도산 퀴즈 주 단위 계산 점검 — `node scripts/check-quiz.mts` (실패하면 던짐) */
import assert from "node:assert/strict";
// @ts-expect-error node가 직접 실행하려면 .ts 확장자가 필요하지만 tsc 설정은 이를 허용하지 않음
import { DOSAN_QUIZZES, kstDayNumber, pastQuizzes, QUIZ_START_DATE, quizForDay, quizWeekStartDay } from "../src/lib/dosan-quiz.ts";

const DAY_MS = 86_400_000;
const startDay = Math.floor(Date.parse(`${QUIZ_START_DATE}T00:00:00Z`) / DAY_MS);
// 시작일(일요일)부터 토요일까지 같은 문제, 다음 일요일 0시(한국 시간)에 다음 문제
const sundayNoon = (Date.parse(`${QUIZ_START_DATE}T00:00:00Z`) - 9 * 3600_000) + 12 * 3600_000;
const first = quizForDay(kstDayNumber(sundayNoon));
assert.equal(first.id, DOSAN_QUIZZES[0].id);
for (let d = 0; d < 7; d++) assert.equal(quizForDay(startDay + d).id, first.id);
assert.equal(quizForDay(startDay + 7).id, DOSAN_QUIZZES[1].id);
assert.equal(quizForDay(startDay + 7 - 1).id, first.id); // 토요일 끝까지 이전 주 문제
assert.equal(quizWeekStartDay(startDay + 3), startDay);
// 역대 퀴즈: 이번 주 문제는 includeToday일 때만, 같은 문제 중복 없음
const wk3 = startDay + 21 + 2;
assert.deepEqual(pastQuizzes(wk3, false).map((p) => p.quiz.id), [DOSAN_QUIZZES[2].id, DOSAN_QUIZZES[1].id, DOSAN_QUIZZES[0].id]);
assert.equal(pastQuizzes(wk3, true)[0].quiz.id, DOSAN_QUIZZES[3].id);
console.log(`도산 퀴즈 점검 통과 (문제 ${DOSAN_QUIZZES.length}개, 시작 ${QUIZ_START_DATE})`);
