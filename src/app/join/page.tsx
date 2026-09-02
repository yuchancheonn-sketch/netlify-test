"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import StageGate from "@/components/StageGate";
import { LockIcon } from "@/components/icons";
import { FieldError, PrimaryButton, inputClassName } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { APP_NAME, COHORT } from "@/lib/constants";

export default function JoinPage() {
  return (
    <StageGate allow={["needsInviteCode"]}>
      <JoinScreen />
    </StageGate>
  );
}

function JoinScreen() {
  const { user, logOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedCode = code.trim().toUpperCase();
  const canSubmit = normalizedCode.length >= 4 && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      /*
       * 초대 코드가 맞는지는 Firestore 보안 규칙이 판단합니다.
       * (규칙이 inviteCodes/{코드} 문서가 있고 active인지 확인합니다.)
       * 그래서 앱은 초대 코드 목록을 읽을 권한이 아예 없고,
       * 코드가 틀리면 아래 쓰기가 권한 오류로 거절됩니다.
       *
       * 코드가 맞으면 바로 approved로 만들어 기다림 없이 입장합니다.
       * 비공개성은 초대 코드가 지킵니다. 문제가 생긴 계정은 운영진 화면에서
       * 다시 막을 수 있습니다.
       */
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
        bio: "",
        role: "member",
        status: "approved",
        cohort: COHORT,
        inviteCode: normalizedCode,
        profileCompleted: false,
        createdAt: serverTimestamp(),
      });
      // 성공하면 프로필 문서 구독이 바뀌면서 StageGate가 승인 대기 화면으로 보냅니다.
    } catch (caught) {
      const errorCode = (caught as { code?: string })?.code ?? "";
      if (errorCode === "permission-denied") {
        setError("초대 코드가 올바르지 않아요. 운영진에게 다시 확인해 주세요.");
      } else {
        setError("가입 신청에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-7 pt-16 pb-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <LockIcon className="h-7 w-7" />
      </span>

      <h1 className="mt-6 text-[26px] font-bold leading-snug tracking-tight text-ink">
        초대 코드를 입력해 주세요
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        {APP_NAME}는 {COHORT} 원우들만 쓰는 비공개 공간이에요.
        <br />
        운영진이 단체 대화방에 공유한 코드를 넣으면 바로 시작할 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
          }}
          placeholder="예: AGT10A"
          aria-label="초대 코드"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          className={`${inputClassName} text-center text-[22px] font-bold tracking-[0.35em] uppercase placeholder:tracking-normal placeholder:text-[16px] placeholder:font-normal`}
        />
        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6">
          <PrimaryButton type="submit" disabled={!canSubmit} loading={submitting}>
            시작하기
          </PrimaryButton>
        </div>
      </form>

      <div className="flex-1" />

      <div className="mt-10 text-center">
        <p className="text-[13px] text-ink-faint">
          {user?.email} 계정으로 로그인되어 있어요
        </p>
        <button
          type="button"
          onClick={() => void logOut()}
          className="mt-2 text-[13px] font-bold text-ink-muted underline underline-offset-4"
        >
          다른 계정으로 로그인하기
        </button>
      </div>
    </div>
  );
}
