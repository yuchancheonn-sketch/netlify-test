import { authorizeQuizRequest, readQuizStatus, submitQuizAnswer } from "@/lib/quiz-server";

/**
 * 오늘의 OX 퀴즈 창구 (2026-09-15).
 *  - GET  : 오늘 문제를 풀었는지(풀었으면 정답·해설)와 지금까지 맞힌 수·기수 안 등수
 *  - POST : { quizId, answer: "O" | "X" } — 서버가 채점해 적고, GET과 같은 모양을 돌려줍니다
 * 로그인 토큰(Authorization: Bearer …)으로 본인을 밝힌 승인된 원우만 씁니다. 자세한 규칙은 lib/quiz-server.ts.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const authorized = await authorizeQuizRequest(request);
  if ("response" in authorized) return authorized.response;

  const status = await readQuizStatus(authorized.db, authorized.uid);
  if (!status) {
    return Response.json({ ok: false, reason: "not-member" }, { status: 403, headers: NO_STORE });
  }
  return Response.json({ ok: true, status }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const authorized = await authorizeQuizRequest(request);
  if ("response" in authorized) return authorized.response;

  const payload = (await request.json().catch(() => null)) as {
    quizId?: unknown;
    answer?: unknown;
  } | null;
  const quizId = typeof payload?.quizId === "string" ? payload.quizId : "";
  const answer = payload?.answer === "O" || payload?.answer === "X" ? payload.answer : null;
  if (!quizId || !answer) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400, headers: NO_STORE });
  }

  const outcome = await submitQuizAnswer(authorized.db, authorized.uid, quizId, answer);
  if (!outcome.ok) {
    return Response.json(
      { ok: false, reason: outcome.reason },
      { status: outcome.reason === "stale-quiz" ? 409 : 403, headers: NO_STORE },
    );
  }
  return Response.json({ ok: true, status: outcome.status }, { headers: NO_STORE });
}
