"use client";

import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import StageGate from "@/components/StageGate";

export default function OnboardingPage() {
  return (
    <StageGate allow={["needsOnboarding"]}>
      <OnboardingScreen />
    </StageGate>
  );
}

function OnboardingScreen() {
  const router = useRouter();

  return (
    /*
      바탕은 흰색(surface) — 2026-09-27 사용자 요청("다른 창들과 일관성 있게, 흰색 배경에 회색 박스").
      칸은 ProfileForm이 내 프로필 화면과 똑같이 회색·그림자 없음으로 그립니다.
      min-h-dvh로 내용이 짧아도 화면 끝까지 흰색이 덮게 합니다(이 화면은 MainShell 밖이라 탭바 여백이 없음).
    */
    <div className="min-h-dvh bg-surface">
      {/*
        맨 위 시계 줄까지 흰색으로 (2026-09-27 사용자 "위에가 회색이야").
        아이폰은 시계 줄 색을 화면 맨 위에 붙은(fixed·sticky) 요소의 바탕에서 따오고, 그런 게 없으면 테마 색(회색)을 씁니다.
        다른 화면은 흰 제목 줄(PageHeader, sticky)이 그 역할을 하는데 이 화면엔 제목 줄이 없어서, 흰 줄을 맨 위에 붙여 둡니다.
        높이는 시계 줄 아래까지(safe-area) — 시계 줄 밑으로 화면이 들어가지 않는 경우에도 2px은 깝니다(globals.css 확인 창 막과 같은 방법).
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[max(env(safe-area-inset-top),2px)] bg-surface"
      />
      <div className="mx-auto w-full max-w-[520px]">
        <header className="px-5 pt-12 pb-6">
          <p className="text-[13px] font-bold text-brand-500">가입 승인 완료 🎉</p>
          <h1 className="mt-2 text-[26px] font-bold leading-snug tracking-tight text-ink">
            원우들에게 보여줄
            <br />
            내 소개를 채워 주세요
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            <span className="font-bold text-ink-soft">이름·전화번호·기수만 넣으면 바로 시작</span>할 수 있어요.
            나머지는 나중에 프로필에서 채워도 되고, 원우들이 대신 채워주기도 합니다.
          </p>
        </header>

        <ProfileForm mode="onboarding" onSaved={() => router.replace("/home")} />
      </div>
    </div>
  );
}
