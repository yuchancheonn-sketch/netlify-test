import WeekNewsPage from "./week";

/**
 * 한 주 원우 소식 (웹 주소 /news/week/<주>) — 화면 본체는 week.tsx. 앱(정적 내보내기)은 같은 본체를 news/week/view/page.tsx에서
 * 쿼리(?id=)로 받아 씁니다 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), lib/routes.ts).
 */
export default async function Route({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  return <WeekNewsPage weekId={weekId} />;
}
