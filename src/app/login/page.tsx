"use client";

import Image from "next/image";
import StageGate from "@/components/StageGate";
import { GoogleIcon, LockIcon } from "@/components/icons";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  APP_MEANING,
  APP_NAME,
  APP_TAGLINE,
  COURSE_FULL_NAME,
} from "@/lib/constants";
import { useState } from "react";

/** 로그인 화면에 소개할 앱의 주요 기능들 */
const FEATURES = [
  {
    emoji: "🤝",
    title: "원우 소개",
    description: "우리 기수 얼굴과 이름을 한곳에",
  },
  {
    emoji: "🎬",
    title: "복습 영상 · 행사 사진",
    description: "수업 다시보기와 그날의 기록",
  },
  {
    emoji: "📅",
    title: "모임 일정 · 소감 나눔",
    description: "다음 모임과 오늘의 배움을 함께",
  },
];

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
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-7 pt-14 pb-10">
      {/* 앱 아이콘 + 이름 */}
      <div className="flex flex-col items-center text-center">
        <div className="rounded-[28px] bg-white p-3 shadow-[var(--shadow-card)]">
          <Image
            src="/icon-192.png"
            alt={`${APP_NAME} 아이콘`}
            width={84}
            height={84}
            className="rounded-[20px]"
            priority
          />
        </div>
        <p className="mt-6 text-[13px] font-medium text-brand-600">{COURSE_FULL_NAME}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">{APP_NAME}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">{APP_TAGLINE}</p>
      </div>

      {/* 기능 소개 */}
      <ul className="mt-10 flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex items-center gap-3.5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[22px] shadow-[var(--shadow-card)]"
              aria-hidden="true"
            >
              {feature.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-ink">{feature.title}</span>
              <span className="block text-[13px] text-ink-faint">{feature.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      {/* 애기애타의 뜻 */}
      <p className="mt-10 rounded-2xl bg-brand-50 px-5 py-4 text-center text-[13px] leading-relaxed text-brand-800">
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

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-ink-faint">
          <LockIcon className="h-4 w-4" />
          10기 원우만 초대 코드로 들어올 수 있어요
        </p>
      </div>
    </div>
  );
}
