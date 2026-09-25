"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import BottomTabBar, { TAB_ROOTS } from "@/components/BottomTabBar";

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

/** 화면 좌우 끝에서 이 폭 안쪽으로 시작한 손짓을 막습니다(아이폰 사파리의 뒤로·앞으로 밀기 자리). */
const EDGE_PX = 20;

/**
 * 탭 첫 화면에서는 아이폰의 "화면 끝을 밀어 뒤로 가기"를 막습니다 (2026-09-25 사용자 요청 "모든 탭화면들이 다 이렇게 밀리잖아").
 *
 * 탭은 앱의 맨 바깥이라 뒤로 갈 곳이 없어야 하는데, 브라우저 기록에는 앞서 본 탭·화면이 남아 있어
 * 왼쪽 끝을 밀면 그 화면이 옆에서 끌려 나왔습니다. 탭 이동을 기록에 안 쌓게(BottomTabBar의 replace) 해도
 * 이미 쌓인 기록이나 하위 화면에서 돌아올 때 쌓인 기록은 남습니다. 그래서 손짓 자체를 막습니다.
 *
 * 방법: 화면 좌우 끝 20px에서 시작한 터치의 touchstart에 preventDefault — 사파리가 그 손짓을
 * 뒤로·앞으로 가기로 쓰지 못합니다. passive: false여야 먹습니다.
 * 대가로 그 20px 띠 안을 톡 누르는 것도 눌리지 않습니다. 탭 첫 화면의 카드·단추는 끝에서 16px 들어와
 * 시작해 걸치는 것이 거의 없고, 뒤로(‹) 단추가 있는 하위 화면(설정·알림·모임 등)에서는 막지 않습니다 —
 * 거기서는 밀어서 뒤로 가는 것이 맞는 동작입니다.
 */
function useBlockEdgeSwipe(active: boolean) {
  useEffect(() => {
    if (!active) return;
    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      if (touch.clientX < EDGE_PX || touch.clientX > window.innerWidth - EDGE_PX) {
        event.preventDefault();
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => document.removeEventListener("touchstart", onTouchStart);
  }, [active]);
}

export default function MainShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullScreen = isInsideChatRoom(pathname);
  useBlockEdgeSwipe(TAB_ROOTS.includes(pathname));

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
        {/*
          맨 끝까지 내려도 마지막 줄이 알약에 가리지 않도록 여백을 둡니다.
          알약 윗변이 바닥에서 60px이라(띄운 -4px + 높이 64px) 그보다 넉넉히
          잡았습니다. 탭바를 감추는 대화방에서는 없앱니다.
        */}
        <main
          className={
            fullScreen
              ? "flex flex-1 flex-col"
              : // 알약 바닥 높이 + 82px (홈 화면 앱은 예전 78px + 홈 바와 같음, Safari 등은 94px) — 2026-09-26.
                "flex-1 pb-[calc(max(12px,calc(-4px+env(safe-area-inset-bottom)))+82px)]"
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
 * 기준이 되는 28px = 알약을 바닥에서 띄운 -4px + 알약 높이 64px의 절반.
 * 알약 높이나 띄운 높이를 바꾸면 이 값도 같이 맞춰야 합니다.
 * 퍼센트 대신 픽셀로 잡은 이유는, 아이폰마다 다른 홈 바 높이
 * (safe-area)까지 더해지면 퍼센트로는 기준점이 흔들리기 때문입니다.
 */
function BottomTabBarScrim() {
  /** 화면 바닥부터 알약 한가운데까지 — 딱 이 구간만 덮습니다. */
  // 알약 바닥 높이(BottomTabBar의 max(12px, -4px + 홈 바)) + 알약 높이의 절반 32px (2026-09-26, 예전엔 28px + 홈 바).
  const height = "calc(max(12px, calc(-4px + env(safe-area-inset-bottom))) + 32px)";
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

      {/*
        바탕 기운. 반투명하게만 얹어, 뒤가 아예 안 보이지는 않게 둡니다.
        색은 globals.css의 --scrim 을 따릅니다 — 흰색으로 박아두면
        어두운 화면에서 탭바 뒤만 뿌옇게 밝아집니다.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgb(var(--scrim) / 0), rgb(var(--scrim) / 0.5))",
        }}
      />
    </div>
  );
}
