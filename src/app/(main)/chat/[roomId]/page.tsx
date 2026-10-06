import ChatRoomPage from "./room";

/**
 * 대화방 (웹 주소 /chat/<방 id>). 화면 본체는 room.tsx — 앱(정적 내보내기)은 같은 본체를 chat/room/page.tsx에서
 * 쿼리(?id=)로 받아 씁니다(2026-10-06 사용자 요청 (구글 플레이 출시 준비), lib/routes.ts의 chatHref).
 */
export default async function ChatRoomRoute({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ChatRoomPage roomId={roomId} />;
}
