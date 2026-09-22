import { getAdminDb } from "@/lib/firebase-admin";
import {
  DOSAN_CHANNEL_ID,
  DOSAN_UPLOADS_PLAYLIST_ID,
  parseChannelFeed,
  toKoreanDate,
  type VideoItem,
} from "@/lib/youtube";

/**
 * 도산아카데미 유튜브 영상 목록을 대신 받아오는 창구.
 *
 * 두 가지 길이 있습니다.
 *  1) YOUTUBE_API_KEY가 있으면 유튜브 공식 창구로 "채널의 모든 영상"을 받아옵니다.
 *  2) 열쇠가 없으면 누구나 열 수 있는 채널 RSS로 "최근 15편"만 받아옵니다.
 *
 * 열쇠는 서버에서만 쓰고 앱(브라우저)으로는 나가지 않습니다.
 * 발급은 Google Cloud 콘솔 → YouTube Data API v3 → API 키.
 *
 * ★ "영상 목록을 불러오지 못했어요"가 종종 뜨던 문제 (2026-09-22 고침)
 *   유튜브 RSS는 가끔 500·404를 돌려줍니다(특히 클라우드 서버에서). 예전에는
 *     - 빌드할 때 한 번 만들어 둔 응답을 한 시간씩 그대로 내보내서(revalidate), 그 순간 실패하면
 *       실패가 한 시간 동안 박제됐고,
 *     - 한 번 실패하면 다시 묻지 않았고,
 *     - 전에 받아 둔 목록도 없어 곧바로 빈 화면이었습니다.
 *   이제는
 *     - 요청 때마다 서버가 판단하고(force-dynamic), 성공한 목록만 CDN이 한 시간 들고 있습니다.
 *     - RSS는 실패하면 잠깐 쉬었다가 세 번까지 다시 묻습니다.
 *     - 성공한 목록을 서버 메모리와 Firestore(feedState/videoList)에 적어 두고, 유튜브가 안 될 때는
 *       그것을 내보냅니다. 새 영상이 조금 늦게 뜰 뿐 화면이 비지는 않습니다.
 *     - 정말 아무것도 없을 때만 오류를 내고, 그 오류는 CDN에 남기지 않습니다(no-store).
 */
const CACHE_SECONDS = 3600;
/** 예비 목록을 내보낼 때는 CDN이 5분만 들고 있게 합니다 — 유튜브가 돌아오면 금방 새 목록으로. */
const FALLBACK_CACHE_SECONDS = 300;
/** 한 번에 50편씩, 최대 6번까지만 부릅니다 (300편) */
const MAX_PAGES = 6;
const FEED_ATTEMPTS = 3;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VideoList {
  items: VideoItem[];
  complete: boolean;
  /** 받아 온 시각(ms) */
  fetchedAt: number;
}

/** 이 서버 인스턴스가 마지막으로 성공한 목록. 인스턴스가 새로 뜨면 Firestore에서 다시 읽습니다. */
let lastGood: VideoList | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 규칙을 건너뛰는 Admin으로만 읽고 씁니다 — feedState는 브라우저에서 막혀 있습니다(firestore.rules). */
function videoListDoc() {
  return getAdminDb()?.collection("feedState").doc("videoList") ?? null;
}

async function loadSaved(): Promise<VideoList | null> {
  try {
    const snapshot = await videoListDoc()?.get();
    const data = snapshot?.data() as VideoList | undefined;
    return data?.items?.length ? data : null;
  } catch {
    return null;
  }
}

async function save(list: VideoList) {
  try {
    await videoListDoc()?.set(list);
  } catch {
    // 적어 두기에 실패해도 이번 응답은 그대로 나갑니다.
  }
}

interface PlaylistItemsResponse {
  items?: {
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
  }[];
  nextPageToken?: string;
}

/** 유튜브 공식 창구로 채널의 모든 영상을 받아옵니다. */
async function fetchAllWithApiKey(key: string): Promise<VideoItem[]> {
  const videos: VideoItem[] = [];
  let pageToken = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", DOSAN_UPLOADS_PLAYLIST_ID);
    url.searchParams.set("key", key);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) break;

    const data = (await response.json()) as PlaylistItemsResponse;
    for (const item of data.items ?? []) {
      const id = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      // 비공개로 돌린 영상은 제목이 이렇게 바뀌어 내려옵니다.
      if (!id || !title || title === "Private video" || title === "Deleted video") continue;
      videos.push({
        id,
        title,
        date: toKoreanDate(item.snippet?.publishedAt ?? ""),
      });
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videos;
}

/** 열쇠 없이 쓸 수 있는 채널 RSS (최근 15편). 가끔 실패해서 잠깐씩 쉬며 세 번까지 묻습니다. */
async function fetchRecentFromFeed(): Promise<VideoItem[]> {
  for (let attempt = 0; attempt < FEED_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(400 * attempt);
    try {
      const response = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${DOSAN_CHANNEL_ID}`,
        { cache: "no-store" },
      );
      if (!response.ok) continue;
      const items = parseChannelFeed(await response.text());
      if (items.length > 0) return items;
    } catch {
      // 네트워크 오류 — 다음 차례에 다시.
    }
  }
  return [];
}

/** 유튜브에서 새로 받아 옵니다. 못 받으면 null. */
async function fetchFresh(): Promise<VideoList | null> {
  const key = process.env.YOUTUBE_API_KEY;
  const videos = key ? await fetchAllWithApiKey(key).catch(() => []) : [];
  // 열쇠가 없거나, 열쇠로 받아왔는데 비어 있으면(할당량 초과 등) RSS로 채웁니다.
  const items = videos.length > 0 ? videos : await fetchRecentFromFeed();
  if (items.length === 0) return null;
  // complete: 채널의 전부인지(열쇠로 받음), 최근 몇 편인지(RSS)
  return { items, complete: videos.length > 0, fetchedAt: Date.now() };
}

function listResponse(list: VideoList, cacheSeconds: number) {
  return Response.json(
    { items: list.items, complete: list.complete },
    {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`,
      },
    },
  );
}

export async function GET() {
  // 한 시간 안에 받아 둔 것이 있으면 유튜브에 다시 묻지 않습니다.
  if (lastGood && Date.now() - lastGood.fetchedAt < CACHE_SECONDS * 1000) {
    return listResponse(lastGood, CACHE_SECONDS);
  }

  const fresh = await fetchFresh();
  if (fresh) {
    lastGood = fresh;
    await save(fresh);
    return listResponse(fresh, CACHE_SECONDS);
  }

  // 유튜브가 안 될 때 — 전에 받아 둔 목록으로.
  const fallback = lastGood ?? (await loadSaved());
  if (fallback) {
    lastGood = lastGood ?? fallback;
    console.warn("[videos] 유튜브에서 못 받아 전에 받아 둔 목록을 내보냅니다.");
    return listResponse(fallback, FALLBACK_CACHE_SECONDS);
  }

  return Response.json(
    { items: [], complete: false, error: "영상 목록을 불러오지 못했어요." },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
