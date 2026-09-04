"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type AuthStage } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  APP_DEFINITION_HANJA,
  APP_NAME,
  COURSE_FULL_NAME,
} from "@/lib/constants";

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
  return (
    // 사진을 본문과 같은 폭 안에 가두어, 넓은 화면에서 얼굴만 크게 확대되지
    // 않고 휴대폰에서 보는 것과 같은 비율로 보이게 합니다. (로그인 화면과 같은 방식)
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-white">
      {/*
        도산 안창호 선생 사진.

        사진을 키워 내리지 않고 시작 위치만 내립니다. 원본이 640px이라
        키우면 흐려집니다. 위 가장자리는 마스크로 서서히 나타나게 해서
        사진이 잘린 선처럼 보이지 않게 합니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[24%] bottom-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/brand/dosan.jpg)",
          backgroundPosition: "50% 0%",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 11%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 11%)",
        }}
      />

      {/*
        흰 막 — 로그인 화면보다 훨씬 옅게 덮습니다.

        로그인 화면은 사진 위에 버튼과 글씨를 얹어야 해서 얼굴 위까지 짙게
        덮지만, 여기는 얹는 것이 없으니 얼굴을 거의 그대로 드러냅니다.
        아래쪽만 흰색으로 마무리해서 사진이 화면 바닥에서 잘리지 않고
        흰 바탕으로 스며들게 합니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.72) 84%, rgb(255,255,255) 96%)",
        }}
      />

      <div
        className="relative flex min-h-dvh w-full flex-col items-center px-8 pt-16"
        style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
      >
        <p className="animate-splash-in text-[13px] font-bold text-brand-500">
          {COURSE_FULL_NAME}
        </p>

        {/*
          애기애타(愛己愛他)를 두 글자씩 세로로 세워 얼굴 양옆에 둡니다.
          세로쓰기는 오른쪽 줄부터 읽으므로 오른쪽이 愛己, 왼쪽이 愛他입니다.
          앱 아이콘의 글자 배치와 같습니다.
        */}
        <div
          aria-label={APP_DEFINITION_HANJA}
          role="img"
          className="animate-splash-in pointer-events-none absolute inset-x-0 top-[27%] flex justify-between px-5 font-serif text-[60px] leading-none font-semibold text-ink"
        >
          <span className="flex flex-col items-center gap-4">
            <span aria-hidden="true">愛</span>
            <span aria-hidden="true">他</span>
          </span>
          <span className="flex flex-col items-center gap-4">
            <span aria-hidden="true">愛</span>
            <span aria-hidden="true">己</span>
          </span>
        </div>

        {/* 사진이 보이는 자리 */}
        <div className="flex-1" />

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
