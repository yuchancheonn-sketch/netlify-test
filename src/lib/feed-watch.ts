import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";
import { addNotice } from "./notices";
import { sendPushToTokens } from "./push-send";
import { parseRss } from "./rss";
import { DOSAN_CHANNEL_ID, parseChannelFeed } from "./youtube";

/**
 * 새 복습 영상·도산아카데미 소식이 올라왔는지 보고, 있으면 원우 전원에게 알립니다 (2026-09-11).
 *
 * Netlify 예약 함수(netlify/functions/feed-push.mts)가 한 시간마다 부릅니다.
 * 우리 앱은 Firebase 무료 요금제라 Cloud Functions의 예약 실행을 못 써서, Netlify에서 돌립니다.
 *
 * 흐름 (영상·소식 따로)
 *  1. 피드를 받습니다 — 유튜브 채널 RSS(최근 15편), dosan21.kr RSS(최근 50건). 소식 탭과 같은 곳입니다.
 *  2. Firestore feedState/{videos|news}의 seenIds(이미 본 글 id)와 견줘 새 글을 고릅니다.
 *     ★ 처음 돌 때(문서 없음)는 지금 글들을 "본 것"으로 적기만 하고 보내지 않습니다 —
 *       안 그러면 첫 배포 때 지난 글 수십 건 알림이 한꺼번에 울립니다.
 *     ★ 7일보다 오래된 글은 새 글이어도 알리지 않습니다(피드가 잠깐 이상하게 와도 옛 글로 울리지 않게).
 *  3. 새 글이 있으면 seenIds를 먼저 고쳐 적고 보냅니다 — 보내다 실패해도 같은 글로 두 번 울리지 않게,
 *     "한 번 놓치는 쪽"을 골랐습니다.
 *  4. 여러 건이면 알림 하나로 묶습니다("첫 글 제목 외 N건"). tag가 같아 새 알림이 이전 것을 덮습니다.
 *
 * feedState는 서버만 쓰는 자리라 보안 규칙에 적지 않습니다(pushLog와 같음) — 앱에서는 못 읽습니다.
 * 받는 사람은 막히지 않은 원우 전원(모든 기수)입니다. 도산아카데미 소식은 기수를 가리지 않습니다.
 *
 * ★ import는 상대 경로로 둡니다 — 예약 함수는 Next 밖에서 묶여 "@/" 별칭을 모를 수 있습니다.
 */

const VIDEO_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${DOSAN_CHANNEL_ID}`;
const NEWS_FEED_URL = "https://dosan21.kr/rss";

/** seenIds에 남겨 둘 id 수. 피드 한 번에 오는 글(최대 50)보다 넉넉히. */
const SEEN_LIMIT = 200;
/** 이보다 오래된 글은 알리지 않습니다(일). */
const RECENT_DAYS = 7;
/** 피드 하나를 기다리는 시간(ms). 예약 함수는 30초 안에 끝나야 합니다. */
const FETCH_TIMEOUT_MS = 10_000;
/** 폰이 꺼져 있어도 반나절은 알림을 들고 기다립니다(초). */
const FEED_PUSH_TTL_SECONDS = 12 * 60 * 60;

/** dosan21.kr은 브라우저가 아닌 요청을 거절해서(403) 브라우저처럼 부릅니다 — /api/dosan과 같습니다. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

interface FeedItem {
  id: string;
  title: string;
  /** "YYYY-MM-DD" (한국 날짜), 모르면 빈 문자열 */
  date: string;
}

interface FeedSource {
  key: "videos" | "news";
  /** 알림 제목 */
  title: string;
  /** 알림을 누르면 열 앱 안 주소 — 소식 탭의 해당 칸 */
  url: string;
  load: () => Promise<FeedItem[]>;
}

export interface FeedCheckResult {
  source: "videos" | "news";
  status: "fetch-failed" | "seeded" | "no-change" | "notified" | "dry-run";
  /** 이번에 새로 찾은 글 수 */
  newCount: number;
  titles?: string[];
  sent?: number;
  failed?: number;
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.text();
}

/** 한국 날짜로 RECENT_DAYS일 전 "YYYY-MM-DD" */
function recentCutoff(now: number = Date.now()): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return new Date(now + 9 * 60 * 60 * 1000 - RECENT_DAYS * DAY_MS).toISOString().slice(0, 10);
}

/** 막히지 않은 원우 전원의 기기 토큰. 새 글이 있을 때만 한 번 읽습니다. */
async function allMemberTokens(db: Firestore): Promise<string[]> {
  const [members, tokens] = await Promise.all([
    // select()에 칸을 안 주면 문서 id만 옵니다 — 프로필 사진까지 받지 않습니다.
    db.collection("users").where("status", "==", "approved").select().get(),
    db.collection("pushTokens").get(),
  ]);
  const approved = new Set(members.docs.map((doc) => doc.id));
  return tokens.docs
    .filter((doc) => approved.has(String(doc.get("uid") ?? "")))
    .map((doc) => doc.id);
}

export async function checkFeedsAndNotify({
  db,
  messaging,
  dryRun = false,
}: {
  db: Firestore;
  messaging: Messaging;
  /** true면 읽기만 하고 feedState를 적지도, 알림을 보내지도 않습니다(점검용). */
  dryRun?: boolean;
}): Promise<FeedCheckResult[]> {
  const sources: FeedSource[] = [
    {
      key: "videos",
      title: "새 복습 영상",
      url: "/news",
      load: async () => parseChannelFeed(await fetchText(VIDEO_FEED_URL)),
    },
    {
      key: "news",
      title: "도산아카데미 새 소식",
      url: "/news?tab=news",
      load: async () => parseRss(await fetchText(NEWS_FEED_URL, BROWSER_HEADERS)),
    },
  ];

  const results: FeedCheckResult[] = [];
  let tokens: string[] | null = null;
  const cutoff = recentCutoff();

  for (const source of sources) {
    let items: FeedItem[];
    try {
      items = await source.load();
    } catch {
      results.push({ source: source.key, status: "fetch-failed", newCount: 0 });
      continue;
    }
    // 비어서 오면 피드 쪽 문제로 봅니다 — 적어 둔 seenIds를 비우지 않도록 건너뜁니다.
    if (items.length === 0) {
      results.push({ source: source.key, status: "fetch-failed", newCount: 0 });
      continue;
    }

    const stateRef = db.collection("feedState").doc(source.key);
    const state = await stateRef.get();
    const currentIds = items.map((item) => item.id);

    if (!state.exists) {
      if (!dryRun) {
        await stateRef.set({ seenIds: currentIds.slice(0, SEEN_LIMIT), updatedAt: new Date() });
      }
      results.push({ source: source.key, status: "seeded", newCount: 0 });
      continue;
    }

    const seen = new Set<string>((state.get("seenIds") as string[] | undefined) ?? []);
    const fresh = items.filter((item) => !seen.has(item.id) && (!item.date || item.date >= cutoff));
    if (fresh.length === 0) {
      results.push({ source: source.key, status: "no-change", newCount: 0 });
      continue;
    }

    const titles = fresh.map((item) => item.title);
    if (dryRun) {
      results.push({ source: source.key, status: "dry-run", newCount: fresh.length, titles });
      continue;
    }

    // 먼저 적어 두고 보냅니다(위 흐름 3). 새로 본 id가 앞에 서고, 오래된 것부터 밀려납니다.
    await stateRef.set({
      seenIds: [...new Set([...currentIds, ...seen])].slice(0, SEEN_LIMIT),
      updatedAt: new Date(),
    });

    const body =
      fresh.length === 1 ? fresh[0].title : `${fresh[0].title} 외 ${fresh.length - 1}건`;

    // 헤더 알림함에도 한 건(모든 기수) — lib/notices.ts. 실패해도 푸시는 그대로 보냅니다.
    await addNotice(db, {
      type: source.key === "videos" ? "video" : "news",
      title: source.title,
      body,
      url: source.url,
      cohort: "all",
    }).catch(() => {});

    tokens ??= await allMemberTokens(db);
    const { sent, failed } = await sendPushToTokens(db, messaging, tokens, {
      title: source.title,
      body,
      url: source.url,
      tag: `feed:${source.key}`,
      ttlSeconds: FEED_PUSH_TTL_SECONDS,
    });
    results.push({
      source: source.key,
      status: "notified",
      newCount: fresh.length,
      titles,
      sent,
      failed,
    });
  }

  return results;
}
