"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { ChevronRightIcon } from "@/components/icons";
import ProfileForm from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth-context";
import { useSwipeBack } from "@/lib/use-swipe-back";
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

  /*
   * 오른쪽으로 밀어서 앞 화면으로 — 왼쪽 위 < 버튼과 같은 동작입니다.
   * 손짓을 읽는 부분은 대화방과 함께 쓰는 lib/use-swipe-back.ts에 있습니다.
   *
   * router.back()을 쓰는 이유: 이 화면은 홈·원우수첩·자료·채팅·소식 어느
   * 탭에서든 제목 줄의 사람 아이콘으로 들어옵니다. 갈 곳을 하나로 못 박으면
   * 원우가 있던 탭이 아니라 엉뚱한 탭으로 나가게 됩니다.
   * (제목 줄의 < 버튼도 같은 router.back()입니다.)
   */
  const swipe = useSwipeBack({ onCommit: () => router.back() });

  return (
    /*
      밀려나는 부분과 손짓을 받는 부분이 같은 상자입니다.
      대화방처럼 둘로 나눌 필요가 없습니다 — 이 화면에는 떠 있는(fixed) 요소가
      없어서, 통째로 transform을 걸어도 자리가 틀어질 것이 없습니다.

      바탕색은 body와 같은 canvas라, 밀려나 드러나는 자리도 색이 이어집니다.
      min-h-dvh는 일부러 주지 않습니다 — MainShell이 이미 탭바 자리만큼 아래
      여백을 두고 있어서, 여기에 화면 높이를 또 못 박으면 그 둘이 더해져
      내용이 짧아도 화면이 괜히 스크롤됩니다.
    */
    <div
      className="bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="내 프로필" back />

      {saved ? (
        <p
          role="status"
          className="mx-5 mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-center text-[14px] font-bold text-brand-500"
        >
          저장했어요
        </p>
      ) : null}

      <ProfileForm mode="edit" onSaved={handleSaved} />

      <div className="px-4 pb-10">
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

        {isAdmin ? (
          <Link
            href="/admin"
            className="mt-3 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            <span className="text-[15px] font-bold text-ink">운영진 화면</span>
            <span className="flex items-center gap-1 text-[13px] text-ink-faint">
              가입 승인 · 명단 관리
              <ChevronRightIcon className="h-4 w-4" />
            </span>
          </Link>
        ) : null}

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
    </div>
  );
}
