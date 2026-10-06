import AlbumPage from "./album";

/**
 * 앨범 (웹 주소 /albums/<id>) — 화면 본체는 album.tsx. 앱(정적 내보내기)은 같은 본체를 albums/view/page.tsx에서
 * 쿼리(?id=)로 받아 씁니다 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), lib/routes.ts).
 */
export default async function Route({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  return <AlbumPage albumId={albumId} />;
}
