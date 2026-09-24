"use client";

import GuestGate from "@/components/GuestGate";
import EventForm from "@/components/EventForm";
import PageHeader from "@/components/PageHeader";

/**
 * 일정 등록 — 원우 누구나(2026-09-11부터, 그 전엔 운영진만).
 * 올린 일정의 수정·삭제는 올린 사람과 운영진만 됩니다(모임 목록 카드 · firestore.rules).
 */
function NewEventPageContent() {
  return (
    <>
      <PageHeader title="일정 등록" back />
      <EventForm />
    </>
  );
}

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function NewEventPage() {
  return (
    <GuestGate title="일정 등록">
      <NewEventPageContent />
    </GuestGate>
  );
}
