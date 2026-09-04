"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { CheckIcon, ClockIcon, PinIcon } from "@/components/icons";
import { EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { ddayLabel, formatDotDate, formatMonthDay, formatTime } from "@/lib/format";
import { useApprovedMembers, useEvent, useRsvps } from "@/lib/hooks";
import type { RsvpStatus } from "@/lib/types";

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "attending", label: "참석" },
  { value: "notAttending", label: "불참" },
  { value: "undecided", label: "미정" },
];

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { event, loading, notFound } = useEvent(eventId);
  const rsvps = useRsvps(eventId);
  const members = useApprovedMembers();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const myRsvp = rsvps.data.find((rsvp) => rsvp.uid === user?.uid)?.status ?? null;
  const attending = rsvps.data.filter((rsvp) => rsvp.status === "attending");

  /** uid로 원우 정보를 빨리 찾기 위한 표 */
  const memberById = useMemo(
    () => new Map(members.data.map((member) => [member.uid, member])),
    [members.data],
  );

  async function handleRsvp(status: RsvpStatus) {
    if (!user || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await setDoc(doc(db, "events", eventId, "rsvps", user.uid), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setActionError("참석 여부를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 일정을 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
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
        {/* 일정 요약 */}
        <section className="rounded-3xl bg-linear-135 from-brand-400 to-brand-600 p-6 text-white shadow-[var(--shadow-float)]">
          {/* 홈의 일정 카드와 같은 크기로 맞춥니다. */}
          <span className="inline-block rounded-full bg-black/20 px-3.5 py-1.5 text-[16px] font-bold">
            {ddayLabel(event.date)}
          </span>
          <h2 className="mt-4 text-[24px] font-bold leading-tight">{event.title}</h2>
          <p className="mt-1 text-[15px] font-medium text-white">
            {formatDotDate(event.date)} · {formatMonthDay(event.date)}
          </p>

          <div className="mt-4 flex flex-col gap-2 text-[15px] font-medium text-white">
            {event.startTime ? (
              <span className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                {formatTime(event.startTime)}
                {event.endTime ? ` ~ ${formatTime(event.endTime)}` : ""}
              </span>
            ) : null}
            {event.location ? (
              <span className="flex items-center gap-2">
                <PinIcon className="h-5 w-5" />
                {event.location}
              </span>
            ) : null}
          </div>
        </section>

        {event.description ? (
          <section className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-2 text-[15px] font-bold text-ink">안내</h3>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
              {event.description}
            </p>
          </section>
        ) : null}

        {/* 참석 여부 */}
        <section>
          <SectionTitle>참석하시나요?</SectionTitle>
          <div className="flex gap-2.5">
            {RSVP_OPTIONS.map(({ value, label }) => {
              const selected = myRsvp === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRsvp(value)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-60 ${
                    selected
                      ? "bg-brand-500 text-white"
                      : "bg-white text-ink-soft shadow-[var(--shadow-card)]"
                  }`}
                >
                  {selected ? <CheckIcon className="h-[18px] w-[18px]" /> : null}
                  {label}
                </button>
              );
            })}
          </div>
          {actionError ? (
            <p role="alert" className="mt-3 text-center text-[13px] font-medium text-red-600">
              {actionError}
            </p>
          ) : null}
        </section>

        {/* 참석 인원 */}
        <section>
          <SectionTitle>현재 참석 인원 {attending.length}명</SectionTitle>
          <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
            {rsvps.loading ? (
              <div className="p-5">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : attending.length === 0 ? (
              <EmptyState title="아직 참석을 체크한 원우가 없어요" />
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-3 p-5">
                {attending.map((rsvp) => {
                  const member = memberById.get(rsvp.uid);
                  const name = member?.nickname || member?.name || "원우";
                  return (
                    <li key={rsvp.uid} className="flex items-center gap-2">
                      <Avatar
                        src={member?.photoURL}
                        name={name}
                        seed={rsvp.uid}
                        size={30}
                      />
                      <span className="text-[14px] font-medium text-ink-soft">{name}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* 운영진 전용 */}
        {isAdmin ? (
          <section className="flex gap-3">
            <Link
              href={`/events/${eventId}/edit`}
              className="flex-1 rounded-2xl bg-white py-3.5 text-center text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
            >
              수정하기
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-red-600 shadow-[var(--shadow-card)]"
            >
              삭제하기
            </button>
          </section>
        ) : null}
      </div>
    </>
  );
}
