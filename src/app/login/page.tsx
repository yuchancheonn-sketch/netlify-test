"use client";

import { useState } from "react";
import Image from "next/image";
import StageGate from "@/components/StageGate";
import { GoogleIcon, LockIcon } from "@/components/icons";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { APP_MEANING, APP_NAME, COURSE_FULL_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <StageGate allow={["signedOut"]}>
      <LoginScreen />
    </StageGate>
  );
}

function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setSubmitting(true);
    try {
      await signIn();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      {/*
        배경: 도산 안창호 선생 사진.
        파일이 없으면 아무것도 그려지지 않고 아래 그라데이션만 남으므로
        화면이 깨지지 않습니다. (public/brand/dosan.jpg)

        사진 위에 글자를 얹기 때문에 위아래로 옅은 막을 덮습니다.
        위쪽(하늘 부분)은 얇게 덮어 사진이 보이게 하고,
        아래쪽(어두운 양복 부분)은 짙게 덮어 버튼 글씨가 또렷하게 보이도록 했습니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-[center_top_20%] bg-no-repeat"
        style={{ backgroundImage: "url(/brand/dosan.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,250,246,0.62) 0%, rgba(255,250,246,0.45) 26%, rgba(255,250,246,0.78) 52%, rgba(255,250,246,0.96) 72%, rgb(255,250,246) 86%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-7 pt-14 pb-10">
        {/* 앱 아이콘 + 이름 */}
        <div className="flex flex-col items-center text-center">
          <div className="rounded-[28px] bg-white p-3 shadow-[var(--shadow-card)]">
            <Image
              src="/icon-192.png"
              alt={`${APP_NAME} 아이콘`}
              width={78}
              height={78}
              className="rounded-[20px]"
              priority
            />
          </div>
          <p className="mt-6 text-[13px] font-bold text-brand-700">{COURSE_FULL_NAME}</p>
          <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">{APP_NAME}</h1>
        </div>

        {/* 사진이 보이는 여백 */}
        <div className="flex-1" />

        {/* 애기애타의 뜻 */}
        <p className="rounded-2xl bg-white/70 px-5 py-4 text-center text-[13px] leading-relaxed font-medium text-brand-900 backdrop-blur-sm">
          {APP_MEANING}
        </p>

        <div className="mt-5">
          <PrimaryButton onClick={handleSignIn} loading={submitting}>
            {submitting ? null : <GoogleIcon className="h-5 w-5" />}
            Google 계정으로 시작하기
          </PrimaryButton>

          {authError ? (
            <p role="alert" className="mt-3 text-center text-[13px] font-medium text-red-600">
              {authError}
            </p>
          ) : null}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium text-ink-muted">
            <LockIcon className="h-4 w-4" />
            10기 원우만 초대 코드로 들어올 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
