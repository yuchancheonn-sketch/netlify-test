"use client";

import { use } from "react";
import GuestGate from "@/components/GuestGate";
import EventForm from "@/components/EventForm";
import PageHeader from "@/components/PageHeader";

/**
 * 일정 등록 — 원우 누구나(2026-09-11부터, 그 전엔 운영진만).
 * 올린 일정의 수정은 올린 사람과 운영진만, 삭제는 그 기수 원우 누구나 됩니다(2026-09-25 · firestore.rules).
 *
 * 홈 캘린더의 + 단추는 /events/new?date=2026-09-25&from=home 으로 옵니다 (2026-09-25) —
 * 날짜 칸을 고른 날로 채우고, 저장하면 홈으로 돌아갑니다.
 */
function NewEventPageContent({ date }: { date: string }) {
  return (
    <>
      {/*
        흰 바탕 (2026-09-25 사용자 "배경색은 흰색으로, 박스는 회색으로"). 화면 전체에 붙박이 흰 판을 맨 뒤(-z-10)에 깝니다 —
        내용이 짧아도 아래 탭바 둘레까지 흰색이 되게. 제목 줄도 흰색(tone="surface")이어야 스크롤할 때 띠가 안 생깁니다.
      */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
      <PageHeader title="일정 등록" back tone="surface" />
      {/* 저장하면 늘 홈으로 — 모임 목록(/events)은 2026-09-26에 없앴습니다. */}
      <EventForm initialDate={date} doneHref="/home" />
    </>
  );
}

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = use(searchParams);
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : "";
  return (
    <GuestGate title="일정 등록">
      <NewEventPageContent date={date} />
    </GuestGate>
  );
}
