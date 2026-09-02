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
 * 결과는 한 시간 저장해 두고 씁니다. 새 영상이 올라오면 한 시간 안에 따라옵니다.
 */
const CACHE_SECONDS = 3600;
/** 한 번에 50편씩, 최대 6번까지만 부릅니다 (300편) */
const MAX_PAGES = 6;

export const revalidate = 3600;

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

    const response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
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

/** 열쇠 없이 쓸 수 있는 채널 RSS (최근 15편) */
async function fetchRecentFromFeed(): Promise<VideoItem[]> {
  const response = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${DOSAN_CHANNEL_ID}`,
    { next: { revalidate: CACHE_SECONDS } },
  );
  if (!response.ok) return [];
  return parseChannelFeed(await response.text());
}

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY;

  try {
    const videos = key ? await fetchAllWithApiKey(key) : await fetchRecentFromFeed();

    // 열쇠로 받아왔는데 비어 있으면(할당량 초과 등) RSS로라도 채웁니다.
    const items = videos.length > 0 ? videos : await fetchRecentFromFeed();

    if (items.length === 0) {
      return Response.json(
        { items: [], complete: false, error: "영상 목록을 불러오지 못했어요." },
        { status: 502 },
      );
    }

    return Response.json(
      // complete: 채널의 전부인지(열쇠 있음), 최근 몇 편인지(열쇠 없음)
      { items, complete: Boolean(key) && videos.length > 0 },
      {
        headers: {
          "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    );
  } catch {
    return Response.json(
      { items: [], complete: false, error: "영상 목록을 불러오지 못했어요." },
      { status: 502 },
    );
  }
}
