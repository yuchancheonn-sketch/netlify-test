"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import { EventDdayCard, EventListItem } from "@/components/EventCard";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { greeting } from "@/lib/format";
import { useApprovedMembers, useUpcomingEvents } from "@/lib/hooks";
import { COHORT } from "@/lib/constants";

export default function HomePage() {
  const { profile } = useAuth();
  const events = useUpcomingEvents();
  const members = useApprovedMembers();

  const [nextEvent, ...laterEvents] = events.data;
  const displayName = profile?.nickname || profile?.name || "원우";

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={`${displayName}님`}
        right={<ProfileAvatarButton />}
      />

      <div className="flex flex-col gap-8 px-5">
        {/* 다가오는 모임 */}
        <section>
          {events.loading ? (
            <Skeleton className="h-[150px] rounded-3xl" />
          ) : nextEvent ? (
            <EventDdayCard event={nextEvent} />
          ) : (
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<CalendarIcon className="h-9 w-9" />}
                title="다가오는 모임이 아직 없어요"
                description="운영진이 일정을 올리면 여기에 D-day로 표시됩니다."
              />
            </div>
          )}
        </section>

        {/* 이후 일정 */}
        {laterEvents.length > 0 ? (
          <section>
            <SectionTitle
              action={
                <Link
                  href="/events"
                  className="flex items-center gap-0.5 text-[13px] font-bold text-brand-700"
                >
                  전체 일정
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              }
            >
              이후 일정
            </SectionTitle>
            <ul className="flex flex-col gap-3">
              {laterEvents.slice(0, 2).map((event) => (
                <li key={event.id}>
                  <EventListItem event={event} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Link
            href="/events"
            className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
              <CalendarIcon className="h-5 w-5 text-brand-600" />
              모임 일정 전체 보기
            </span>
            <ChevronRightIcon className="h-5 w-5 text-ink-faint" />
          </Link>
        )}

        {/* 우리 기수 */}
        <section>
          <SectionTitle
            action={
              <Link
                href="/members"
                className="flex items-center gap-0.5 text-[13px] font-bold text-brand-700"
              >
                원우 소개
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          >
            함께하는 원우
          </SectionTitle>

          <Link
            href="/members"
            className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            {members.loading ? (
              <Skeleton className="h-10 w-40" />
            ) : members.data.length === 0 ? (
              <p className="text-[14px] text-ink-muted">
                아직 등록된 원우가 없어요
              </p>
            ) : (
              <>
                <div className="flex -space-x-3">
                  {members.data.slice(0, 5).map((member) => (
                    <Avatar
                      key={member.uid}
                      src={member.photoURL}
                      name={member.nickname || member.name}
                      seed={member.uid}
                      size={40}
                      className="ring-2 ring-white"
                    />
                  ))}
                </div>
                <p className="min-w-0 flex-1 text-[15px] font-bold text-ink">
                  {COHORT} 원우 {members.data.length}명
                </p>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
              </>
            )}
          </Link>
        </section>
      </div>
    </>
  );
}
