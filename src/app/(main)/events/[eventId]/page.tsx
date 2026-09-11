"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";
import { EventHeroCard } from "@/components/EventCard";
import PageHeader from "@/components/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { commitWrite } from "@/lib/firestore-commit";
import { formatYear } from "@/lib/format";
import { useEvent } from "@/lib/hooks";

/**
 * 모임 상세 — 일정 요약 상자와 안내, 그리고 (올린 사람·운영진에게) 수정·삭제.
 *
 * "참석하시나요?"(참석/불참/미정)와 현재 참석 인원 목록은 2026-09-11에 없앴습니다.
 * 참석 인원의 얼굴을 그리려고 원우 전원의 문서(프로필 사진 포함)를 받아야 해서 무겁기도 했습니다.
 * Firestore에 남은 옛 응답(events/{id}/rsvps)은 앱이 더 읽지 않고, 보안 규칙에서도 뺐습니다.
 */
export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { event, loading, notFound } = useEvent(eventId);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("이 일정을 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await commitWrite(deleteDoc(doc(db, "events", eventId)));
      router.replace("/events");
    } catch {
      setActionError("일정을 삭제하지 못했어요.");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="모임 상세" back />
        <div className="flex flex-col gap-3 px-5">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </>
    );
  }

  if (notFound || !event) {
    return (
      <>
        <PageHeader title="모임 상세" back />
        <ErrorState message="일정을 찾을 수 없어요. 삭제되었을 수 있습니다." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="모임 상세" back />

      <div className="flex flex-col gap-6 px-5 pb-8">
        {/*
          일정 요약 — 홈의 "주요 일정" 카드와 같은 상자입니다.
          여기서는 눌러서 갈 곳이 없으니 href를 주지 않습니다.
        */}
        <section>
          <EventHeroCard event={event} caption={formatYear(event.date)} />
        </section>

        {event.description ? (
          <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-2 text-[15px] font-bold text-ink">안내</h3>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
              {event.description}
            </p>
          </section>
        ) : null}

        {/*
          고치기·지우기는 이 일정을 올린 사람과 운영진만.
          일정 등록은 원우 누구나 할 수 있게 되면서(2026-09-11), 남이 올린 일정을
          지우는 일은 막고 자기가 올린 일정의 오타는 스스로 고칠 수 있게 했습니다.
        */}
        {isAdmin || event.createdBy === user?.uid ? (
          <section>
            <div className="flex gap-3">
              <Link
                href={`/events/${eventId}/edit`}
                className="flex-1 rounded-2xl bg-surface py-3.5 text-center text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
              >
                수정하기
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-surface py-3.5 text-[15px] font-bold text-danger shadow-[var(--shadow-card)]"
              >
                삭제하기
              </button>
            </div>
            {actionError ? (
              <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
                {actionError}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
