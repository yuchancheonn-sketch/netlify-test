import { parseRss } from "@/lib/rss";

/**
 * 도산아카데미 소식을 대신 받아오는 창구.
 *
 * 브라우저가 dosan21.kr을 직접 부르면 두 가지가 막습니다.
 *  1) 다른 사이트의 자료를 그냥 가져올 수 없게 하는 브라우저 규칙(CORS)
 *  2) 그 사이트가 브라우저가 아닌 요청을 거절하는 설정(403)
 * 그래서 우리 앱 서버가 대신 받아 정리한 뒤 앱에 넘겨줍니다.
 *
 * 결과는 30분 동안 저장해 두고 씁니다. 원우들이 화면을 열 때마다
 * 도산아카데미 서버를 부르지 않도록 하기 위해서입니다.
 */
const FEED_URL = "https://dosan21.kr/rss";
const CACHE_SECONDS = 1800;

export const revalidate = 1800;

export async function GET() {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        // 평범한 브라우저처럼 보여야 응답해 줍니다.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return Response.json(
        { items: [], error: "도산아카데미 소식을 불러오지 못했어요." },
        { status: 502 },
      );
    }

    const items = parseRss(await response.text());

    return Response.json(
      { items },
      {
        headers: {
          "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    );
  } catch {
    return Response.json(
      { items: [], error: "도산아카데미 소식을 불러오지 못했어요." },
      { status: 502 },
    );
  }
}
