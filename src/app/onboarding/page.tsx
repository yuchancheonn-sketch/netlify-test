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
    <div className="mx-auto w-full max-w-[520px]">
      <header className="px-5 pt-12 pb-6">
        <p className="text-[13px] font-bold text-brand-600">가입 승인 완료 🎉</p>
        <h1 className="mt-2 text-[26px] font-bold leading-snug tracking-tight text-ink">
          원우들에게 보여줄
          <br />
          내 소개를 채워 주세요
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
          한 번만 채우면 되고, 나중에 언제든 프로필에서 바꿀 수 있어요.
        </p>
      </header>

      <ProfileForm mode="onboarding" onSaved={() => router.replace("/home")} />
    </div>
  );
}
