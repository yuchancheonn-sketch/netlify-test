import { timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { kstDayNumber } from "@/lib/dosan-quiz";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-server";
import { weekIdForDay, weekRangeLabel } from "@/lib/week";
import { fetchWeekPosts, letterPath } from "@/lib/week-letter-server";

/**
 * 이번주 원우 소식 카톡 초안 (2026-09-24 사용자 요청).
 *
 * 매주 **월요일 18:00(한국 시간)** GitHub Actions(.github/workflows/weekly-news.yml)가 이 주소를 부릅니다
 * (같은 날 처음엔 화요일 00:10에 지난주를 정리했는데, 사용자 요청 "매주 월요일 밤 6시"로 바꿨습니다).
 * App Hosting에는 예약 실행이 없고 Cloud Functions는 결제수단이 필요해서 GitHub의 무료 예약 실행을 씁니다.
 *
 *   1. 이번 주(지난 화요일~오늘 월요일)에 올라온 원우 소식 수를 세고
 *   2. "이번주 원우 소식이에요" + 앱의 그 주 원우 소식 화면 주소(/news/week/{그 주})를 weeklyDrafts/{그 주}에 적고
 *      (2026-09-25부터. 그 전엔 로그인 없이 보는 소식지 /letter/{그 주}-{열쇠}였습니다.)
 *   3. 운영진에게 "초안이 준비됐어요" 푸시를 보냅니다.
 * 보내기는 운영진이 /admin "원우 소식" 탭의 "카톡으로 보내기"(폰 공유 창)나 복사로 원우 단톡방에 올립니다
 * (같은 날 사용자 선택 — 카카오톡 채널 가입자에게 자동으로 보내는 길은 유료 비즈니스 메시지뿐이라 쓰지 않음).
 * 문구에는 소식 수와 링크만 둡니다. 소식지는 열쇠가 맞는 링크로만 열립니다(lib/week-letter-server.ts).
 *
 * 화면의 "이번 주만 보이기"는 이 주소와 상관없이 앱이 날짜로 스스로 합니다 — 이 호출이 한 번 빠져도
 * 카드는 제때 접히고, 초안만 그 주 것이 안 생깁니다. 같은 주를 여러 번 불러도 같은 문서를 덮어씁니다.
 *
 * ★ 누구나 두드릴 수 있는 주소라 머리글 x-cron-token이 NEWS_CRON_TOKEN(Secret Manager)과 같아야 합니다.
 *   GitHub 저장소 Secrets의 NEWS_CRON_TOKEN에 같은 값을 넣어 둡니다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = "https://aegiaeta.web.app";

function authorized(request: Request): boolean {
  const expected = process.env.NEWS_CRON_TOKEN ?? "";
  const given = request.headers.get("x-cron-token") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return Response.json({ ok: false, reason: "no-service-account" }, { status: 500 });

  // 월요일 저녁에 불리므로 오늘이 속한 주 = 이번 주입니다.
  // ?week=YYYY-MM-DD(그 주 화요일)로 주를 정해 다시 만들 수도 있습니다(빠진 주를 손으로 채울 때).
  const requested = new URL(request.url).searchParams.get("week");
  const weekId =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : weekIdForDay(kstDayNumber());
  const weekLabel = weekRangeLabel(weekId);

  const posts = await fetchWeekPosts(db, weekId);
  const path = letterPath(weekId);
  if (!path) return Response.json({ ok: false, reason: "no-secret" }, { status: 500 });

  if (posts.length === 0) {
    return Response.json({ ok: true, weekId, postCount: 0, skipped: true });
  }

  /*
   * 링크는 앱의 그 주 원우 소식 화면(/news/week/{주}) — 2026-09-25 사용자 요청
   * ("카톡으로 보낼 링크를 앱의 원우소식 창 링크로"). 그 전엔 로그인 없이 보는 소식지(/letter/…, 위 path)였습니다.
   * 소식지 주소 자체는 그대로 살아 있어, 이미 나간 링크도 열립니다.
   */
  const draftText =
    `이번주 원우 소식이에요 📮\n${weekLabel} · 소식 ${posts.length}개\n\n` +
    `${APP_URL}/news/week/${weekId}`;

  await db.collection("weeklyDrafts").doc(weekId).set({
    weekId,
    weekLabel,
    postCount: posts.length,
    draftText,
    createdAt: FieldValue.serverTimestamp(),
  });

  const admins = await db.collection("users").where("role", "==", "admin").select().get();
  const push = await sendPushToUsers({
    recipientUids: admins.docs.map((document) => document.id),
    title: "이번주 원우 소식 카톡 초안이 준비됐어요",
    body: `${weekLabel} · 게시물 ${posts.length}개 — 눌러서 단톡방에 보내 주세요.`,
    url: "/admin?tab=newsDraft",
    tag: `weekly-draft:${weekId}`,
  });

  return Response.json({ ok: true, weekId, postCount: posts.length, push });
}
