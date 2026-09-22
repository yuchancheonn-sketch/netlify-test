import { authorizeAccountRequest } from "@/lib/account-link-server";
import { calendarTokenFor } from "@/lib/calendar-feed-server";

/**
 * 내 폰 캘린더 구독 열쇠를 받는 창구 (2026-09-23). 답: { token }
 * 구독 주소는 /api/calendar/feed/{token}.ics — 규칙은 lib/calendar-feed-server.ts.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;

  const me = await authed.db.collection("users").doc(authed.token.uid).get();
  if (me.get("status") !== "approved") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const token = await calendarTokenFor(authed.db, authed.token.uid);
  return Response.json({ ok: true, token }, { headers: { "Cache-Control": "no-store" } });
}
