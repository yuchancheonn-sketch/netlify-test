import type { ReactNode } from "react";
import MainShell from "@/components/MainShell";
import StageGate from "@/components/StageGate";

/**
 * 승인 + 프로필 설정을 모두 마친 원우만 볼 수 있는 화면들의 공통 껍데기.
 * 모바일 우선이지만 데스크톱에서는 가운데 정렬된 좁은 폭으로 보여
 * 한 손에 들어오는 느낌을 유지합니다.
 *
 * 화면 폭·하단 탭바는 MainShell이 맡습니다. 대화방처럼 탭바를 감춰야 하는
 * 화면이 있어서 주소를 봐야 하고, 그건 클라이언트에서만 알 수 있습니다.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <StageGate allow={["ready"]}>
      <MainShell>{children}</MainShell>
    </StageGate>
  );
}
