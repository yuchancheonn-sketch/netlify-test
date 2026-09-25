"use client";

import GuestGate from "@/components/GuestGate";
import { useParams } from "next/navigation";
import EventForm from "@/components/EventForm";
import PageHeader from "@/components/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useEvent } from "@/lib/hooks";

/**
 * 일정 수정 — 그 일정을 올린 사람과 운영진만.
 * 누가 올렸는지(createdBy)는 일정을 불러와야 알 수 있어서, 권한은 불러온 뒤에 가립니다.
 * (최종 확인은 firestore.rules가 합니다.)
 */
function EditEventPageContent() {
  const params = useParams<{ eventId: string }>();
  const { user, isAdmin } = useAuth();
  const { event, loading, notFound } = useEvent(params.eventId);

  return (
    <>
      {/* 흰 바탕 — 등록 화면과 같게(2026-09-25, events/new/page.tsx 주석). */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
      <PageHeader title="일정 수정" back tone="surface" />
      {loading ? (
        <div className="flex flex-col gap-4 px-5">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : notFound || !event ? (
        <ErrorState message="일정을 찾을 수 없어요." />
      ) : !isAdmin && event.createdBy !== user?.uid ? (
        <ErrorState message="이 일정은 올린 사람과 운영진만 고칠 수 있어요." />
      ) : (
        <EventForm event={event} />
      )}
    </>
  );
}

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function EditEventPage() {
  return (
    <GuestGate title="일정 수정">
      <EditEventPageContent />
    </GuestGate>
  );
}
