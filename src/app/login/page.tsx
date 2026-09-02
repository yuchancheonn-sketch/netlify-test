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
    // 배경 사진을 본문과 같은 폭 안에 가두어, 넓은 화면에서 얼굴만 크게
    // 확대되지 않고 휴대폰에서 보는 것과 같은 비율로 보이게 합니다.
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-canvas">
      {/*
        배경: 도산 안창호 선생 사진 (public/brand/dosan.jpg).
        파일이 없으면 아무것도 그려지지 않고 아래 막만 남으므로 화면이 깨지지 않습니다.

        사진 위에 글자를 얹기 때문에 위아래로 농도가 다른 막을 덮습니다.
        위쪽(밝은 하늘)은 얇게 덮어 사진이 보이게 하고,
        아래쪽(어두운 양복)은 짙게 덮어 버튼 글씨가 또렷하게 보이도록 했습니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/brand/dosan.jpg)",
          backgroundPosition: "50% 12%",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,250,246,0.66) 0%, rgba(255,250,246,0.42) 24%, rgba(255,250,246,0.72) 48%, rgba(255,250,246,0.95) 68%, rgb(255,250,246) 82%)",
        }}
      />

      <div className="relative flex min-h-dvh w-full flex-col px-7 pt-14 pb-10">
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
