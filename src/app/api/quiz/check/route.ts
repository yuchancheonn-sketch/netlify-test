import { kstDayNumber, quizForDay, type OxAnswer } from "@/lib/dosan-quiz";
import { answerFor } from "@/lib/dosan-quiz-answers";
import type { QuizTodayResult } from "@/lib/quiz-types";

/**
 * 로그인 안 하고 둘러보는 사람의 오늘의 OX 퀴즈 채점 (2026-09-24 사용자 요청
 * "로그인 하지 않고 풀면 집계에는 안 잡히니까 '나의 등수 보러가기'로 로그인 유도").
 *
 * 정답·해설만 돌려주고 **아무것도 적지 않습니다** — 맞힌 수·등수(quizScores)에 안 들어갑니다.
 * 원우의 채점(/api/quiz, lib/quiz-server.ts)과 같은 오늘 문제·같은 정답표를 봅니다.
 *
 * POST { quizId, answer: "O" | "X" }  →  QuizTodayResult  |  409 { reason: "stale-quiz" }
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { quizId?: string; answer?: string } | null;
  const answer = body?.answer;
  if (answer !== "O" && answer !== "X") {
    return Response.json({ reason: "bad-request" }, { status: 400 });
  }

  const quiz = quizForDay(kstDayNumber());
  if (body?.quizId !== quiz.id) return Response.json({ reason: "stale-quiz" }, { status: 409 });

  const key = answerFor(quiz.id);
  if (!key) return Response.json({ reason: "no-answer" }, { status: 500 });

  const result: QuizTodayResult = {
    myAnswer: answer as OxAnswer,
    answer: key.answer,
    correct: answer === key.answer,
    explanation: key.explanation,
  };
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
