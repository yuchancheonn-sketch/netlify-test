import type { OxAnswer } from "@/lib/dosan-quiz";

/**
 * 오늘의 OX 퀴즈 — 서버(/api/quiz)와 앱이 주고받는 모양 (2026-09-15).
 * 서버 전용 파일(quiz-server.ts)을 앱이 불러오지 않도록 모양만 따로 둡니다.
 */

/** 지금까지의 성적과 기수 안 등수 */
export interface QuizStats {
  /** 지금까지 맞힌 문제 수 */
  correct: number;
  /** 지금까지 푼 문제 수 */
  answered: number;
  /** "10기"처럼 — 등수를 매긴 기수 */
  cohort: string;
  /** 기수 안 등수(1부터). 맞힌 개수가 같으면 같은 등수입니다. */
  rank: number;
  /** 나와 같은 등수가 더 있으면 true — "공동 3등" */
  tied: boolean;
  /** 이 기수에서 퀴즈를 한 번이라도 푼 원우 수 */
  participants: number;
}

/** 오늘 문제를 푼 결과. 제출한 뒤에만 서버가 정답·해설을 내려줍니다. */
export interface QuizTodayResult {
  myAnswer: OxAnswer;
  answer: OxAnswer;
  correct: boolean;
  explanation: string[];
}

export interface QuizStatus {
  /** 서버가 본 오늘 문제 id — 화면의 문제와 같은지 맞춰 봅니다(자정 경계). */
  quizId: string;
  /** 서버가 본 오늘 한국 날짜 "YYYY-MM-DD" */
  date: string;
  /** 오늘 아직 안 풀었으면 null */
  today: QuizTodayResult | null;
  /** 한 번도 안 풀었으면 null */
  stats: QuizStats | null;
}

/** 역대 퀴즈 한 줄 */
export interface QuizHistoryItem {
  date: string;
  quizId: string;
  question: string;
  answer: OxAnswer;
  explanation: string[];
}
