"use client";

import StageGate from "@/components/StageGate";
import { useAuth } from "@/lib/auth-context";
import { COHORT } from "@/lib/constants";

export default function PendingPage() {
  return (
    <StageGate allow={["pending"]}>
      <PendingScreen />
    </StageGate>
  );
}

function PendingScreen() {
  const { profile, logOut } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-7 py-12 text-center">
      <span
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-[36px]"
        aria-hidden="true"
      >
        ⏳
      </span>

      <h1 className="mt-7 text-[24px] font-bold leading-snug tracking-tight text-ink">
        운영진 승인을 기다리고 있어요
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
        가입 신청이 정상적으로 접수됐어요.
        <br />
        운영진이 {COHORT} 원우가 맞는지 확인하면
        <br />
        바로 이 화면에서 앱으로 넘어갑니다.
      </p>

      <div className="mt-8 w-full rounded-2xl bg-white p-5 text-left shadow-[var(--shadow-card)]">
        <p className="text-[13px] font-bold text-ink-faint">신청한 계정</p>
        <p className="mt-1.5 text-[15px] font-bold text-ink">{profile?.name || "이름 없음"}</p>
        <p className="text-[14px] text-ink-muted">{profile?.email}</p>
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-ink-faint">
        승인되면 새로고침하지 않아도 자동으로 바뀌어요.
        <br />
        오래 걸린다면 운영진에게 알려주세요.
      </p>

      <button
        type="button"
        onClick={() => void logOut()}
        className="mt-8 text-[13px] font-bold text-ink-muted underline underline-offset-4"
      >
        로그아웃
      </button>
    </div>
  );
}
