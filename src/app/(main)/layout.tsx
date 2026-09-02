import type { ReactNode } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import StageGate from "@/components/StageGate";

/**
 * 승인 + 프로필 설정을 모두 마친 원우만 볼 수 있는 화면들의 공통 껍데기.
 * 모바일 우선이지만 데스크톱에서는 가운데 정렬된 좁은 폭으로 보여
 * 한 손에 들어오는 느낌을 유지합니다.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <StageGate allow={["ready"]}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
        {/* 하단 탭바에 내용이 가리지 않도록 여백을 둡니다. */}
        <main className="flex-1 pb-[calc(76px+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </StageGate>
  );
}
