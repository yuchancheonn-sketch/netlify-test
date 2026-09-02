"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth-context";
import { COHORT } from "@/lib/constants";

export default function ProfilePage() {
  const { logOut, isAdmin, profile } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  function handleSaved() {
    setSaved(true);
    // 저장했다는 표시를 잠깐만 보여줍니다.
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <>
      <PageHeader title="내 프로필" back />

      {saved ? (
        <p
          role="status"
          className="mx-5 mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-center text-[14px] font-bold text-brand-700"
        >
          저장했어요
        </p>
      ) : null}

      <ProfileForm mode="edit" onSaved={handleSaved} />

      <div className="px-5 pb-10">
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
          <dl className="flex items-center justify-between text-[14px]">
            <dt className="text-ink-faint">소속</dt>
            <dd className="font-bold text-ink">{profile?.cohort || COHORT}</dd>
          </dl>
          <dl className="mt-3 flex items-center justify-between text-[14px]">
            <dt className="text-ink-faint">권한</dt>
            <dd className="font-bold text-ink">{isAdmin ? "운영진" : "원우"}</dd>
          </dl>
          <dl className="mt-3 flex items-center justify-between gap-4 text-[14px]">
            <dt className="shrink-0 text-ink-faint">로그인 계정</dt>
            <dd className="truncate text-ink-soft">{profile?.email}</dd>
          </dl>
        </div>

        <button
          type="button"
          onClick={async () => {
            await logOut();
            router.replace("/login");
          }}
          className="mt-5 w-full rounded-2xl bg-white py-4 text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          로그아웃
        </button>

        <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-faint">
          탈퇴를 원하시면 운영진에게 알려주세요.
          <br />
          작성한 글과 사진을 함께 정리해 드릴게요.
        </p>
      </div>
    </>
  );
}
