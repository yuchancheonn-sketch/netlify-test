"use client";

import StageGate, { SplashScreen } from "@/components/StageGate";

/**
 * 시작 지점.
 * 어떤 화면도 직접 그리지 않고, 로그인·가입 단계에 맞는 화면으로 보내기만 합니다.
 * (홈 화면에 추가한 앱이 항상 이 주소로 열립니다.)
 */
export default function RootPage() {
  return (
    <StageGate allow={[]}>
      <SplashScreen />
    </StageGate>
  );
}
