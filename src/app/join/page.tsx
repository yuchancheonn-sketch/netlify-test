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
 * 지금은 Google 로그인만 하면 바로 들어올 수 있어서, 사용자가 할 일이 없습니다.
 * 그래서 화면을 보여주지 않고 문서를 만든 뒤 곧바로 프로필 설정으로 넘어갑니다.
 * (실패했을 때 다시 시도할 자리가 필요해서 화면 자체는 남겨두었습니다.)
 *
 * 나중에 초대 코드를 다시 쓰고 싶어지면, 이 화면에 코드 입력칸을 두고
 * firestore.rules 의 isValidInviteCode() 검사를 create 규칙에 되살리면 됩니다.
 * 두 곳 모두 지우지 않고 남겨두었습니다.
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
          status: "approved",
          cohort: COHORT,
          // 초대 코드는 쓰지 않지만, 나중에 되살릴 때를 위해 칸은 남겨둡니다.
          inviteCode: "",
          profileCompleted: false,
          createdAt: serverTimestamp(),
        });
        // 성공하면 프로필 문서 구독이 바뀌면서 StageGate가 다음 화면으로 보냅니다.
      } catch {
        setError("계정을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
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
