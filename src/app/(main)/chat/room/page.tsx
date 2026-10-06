"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatRoomPage from "../[roomId]/room";

/** 앱용 대화방 주소(/chat/room?id=<방 id>) — 앱 안에서는 방 id마다 화면 파일을 만들 수 없어 쿼리로 받습니다(2026-10-06 사용자 요청 (구글 플레이 출시 준비), lib/routes.ts의 chatHref). */
export default function ChatRoomByQuery() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const roomId = useSearchParams().get("id") ?? "";
  return roomId ? <ChatRoomPage roomId={roomId} /> : null;
}
