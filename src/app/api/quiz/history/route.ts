import { authorizeQuizRequest, readQuizHistory } from "@/lib/quiz-server";

/**
 * 역대 퀴즈 창구 (2026-09-15) — 홈 퀴즈 카드의 ">"로 들어가는 /quizzes 화면이 씁니다.
 * 지나간 문제의 정답·해설을 서버에서 받습니다(정답이 앱 코드에 없으므로). 오늘 문제는 오늘 푼 원우에게만.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const authorized = await authorizeQuizRequest(request);
  if ("response" in authorized) return authorized.response;

  const items = await readQuizHistory(authorized.db, authorized.uid);
  if (!items) {
    return Response.json({ ok: false, reason: "not-member" }, { status: 403, headers: NO_STORE });
  }
  return Response.json({ ok: true, items }, { headers: NO_STORE });
}
