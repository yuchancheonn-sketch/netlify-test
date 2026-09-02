"use client";

import { useState } from "react";
import Image from "next/image";
import StageGate from "@/components/StageGate";
import { GoogleIcon, LockIcon } from "@/components/icons";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  APP_DEFINITION_BODY,
  APP_NAME,
  COHORT,
  COURSE_FULL_NAME,
} from "@/lib/constants";

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
      {/*
        사진을 화면 위쪽 24% 아래에서 시작하게 해, 얼굴이 제목·아이콘에
        가리지 않고 그 아래에 놓이도록 했습니다.
        사진을 키워서 내리는 방법도 있지만 원본이 640px이라 흐려집니다.
        시작 위치만 내리면 화질을 그대로 두고 배치만 바꿀 수 있습니다.

        위쪽 가장자리가 선처럼 보이지 않도록 마스크로 서서히 나타나게 합니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[24%] bottom-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/brand/dosan.jpg)",
          backgroundPosition: "50% 0%",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 14%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 14%)",
        }}
      />
      {/* 아래로 갈수록 짙어지는 막 — 얼굴은 드러내고 버튼 쪽은 또렷하게 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,250,246,0.5) 0%, rgba(255,250,246,0.28) 38%, rgba(255,250,246,0.68) 60%, rgba(255,250,246,0.95) 74%, rgb(255,250,246) 84%)",
        }}
      />

      {/*
        아래 여백을 두 배로 늘려 정의 문구와 로그인 버튼을 위로 올렸습니다.
        사파리 하단 주소창에 버튼이 가려지지 않게 하는 역할도 합니다.
      */}
      <div
        className="relative flex min-h-dvh w-full flex-col px-7 pt-14"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        {/* 앱 아이콘 + 이름 */}
        <div className="flex flex-col items-center text-center">
          {/* 흰 테두리는 아이콘이 배경 사진에서 살짝 떠 보일 만큼만 얇게 둡니다. */}
          <div className="rounded-[22px] bg-white p-[3px] shadow-[var(--shadow-card)]">
            <Image
              src="/icon-192.png"
              alt={`${APP_NAME} 아이콘`}
              width={80}
              height={80}
              className="rounded-[19px]"
              priority
            />
          </div>
          <p className="mt-6 text-[13px] font-bold text-brand-700">{COURSE_FULL_NAME}</p>
          <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">{APP_NAME}</h1>
        </div>

        {/* 사진이 보이는 여백 */}
        <div className="flex-1" />

        {/*
          애기애타의 뜻. 상자 없이 사진 위에 바로 얹어 화면이 트여 보이게 했습니다.
          서예 로고와 결을 맞춰 명조체로 씁니다.
        */}
        <p className="text-center font-serif text-[19px] leading-relaxed font-semibold text-ink">
          {APP_DEFINITION_BODY}
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
            {COHORT} 원우들을 위한 공간이에요
          </p>
        </div>
      </div>
    </div>
  );
}
