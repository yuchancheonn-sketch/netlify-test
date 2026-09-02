/**
 * 도산아카데미 홈페이지(dosan21.kr)의 RSS를 읽기 좋은 형태로 바꾸는 곳.
 *
 * 그 사이트는 아임웹으로 만들어져 있고 /rss 주소로 최근 글 50건을 내려줍니다.
 * 화면을 긁어오는 방식이 아니라 공식 피드를 읽는 것이라, 사이트 디자인이
 * 바뀌어도 잘 동작합니다.
 *
 * XML 파서를 따로 들이지 않고 정규식으로 훑습니다. 항목 구조가 단순하고
 * (제목·링크·날짜·썸네일뿐) 우리가 읽는 피드가 하나뿐이라 이 편이 가볍습니다.
 */

export interface NewsItem {
  /** 글 고유값 (링크의 idx). 없으면 링크 전체 */
  id: string;
  title: string;
  link: string;
  /** "YYYY-MM-DD" (한국 시간 기준) */
  date: string;
  imageUrl: string | null;
}

/** &amp; 같은 문자 표기를 원래 글자로 되돌립니다. */
function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    // &amp;는 다른 표기를 모두 되돌린 뒤에 마지막으로 풀어야 겹치지 않습니다.
    .replace(/&amp;/g, "&")
    .trim();
}

/** <item> 한 덩어리에서 태그 하나의 내용을 꺼냅니다. */
function tagText(block: string, name: string): string {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(block);
  return match ? decodeEntities(match[1]) : "";
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * 발행 시각을 한국 날짜로.
 * 앱 서버는 세계 표준시로 도는데, 우리에게 필요한 건 언제나 한국 날짜라
 * 9시간을 더한 뒤 날짜만 떼어냅니다.
 */
function toKoreanDate(pubDate: string): string {
  const time = Date.parse(pubDate);
  if (Number.isNaN(time)) return "";
  const korean = new Date(time + 9 * 60 * 60 * 1000);
  return `${korean.getUTCFullYear()}-${pad(korean.getUTCMonth() + 1)}-${pad(
    korean.getUTCDate(),
  )}`;
}

export function parseRss(xml: string): NewsItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return blocks
    .map((block): NewsItem => {
      // 피드의 링크는 http로 오는데, 사이트는 https로도 열립니다.
      const link = tagText(block, "link").replace(/^http:\/\//i, "https://");
      const image = /<media:content[^>]*url="([^"]+)"/.exec(block);
      const idx = /[?&]idx=(\d+)/.exec(link);

      return {
        id: idx ? idx[1] : link,
        title: tagText(block, "title"),
        link,
        date: toKoreanDate(tagText(block, "pubDate")),
        imageUrl: image ? decodeEntities(image[1]).trim() : null,
      };
    })
    .filter((item) => item.title && item.link);
}
