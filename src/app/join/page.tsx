"use client";

import { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import StageGate, { SplashScreen } from "@/components/StageGate";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { COHORT } from "@/lib/constants";

/**
 * 처음 로그인한 사람의 계정 문서를 만드는 화면.
 *
 * 사용자가 할 일은 없습니다. 문서를 만든 뒤 곧바로 다음 화면으로 넘어갑니다.
 * (실패했을 때 다시 시도할 자리가 필요해서 화면 자체는 남겨두었습니다.)
 *
 * 계정은 **승인 대기(pending) 상태로** 만들어집니다. 구글 계정만 있으면 누구나
 * 로그인할 수 있으므로, 로그인은 "이 사람이 누구인지"까지만 알려줄 뿐
 * "10기 원우인지"는 알려주지 않기 때문입니다. 그 판단은 운영진이 합니다.
 * 여기서 status를 'approved'로 넣으면 규칙(firestore.rules)이 거부합니다 —
 * 화면 코드를 고쳐 통과시키는 길을 아예 막아두려고 두 곳에 함께 적었습니다.
 */
export default function JoinPage() {
  return (
    <StageGate allow={["needsSignUp"]}>
      <SignUpScreen />
    </StageGate>
  );
}

function SignUpScreen() {
  const { user, logOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // 화면이 다시 그려져도 계정 문서를 두 번 만들지 않도록 표시해 둡니다.
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    attempted.current = true;
    void createAccount();

    async function createAccount() {
      if (!user) return;
      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email ?? "",
          name: user.displayName ?? "",
          nickname: "",
          photoURL: user.photoURL ?? null,
          birthdayMonthDay: "",
          birthdayYear: null,
          birthdayYearPublic: false,
          memberType: "general",
          company: "",
          position: "",
          phone: "",
          councilRole: "",
          bio: "",
          introduction: "",
          introVideoUrl: "",
          role: "member",
          // 운영진이 확인해줄 때까지 대기. 규칙도 이 값만 허용합니다.
          status: "pending",
          cohort: COHORT,
          // 초대 코드는 쓰지 않지만, 나중에 되살릴 때를 위해 칸은 남겨둡니다.
          inviteCode: "",
          profileCompleted: false,
          createdAt: serverTimestamp(),
        });
        // 성공하면 프로필 문서 구독이 바뀌면서 StageGate가 다음 화면으로 보냅니다.
      } catch (caught) {
        /*
         * 실패한 진짜 이유를 화면에 함께 남깁니다.
         * 특히 permission-denied는 "보안 규칙을 아직 올리지 않았다"는 뜻이라,
         * 원우가 이 화면을 찍어 보내주면 운영진이 바로 알아볼 수 있습니다.
         */
        const code = (caught as { code?: string })?.code ?? "";
        setError(
          code === "permission-denied"
            ? "앱 설정이 아직 안 끝났어요. 운영진에게 알려주세요. (Firestore 보안 규칙 게시 필요 · permission-denied)"
            : `계정을 만들지 못했어요. 잠시 후 다시 시도해 주세요.${code ? ` (${code})` : ""}`,
        );
      }
    }
  }, [user]);

  if (!error) return <SplashScreen />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-7 text-center">
      <span className="text-[40px]" aria-hidden="true">
        😥
      </span>
      <h1 className="mt-5 text-[20px] font-bold text-ink">시작하지 못했어요</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{error}</p>

      <div className="mt-8 w-full">
        <PrimaryButton
          onClick={() => {
            attempted.current = false;
            setError(null);
          }}
        >
          다시 시도
        </PrimaryButton>
      </div>

      <button
        type="button"
        onClick={() => void logOut()}
        className="mt-6 text-[13px] font-bold text-ink-muted underline underline-offset-4"
      >
        다른 계정으로 로그인하기
      </button>
    </div>
  );
}
