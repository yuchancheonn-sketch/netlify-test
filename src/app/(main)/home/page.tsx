"use client";

import Link from "next/link";
import { EventDdayCard, EventListItem } from "@/components/EventCard";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { greeting } from "@/lib/format";
import { useUpcomingEvents } from "@/lib/hooks";
import { quoteOfTheDay } from "@/lib/quotes";

export default function HomePage() {
  const { profile } = useAuth();
  const events = useUpcomingEvents();
  // 화면을 열 때의 날짜로 정합니다. 날짜가 바뀌면 다음에 열 때 새 말씀이 보입니다.
  const quote = quoteOfTheDay();

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

        {/* 오늘의 말씀 — 자정이 지나면 다음 말씀으로 넘어갑니다. */}
        <section>
          <SectionTitle>오늘의 도산</SectionTitle>

          <div className="rounded-3xl bg-white px-6 py-7 shadow-[var(--shadow-card)]">
            <p className="font-serif text-[18px] leading-[1.8] text-ink">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="mt-5 text-[13px] font-bold text-brand-700">도산 안창호</p>
            {quote.note ? (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{quote.note}</p>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
