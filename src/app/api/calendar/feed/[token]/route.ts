import { getAdminDb } from "@/lib/firebase-admin";
import { buildCalendarFeed } from "@/lib/calendar-feed-server";

/**
 * 폰 캘린더가 구독하는 주소 — /api/calendar/feed/{열쇠}.ics (2026-09-23).
 * 캘린더 앱은 로그인을 못 해서 주소 안의 열쇠로 원우를 알아봅니다. 자세한 것은 lib/calendar-feed-server.ts.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = getAdminDb();
  if (!db) return new Response("not configured", { status: 503 });

  const { token } = await params;
  const host = new URL(request.url).hostname;
  const body = await buildCalendarFeed(db, token.replace(/\.ics$/, ""), host);
  if (body === null) return new Response("not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="aegiaeta.ics"',
      // CDN이 남의 캘린더를 들고 있지 않게.
      "Cache-Control": "private, no-store",
    },
  });
}
