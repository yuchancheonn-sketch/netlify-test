"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth, type AuthStage } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { APP_NAME } from "@/lib/constants";
import { quoteOfTheDay } from "@/lib/quotes";

/** 각 단계에서 사용자가 있어야 할 화면 */
const STAGE_PATH: Record<Exclude<AuthStage, "loading">, string> = {
  signedOut: "/login",
  needsSignUp: "/join",
  pending: "/pending",
  needsOnboarding: "/onboarding",
  ready: "/home",
};

/**
 * 로그인·가입 단계에 맞지 않는 화면에 들어오면 알맞은 화면으로 돌려보냅니다.
 *
 * 이 가드는 "길 안내"일 뿐이고, 실제 데이터 접근 차단은 Firestore 보안 규칙이
 * 담당합니다. 브라우저에서 코드를 고쳐 화면을 열더라도 데이터는 내려오지 않습니다.
 */
export default function StageGate({
  allow,
  children,
}: {
  allow: AuthStage[];
  children: ReactNode;
}) {
  const { stage } = useAuth();
  const router = useRouter();
  const allowed = allow.includes(stage);

  useEffect(() => {
    if (stage === "loading" || allowed) return;
    router.replace(STAGE_PATH[stage]);
  }, [stage, allowed, router]);

  if (!isFirebaseConfigured) return <SetupNotice />;
  if (!allowed) return <SplashScreen />;
  return <>{children}</>;
}

/**
 * 인증 상태를 확인하는 동안 잠깐 보이는 화면.
 *
 * 도는 동그라미 대신 도산 선생의 사진과 그날의 말씀을 띄웁니다.
 * 기다리는 시간을 말씀 한 줄 읽는 시간으로 씁니다.
 *
 * 말씀은 홈 화면의 "오늘의 도산"과 같은 것입니다 — 같은 날 앱을 열면
 * 로딩 화면에서 본 말씀이 홈에서 다시 보여, 두 화면이 이어집니다.
 */
export function SplashScreen() {
  const quote = quoteOfTheDay();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-white px-9">
      <div className="animate-splash-in relative h-[136px] w-[136px] shrink-0 overflow-hidden rounded-full shadow-[var(--shadow-card)]">
        {/*
          세로로 긴 사진이라 정사각으로 자르면 위아래가 잘립니다.
          위쪽을 기준으로 잘라야 얼굴이 원 안에 들어옵니다.
        */}
        <Image
          src="/brand/dosan.jpg"
          alt="도산 안창호 선생"
          fill
          sizes="136px"
          className="object-cover"
          style={{ objectPosition: "50% 0%" }}
          priority
        />
      </div>

      <div className="animate-splash-in max-w-[26ch] text-center">
        <p className="font-serif text-[15px] leading-[1.9] text-ink">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="mt-3 text-[12px] font-bold text-brand-500">도산 안창호</p>
      </div>

      {/*
        조용한 화면이라 아무것도 움직이지 않으면 멈춘 것처럼 보입니다.
        점 세 개가 차례로 옅어졌다 밝아지며, 아직 불러오는 중이라고 알려줍니다.
      */}
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-splash-dot h-1.5 w-1.5 rounded-full bg-ink-faint"
            style={{ animationDelay: `${index * 0.18}s` }}
          />
        ))}
      </div>
      <span className="sr-only">불러오는 중이에요</span>
    </div>
  );
}

/** .env.local을 아직 채우지 않았을 때 원인을 알려주는 화면 (개발 편의용) */
function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[var(--shadow-card)]">
        <h1 className="text-[18px] font-bold text-ink">Firebase 설정이 필요해요</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          {APP_NAME} 앱을 실행하려면 프로젝트 루트에{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[13px]">.env.local</code>{" "}
          파일을 만들고 Firebase 설정값을 넣어야 합니다.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[13px]">
            .env.local.example
          </code>{" "}
          파일을 복사해서 값을 채운 뒤 개발 서버를 다시 시작해 주세요. 자세한 절차는
          README의 &ldquo;처음 한 번만 해야 하는 설정&rdquo;에 정리해 두었습니다.
        </p>
      </div>
    </div>
  );
}
