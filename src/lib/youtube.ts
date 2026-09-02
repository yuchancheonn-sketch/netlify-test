/**
 * 도산아카데미 유튜브 채널의 영상 목록을 다루는 곳.
 *
 * 채널: https://www.youtube.com/@dosanacademy
 * 채널 ID는 사람이 읽는 주소(@dosanacademy)와 달리 바뀌지 않는 값이라
 * 이걸 기준으로 부릅니다.
 */

/** @dosanacademy 채널 ID */
export const DOSAN_CHANNEL_ID = "UC0BVO2lUu5T5TIAQtbZpstQ";

/**
 * 채널에 올라온 모든 영상이 담기는 "업로드 재생목록" ID.
 * 채널 ID의 UC를 UU로 바꾸면 되는, 유튜브의 오래된 규칙입니다.
 */
export const DOSAN_UPLOADS_PLAYLIST_ID = `UU${DOSAN_CHANNEL_ID.slice(2)}`;

export interface VideoItem {
  /** 유튜브 영상 ID */
  id: string;
  title: string;
  /** "YYYY-MM-DD" (한국 시간 기준) */
  date: string;
}

/** 목록에 크게 깔 미리보기 그림. 영상 ID만 알면 만들 수 있습니다. */
export function videoThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** 재생 버튼을 눌렀을 때 앱 안에서 트는 주소 */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 올린 시각을 한국 날짜로 (앱 서버는 세계 표준시로 돕니다) */
export function toKoreanDate(raw: string): string {
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return "";
  const korean = new Date(time + 9 * 60 * 60 * 1000);
  return `${korean.getUTCFullYear()}-${pad(korean.getUTCMonth() + 1)}-${pad(
    korean.getUTCDate(),
  )}`;
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * 채널 RSS(최근 15편)를 읽습니다.
 * 유튜브 열쇠(API 키) 없이도 쓸 수 있는 길이라, 열쇠가 없을 때 이걸 씁니다.
 */
export function parseChannelFeed(xml: string): VideoItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries
    .map((entry): VideoItem => {
      const id = /<yt:videoId>([\s\S]*?)<\/yt:videoId>/.exec(entry);
      const title = /<title>([\s\S]*?)<\/title>/.exec(entry);
      const published = /<published>([\s\S]*?)<\/published>/.exec(entry);
      return {
        id: id ? id[1].trim() : "",
        title: title ? decodeEntities(title[1]) : "",
        date: published ? toKoreanDate(published[1].trim()) : "",
      };
    })
    .filter((video) => video.id && video.title);
}
