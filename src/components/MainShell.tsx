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
          맨 끝까지 내려도 마지막 줄이 알약에 가리지 않도록 여백을 둡니다.
          알약 윗변이 바닥에서 76px이라(띄운 12px + 높이 64px) 그보다 넉넉히
          잡았습니다. 탭바를 감추는 대화방에서는 없앱니다.
        */}
        <main
          className={
            fullScreen
              ? "flex flex-1 flex-col"
              : "flex-1 pb-[calc(94px+env(safe-area-inset-bottom))]"
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
 * 알약 아래쪽으로 지나가는 내용을 부드럽게 흐리는 층.
 *
 * 알약은 떠 있는 모양이라 그 아래와 양옆으로 글자가 지나갑니다.
 * 알약의 세로 한가운데부터 화면 바닥까지만 덮고, 그 위로는 손대지 않습니다.
 * 덮는 구간 안에서도 위 끝은 아무 효과가 없다가 아래로 갈수록 흐려지고
 * 흰 기운이 옅게 얹힙니다. 가리는 게 아니라 잠기게 하는 정도입니다.
 *
 * 기준이 되는 44px = 알약을 바닥에서 띄운 12px + 알약 높이 64px의 절반.
 * 알약 높이나 띄운 높이를 바꾸면 이 값도 같이 맞춰야 합니다.
 * 퍼센트 대신 픽셀로 잡은 이유는, 아이폰마다 다른 홈 바 높이
 * (safe-area)까지 더해지면 퍼센트로는 기준점이 흔들리기 때문입니다.
 */
function BottomTabBarScrim() {
  /** 화면 바닥부터 알약 한가운데까지 — 딱 이 구간만 덮습니다. */
  const height = "calc(44px + env(safe-area-inset-bottom))";
  /** 위 끝에서 아무 효과 없이 시작해 아래로 갈수록 짙어지는 정도 */
  const fade = "linear-gradient(to bottom, transparent, black 75%)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10"
      style={{ height }}
    >
      {/*
        흐림. 덧씌운 마스크로 위 끝에서는 걷히고 아래로 갈수록 짙어집니다.
        (CSS는 흐림 세기 자체에 그라데이션을 줄 수 없어서 쓰는 방법입니다.)
      */}
      <div
        className="absolute inset-0 backdrop-blur-[7px]"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      />

      {/* 흰 기운. 반투명하게만 얹어, 뒤가 아예 안 보이지는 않게 둡니다. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.5))",
        }}
      />
    </div>
  );
}
