"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth, type AuthStage } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { APP_NAME } from "@/lib/constants";
import { Spinner } from "@/components/ui";

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

/** 인증 상태를 확인하는 동안 잠깐 보이는 화면 */
export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-canvas">
      <Image
        src="/icon-192.png"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl shadow-[var(--shadow-card)]"
        priority
      />
      <Spinner className="h-6 w-6 text-brand-300" />
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
