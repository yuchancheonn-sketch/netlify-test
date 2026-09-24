import type { ReactNode } from "react";
import MainShell from "@/components/MainShell";
import FirstRunSetupPrompt from "@/components/FirstRunSetupPrompt";
import { LoginPromptProvider } from "@/components/LoginRequired";
import PushSync from "@/components/PushSync";
import StageGate from "@/components/StageGate";

/**
 * 본편 화면들의 공통 껍데기.
 *
 * ★ 로그인 안 한 사람(signedOut)도 들어옵니다 (2026-09-24 사용자 요청 "보는 것만큼 로그인 없이").
 *   보는 것은 그대로 보이고, 올리기·수정은 LoginRequired가 로그인을 안내합니다. 원우마다 다른 화면(채팅·알림·
 *   내 프로필)은 그 화면이 안내 상자를 세웁니다. 가입 도중(needsSignUp 등)인 사람은 예전처럼 그 단계 화면으로 갑니다.
 * 모바일 우선이지만 데스크톱에서는 가운데 정렬된 좁은 폭으로 보여
 * 한 손에 들어오는 느낌을 유지합니다.
 *
 * 화면 폭·하단 탭바는 MainShell이 맡습니다. 대화방처럼 탭바를 감춰야 하는
 * 화면이 있어서 주소를 봐야 하고, 그건 클라이언트에서만 알 수 있습니다.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <StageGate allow={["ready", "signedOut"]}>
      <PushSync />
      {/*
        가입을 마치고 처음 들어온 기기에 딱 한 번 뜹니다 — 알림 받기 + 폰 캘린더 연결(2026-09-23, 예전엔 알림만).
        StageGate 안에 두어, 로그인·가입을 다 마친 뒤에만 물어봅니다.
      */}
      <FirstRunSetupPrompt />
      <LoginPromptProvider>
        <MainShell>{children}</MainShell>
      </LoginPromptProvider>
    </StageGate>
  );
}
