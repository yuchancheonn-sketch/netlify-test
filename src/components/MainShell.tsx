"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BottomTabBar from "@/components/BottomTabBar";

/**
 * 대화방 안에서는 하단 탭바를 감춥니다.
 *
 * 카카오톡·당근처럼 대화방은 화면을 통째로 씁니다. 아래에 탭바가 남아 있으면
 * 입력창과 겹쳐 보이고, 대화 중에 다른 탭으로 새는 길만 열어둘 뿐입니다.
 * 채팅 목록(/chat)에서는 그대로 둡니다. 감추는 건 방 안(/chat/무엇)뿐입니다.
 */
function isInsideChatRoom(pathname: string): boolean {
  return /^\/chat\/[^/]+$/.test(pathname);
}

export default function MainShell({ children }: { children: ReactNode }) {
  const fullScreen = isInsideChatRoom(usePathname());

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
        {/*
          하단 탭바에 내용이 가리지 않도록 여백을 둡니다.
          탭바가 화면 바닥에 붙지 않고 떠 있는 알약이라, 띄운 만큼 더 잡습니다.
          (알약 높이 약 60px + 바닥에서 띄운 12px + 여유)
          탭바를 감추는 대화방에서는 이 여백도 없앱니다.
        */}
        <main
          className={
            fullScreen ? "flex flex-1 flex-col" : "flex-1 pb-[calc(94px+env(safe-area-inset-bottom))]"
          }
        >
          {children}
        </main>
      </div>

      {fullScreen ? null : <BottomTabBar />}
    </>
  );
}
