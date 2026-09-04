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
          맨 끝까지 내려도 마지막 줄이 가림막에 잠기지 않도록 여백을 둡니다.
          가림막이 바닥에서 116px까지 올라오므로(44px + 흐려지는 72px)
          그보다 조금 더 잡았습니다. 탭바를 감추는 대화방에서는 없앱니다.
        */}
        <main
          className={
            fullScreen
              ? "flex flex-1 flex-col"
              : "flex-1 pb-[calc(122px+env(safe-area-inset-bottom))]"
          }
        >
          {children}
        </main>
      </div>

      {fullScreen ? null : (
        <>
          <BottomTabBarScrim />
          <BottomTabBar />
        </>
      )}
    </>
  );
}

/**
 * 알약 아래로 화면 내용이 비쳐 보이지 않도록 깔아두는 가림막.
 *
 * 알약은 떠 있는 모양이라 그 아래와 옆으로 글자가 지나가는데, 그게 그대로
 * 보이면 어수선합니다. 알약의 세로 한가운데를 기준으로
 *  - 그 아래는 흰색으로 덮고,
 *  - 그 위로는 흐림이 서서히 옅어지며 사라지게 해
 * 내용이 자연스럽게 잠기도록 합니다.
 *
 * 기준이 되는 44px = 알약을 바닥에서 띄운 12px + 알약 높이 64px의 절반.
 * 알약 높이나 띄운 높이를 바꾸면 이 값도 같이 맞춰야 합니다.
 * 퍼센트 대신 픽셀로 잡은 이유는, 아이폰마다 다른 홈 바 높이
 * (safe-area)까지 더해지면 퍼센트로는 기준점이 흔들리기 때문입니다.
 */
function BottomTabBarScrim() {
  /** 화면 바닥부터 알약 한가운데까지 */
  const toPillMiddle = "calc(44px + env(safe-area-inset-bottom))";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-10">
      {/* 알약 한가운데 아래 — 완전히 흰색으로 덮습니다. */}
      <div
        className="absolute inset-x-0 bottom-0 bg-white"
        style={{ height: toPillMiddle }}
      />

      {/*
        알약 한가운데 위 — 흐림과 흰색이 함께 옅어집니다.
        흐림은 덧씌운 마스크로 위로 갈수록 걷히게 했습니다.
        (CSS는 흐림 세기 자체에 그라데이션을 줄 수 없어서 쓰는 방법입니다.)
      */}
      <div
        className="absolute inset-x-0 h-[72px] backdrop-blur-[6px]"
        style={{
          bottom: toPillMiddle,
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 85%)",
          maskImage: "linear-gradient(to bottom, transparent, black 85%)",
        }}
      />
      <div
        className="absolute inset-x-0 h-[72px]"
        style={{
          bottom: toPillMiddle,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.9) 70%, #fff)",
        }}
      />
    </div>
  );
}
