import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { parseDosanSchedule } from "@/lib/dosan-schedule";
import { parseRss } from "@/lib/rss";

/**
 * 도산아카데미 일정 → 앱 캘린더 (2026-09-23 사용자 요청).
 *
 * 흐름
 *  1. dosan21.kr/rss에서 최근 글을 받습니다(소식 칸·새 소식 알림과 같은 피드).
 *  2. 처음 보는 글이면 글 페이지를 열어 meta description의 "일시·장소"를 읽습니다(lib/dosan-schedule.ts).
 *  3. 일정이 있으면 academyEvents/dosan-{글 idx}에 적습니다. 같은 글은 늘 같은 문서라 두 번 들어가지 않습니다.
 *     읽어 본 글 id는 feedState/academyCalendar.doneIds에 남겨 다시 열지 않습니다(일정이 없던 글도).
 *
 * ★ 언제 도나 — 예약 실행이 없습니다. 예전 한 시간마다 돌던 Netlify 예약 함수(feed-push)는
 *   Netlify가 멈추면서 같이 멈췄습니다. 그래서 원우가 홈을 열 때 앱이 /api/calendar/sync를 부르고,
 *   여기서 **한 시간에 한 번만** 실제로 돕니다(lastRunAt). 원우가 하루에 한 명만 열어도 그날 새 글이 들어옵니다.
 *
 * academyEvents는 모든 기수가 함께 봅니다(도산아카데미 행사는 기수를 가리지 않음). 서버만 적고,
 * 원우는 읽기만 합니다(firestore.rules). 기수 모임 일정(events)과 따로 두어 홈의 "다가오는 모임"에는 섞이지 않습니다.
 */

export const ACADEMY_EVENTS = "academyEvents";

const NEWS_FEED_URL = "https://dosan21.kr/rss";
/** dosan21.kr은 브라우저가 아닌 요청을 거절해서(403) 브라우저처럼 부릅니다 — lib/feed-watch.ts와 같습니다. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};
const FETCH_TIMEOUT_MS = 8_000;
/** 이 시간 안에 이미 돌았으면 건너뜁니다. */
const MIN_INTERVAL_MS = 60 * 60 * 1000;
/** 이보다 오래된 글은 보지 않습니다(일) — 처음 돌 때 지난 반년 치를 다 열지 않게. */
const LOOKBACK_DAYS = 60;
/** 한 번에 열어 볼 글 수 — 요청 하나가 너무 길어지지 않게. 남은 글은 다음 번에. */
const MAX_POSTS_PER_RUN = 8;
const DONE_LIMIT = 300;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.text();
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z]+;/g, " ")
    .replace(/&amp;/g, "&");
}

/** 제목 정리 — "제131회 도산아카데미 LBT 안내 - 주식회사 이주열(…)" 그대로 두되 너무 길면 자릅니다. */
function cleanTitle(title: string): string {
  const trimmed = title.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 79)}…` : trimmed;
}

export interface AcademySyncResult {
  status: "skipped" | "fetch-failed" | "done";
  checked: number;
  added: number;
}

export async function syncAcademyEvents(
  db: Firestore,
  { force = false }: { force?: boolean } = {},
): Promise<AcademySyncResult> {
  const stateRef = db.collection("feedState").doc("academyCalendar");

  // 한 시간에 한 번만 — 여러 원우가 동시에 열어도 한 명만 돌도록 transaction으로 자리를 잡습니다.
  const claimed = await db.runTransaction(async (transaction) => {
    const state = await transaction.get(stateRef);
    const last = (state.get("lastRunAt") as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    if (!force && Date.now() - last < MIN_INTERVAL_MS) return null;
    transaction.set(stateRef, { lastRunAt: FieldValue.serverTimestamp() }, { merge: true });
    return new Set<string>((state.get("doneIds") as string[] | undefined) ?? []);
  });
  if (!claimed) return { status: "skipped", checked: 0, added: 0 };
  const done = claimed;

  let items;
  try {
    items = parseRss(await fetchText(NEWS_FEED_URL));
  } catch {
    return { status: "fetch-failed", checked: 0, added: 0 };
  }

  const cutoff = new Date(Date.now() + 9 * 3600_000 - LOOKBACK_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const fresh = items
    .filter((item) => !done.has(item.id) && (!item.date || item.date >= cutoff))
    .slice(0, MAX_POSTS_PER_RUN);

  let added = 0;
  const newlyDone: string[] = [];
  for (const item of fresh) {
    let html: string;
    try {
      html = await fetchText(item.link);
    } catch {
      continue; // 이번엔 못 열었으니 doneIds에 넣지 않고 다음 번에 다시.
    }
    newlyDone.push(item.id);
    const meta = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
    if (!meta) continue;
    const schedule = parseDosanSchedule(decodeEntities(meta[1]), item.date);
    if (!schedule) continue;
    await db
      .collection(ACADEMY_EVENTS)
      .doc(`dosan-${item.id}`)
      .set({
        title: cleanTitle(item.title),
        ...schedule,
        link: item.link,
        source: "dosan21",
        sourceId: item.id,
        publishedDate: item.date,
        createdAt: FieldValue.serverTimestamp(),
      });
    added += 1;
  }

  if (newlyDone.length > 0) {
    await stateRef.set(
      { doneIds: [...newlyDone, ...done].slice(0, DONE_LIMIT), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  return { status: "done", checked: newlyDone.length, added };
}
