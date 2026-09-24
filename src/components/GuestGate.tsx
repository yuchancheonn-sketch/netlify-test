"use client";

import type { ReactNode } from "react";
import { LoginRequired, useIsGuest } from "@/components/LoginRequired";
import PageHeader, { HeaderActions } from "@/components/PageHeader";

/**
 * 원우마다 다르게 보이는 화면(채팅·알림·내 프로필 등)이나 쓰기 전용 화면(일정 등록·수정)의 문 (2026-09-24).
 * 로그인 안 하고 둘러보는 사람에게는 제목 줄 + "로그인 하여야 이용가능한 기능입니다" 상자만 보이고,
 * 원우에게는 원래 화면(children)을 그대로 그립니다 — children은 원우일 때만 그려지므로 그 안의 구독도 그때만 돕니다.
 */
export default function GuestGate({ title, children }: { title: string; children: ReactNode }) {
  const isGuest = useIsGuest();
  if (!isGuest) return <>{children}</>;
  return (
    <>
      <PageHeader title={title} right={<HeaderActions />} />
      <div className="px-4 pt-4">
        <LoginRequired />
      </div>
    </>
  );
}
