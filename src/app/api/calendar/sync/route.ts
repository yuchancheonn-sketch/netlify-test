import { authorizeAccountRequest } from "@/lib/account-link-server";
import { syncAcademyEvents } from "@/lib/academy-calendar-server";

/**
 * 도산아카데미 새 글의 일정을 캘린더에 넣는 창구 (2026-09-23).
 * 홈 캘린더가 열릴 때 부릅니다. 실제로는 한 시간에 한 번만 돕니다 — lib/academy-calendar-server.ts.
 * POST + Authorization: Bearer <로그인 토큰>. 답: { status, checked, added }
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  // 막히지 않은 원우만 — 아무나 불러 dosan21.kr을 두드리게 하지 않습니다.
  const me = await authed.db.collection("users").doc(authed.token.uid).get();
  if (me.get("status") !== "approved") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const result = await syncAcademyEvents(authed.db);
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
