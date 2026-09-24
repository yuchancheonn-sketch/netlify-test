"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoginRequired, useIsGuest } from "@/components/LoginRequired";
import PageHeader, { HeaderActions } from "@/components/PageHeader";

/**
 * 원우마다 다르게 보이는 화면(채팅·알림·내 프로필 등)이나 쓰기 전용 화면(일정 등록·수정)의 문 (2026-09-24).
 * 로그인 안 하고 둘러보는 사람에게는 제목 줄 + "로그인 하여야 이용가능한 기능입니다" 상자만 보이고,
 * 원우에게는 원래 화면(children)을 그대로 그립니다 — children은 원우일 때만 그려지므로 그 안의 구독도 그때만 돕니다.
 *
 * back — 상자에 "되돌아가기"를 답니다(2026-09-25 사용자 요청). 알림·내 프로필처럼 제목 줄 아이콘으로 어느 탭에서든
 * 들어오는 화면에 씁니다. 누르면 브라우저 기록을 한 칸 되돌려 들어오기 전 탭으로 갑니다. 이 주소로 바로 열어
 * 되돌아갈 기록이 없으면 홈으로 갑니다.
 */
export default function GuestGate({
  title,
  back = false,
  children,
}: {
  title: string;
  back?: boolean;
  children: ReactNode;
}) {
  const isGuest = useIsGuest();
  const router = useRouter();
  if (!isGuest) return <>{children}</>;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace("/home");
  }

  return (
    <>
      <PageHeader title={title} right={<HeaderActions />} />
      <div className="px-4 pt-4">
        <LoginRequired onBack={back ? goBack : undefined} />
      </div>
    </>
  );
}
