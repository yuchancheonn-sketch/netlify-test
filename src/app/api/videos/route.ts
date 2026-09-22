import { getVideoList } from "@/lib/video-list";

/**
 * 소식 탭 "복습 영상" 목록 창구.
 * 받는 방법·재시도·예비 목록은 모두 lib/video-list.ts에 있습니다(카카오 챗봇과 함께 씀).
 * 성공한 목록만 CDN이 들고 있고, 정말 아무것도 없을 때의 오류는 CDN에 남기지 않습니다(no-store).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const list = await getVideoList();
  if (!list) {
    return Response.json(
      { items: [], complete: false, error: "영상 목록을 불러오지 못했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { items: list.items, complete: list.complete },
    {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${list.cacheSeconds}, stale-while-revalidate=86400`,
      },
    },
  );
}
