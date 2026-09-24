"use client";

import GuestGate from "@/components/GuestGate";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import { useSwipeBack } from "@/lib/use-swipe-back";

function ProfilePageContent() {
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

      바탕색은 흰색(surface) — 2026-09-23 사용자 요청으로 회색(canvas)에서 바꿨습니다.
      칸들은 ProfileForm이 mode="edit"일 때 옅은 회색·그림자 없음으로 그립니다.
      제목 줄도 tone="surface"로 맞춥니다(안 하면 제목 줄만 회색으로 남음).
      ★ MainShell의 <main>이 탭바 자리로 아래 여백 78px+홈 바를 두는데, 그 여백은 body(회색)라
        맨 아래까지 내리면 탭바 뒤에 회색 띠가 보입니다. 같은 값을 음수 margin으로 파고들고
        padding으로 되채워 흰 바탕이 그 자리까지 덮게 합니다. MainShell 값을 바꾸면 같이 바꾸세요.

      min-h-full: 내용이 짧을 때도 상자가 화면 아래까지 내려와 있어야 합니다.
      높이를 주지 않으면 상자가 마지막 칸에서 끝나고, 그 아래 빈 자리에서
      시작한 손짓은 상자 밖이라 아무 데도 닿지 않습니다.

      dvh가 아니라 full(=부모 높이의 100%)인 것이 중요합니다. MainShell이
      이미 탭바 자리만큼 아래 여백을 두고 있어서, 여기에 화면 높이를 또 못
      박으면 그 둘이 더해져 내용이 짧아도 화면이 괜히 스크롤됩니다.
      부모의 안쪽 높이에 맞추면 그 여백을 빼고 딱 맞습니다.
    */
    <div
      className="-mb-[calc(78px+env(safe-area-inset-bottom))] min-h-full bg-surface pb-[calc(78px+env(safe-area-inset-bottom))]"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="내 프로필" back tone="surface" />

      {saved ? (
        <p
          role="status"
          className="mx-5 mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-center text-[14px] font-bold text-brand-500"
        >
          저장했어요
        </p>
      ) : null}

      <ProfileForm mode="edit" onSaved={handleSaved} />

      {/*
        권한·로그인 계정 상자, 탈퇴 안내, 로그아웃, 운영진 화면 입구는 모두 설정 화면의 "계정"·아래쪽에 있습니다.
        (로그아웃은 2026-09-14, 권한·계정 상자와 탈퇴 안내는 2026-09-15 사용자 요청으로 옮겼습니다 —
         여기는 내 정보를 고치는 곳이라, 계정에 관한 것은 설정에 모았습니다.)
        pb-10은 폼 아래 여백으로 남겨 둡니다.
      */}
      <div className="pb-10" />
    </div>
  );
}

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function ProfilePage() {
  return (
    <GuestGate title="내 프로필" back>
      <ProfilePageContent />
    </GuestGate>
  );
}
