"use client";

import Link from "next/link";
import { EventHeroCard, EventListItem } from "@/components/EventCard";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import SessionNotes from "@/components/SessionNotes";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { APP_DEFINITION_TITLE } from "@/lib/constants";
import { useUpcomingEvents } from "@/lib/hooks";
import { quoteOfTheDay } from "@/lib/quotes";

export default function HomePage() {
  const events = useUpcomingEvents();
  // 화면을 열 때의 날짜로 정합니다. 날짜가 바뀌면 다음에 열 때 새 말씀이 보입니다.
  const quote = quoteOfTheDay();

  const [nextEvent, ...laterEvents] = events.data;

  return (
    <>
      {/*
        홈의 제목 자리는 앱 이름 하나로만 씁니다.
        글씨는 다른 탭 제목("원우수첩", "자료" …)과 크기·굵기까지 똑같습니다.
      */}
      <PageHeader title={APP_DEFINITION_TITLE} right={<HeaderActions />} />

      {/* 칸 사이는 20px. 아래 "모임 일정 전체 보기" 한 줄만 예외로 더 붙습니다. */}
      <div className="flex flex-col gap-5 px-4">
        {/* 다가오는 모임 */}
        <section>
          {events.loading ? (
            <Skeleton className="h-[150px] rounded-3xl" />
          ) : nextEvent ? (
            <EventHeroCard
              event={nextEvent}
              caption="주요 일정"
              href={`/events/${nextEvent.id}`}
            />
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
                  className="flex items-center gap-0.5 text-[13px] font-bold text-brand-500"
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
          /*
            -mt-3으로 위 카드와의 간격을 20 → 8px로 좁힙니다.
            (바깥 상자의 gap-5에서 12px을 도로 당겨오는 셈입니다.)
            제목 없이 한 줄짜리 링크라 위 카드에 딸린 것처럼 붙는 편이 자연스럽습니다.
          */
          <Link
            href="/events"
            className="-mt-3 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
              <CalendarIcon className="h-[26px] w-[26px] text-brand-500" />
              모임 일정 전체 보기
            </span>
            <ChevronRightIcon className="h-[26px] w-[26px] text-ink-faint" />
          </Link>
        )}

        {/* 오늘의 말씀 — 자정이 지나면 다음 말씀으로 넘어갑니다. */}
        <section>
          {/*
            다른 자리와 달리 제목을 카드 바깥이 아니라 안에 둡니다.
            말씀 한 편만 담긴 카드라, 제목과 글이 한 덩어리로 읽히는 편이 낫습니다.
            (SectionTitle을 쓰지 않고 같은 크기·굵기로 직접 적었습니다.)
          */}
          {/* 제목 글씨 위 16px(pt-4), 아래 8px(mb-2). 카드 아래쪽 여백은 그대로 28px. */}
          <div className="rounded-3xl bg-white px-6 pt-4 pb-7 shadow-[var(--shadow-card)]">
            <h2 className="mb-2 text-[18px] font-bold text-ink">오늘의 도산</h2>

            <p className="font-serif text-[18px] leading-[1.8] text-ink">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="mt-5 text-[13px] font-bold text-brand-500">도산 안창호</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
              {quote.source}
            </p>
          </div>
        </section>

        {/* 주차별 수업 기록 — 주제·강사는 함께 채우고, 느낀점은 각자 남깁니다. */}
        <SessionNotes />
      </div>
    </>
  );
}
