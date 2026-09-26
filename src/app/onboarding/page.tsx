"use client";

import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import StageGate from "@/components/StageGate";

export default function OnboardingPage() {
  return (
    <StageGate allow={["needsOnboarding"]}>
      <OnboardingScreen />
    </StageGate>
  );
}

function OnboardingScreen() {
  const router = useRouter();

  return (
    /*
      바탕은 흰색(surface) — 2026-09-27 사용자 요청("다른 창들과 일관성 있게, 흰색 배경에 회색 박스").
      칸은 ProfileForm이 내 프로필 화면과 똑같이 회색·그림자 없음으로 그립니다.
      min-h-dvh로 내용이 짧아도 화면 끝까지 흰색이 덮게 합니다(이 화면은 MainShell 밖이라 탭바 여백이 없음).
    */
    <div className="min-h-dvh bg-surface">
      {/*
        맨 위 시계 줄을 흰색으로 만들려고 붙였던 흰 줄(fixed, 시계 줄 높이)은 같은 날 사용자 요청으로 없앴습니다
        (2026-09-27 "그냥 없애줘").
      */}
      <div className="mx-auto w-full max-w-[520px]">
        {/*
          pb-10 — 제목과 프로필 사진 사이를 24px → 40px로 (2026-09-27 사용자 "여백 더 키워줘").
          "가입 승인 완료 🎉" 13px → 15px — 글씨와 축하 그림이 같은 글줄이라 함께 커집니다(2026-09-27 사용자 요청).
        */}
        <header className="px-5 pt-12 pb-10">
          <p className="text-[15px] font-bold text-brand-500">가입 승인 완료 🎉</p>
          <h1 className="mt-2 text-[26px] font-bold leading-snug tracking-tight text-ink">
            원우들에게 보여줄
            <br />
            내 소개를 채워 주세요
          </h1>
          {/*
            제목 아래 안내("이름·전화번호·기수만 넣으면 바로 시작할 수 있어요. 나머지는 …")는
            2026-09-27 사용자 요청으로 지웠습니다 — 칸마다 "필수"·"선택"이 붙어 있습니다.
          */}
        </header>

        <ProfileForm mode="onboarding" onSaved={() => router.replace("/home")} />
      </div>
    </div>
  );
}
