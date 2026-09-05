"use client";

import { useState } from "react";
import Link from "next/link";
import { EventListItem } from "@/components/EventCard";
import MonthCalendar from "@/components/MonthCalendar";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatMonthDay, todayString } from "@/lib/format";
import { useEvents } from "@/lib/hooks";

type ViewMode = "list" | "calendar";

export default function EventsPage() {
  const { isAdmin } = useAuth();
  const { data: allEvents, loading, error } = useEvents();
  const [view, setView] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /*
   * 지난 일정은 목록에서도 캘린더에서도 아예 빼둡니다.
   * 모임 당일까지는 보이고, 그 다음 날부터 사라집니다.
   *
   * 화면에서만 감추고 저장된 기록은 그대로 둡니다. 앱이 알아서 지우게 하면
   * 되돌릴 수 없고, 참석 응답까지 딸려 사라집니다. 정말 지워야 할 일정은
   * Firebase 콘솔에서 지우는 편이 안전합니다.
   */
  const today = todayString();
  const events = allEvents.filter((event) => event.date >= today);

  const selectedEvents = selectedDate
    ? events.filter((event) => event.date === selectedDate)
    : [];

  return (
    <>
      <PageHeader
        title="모임"
        /* 홈의 "모임 일정 전체 보기"로 들어오는 화면이라, 돌아갈 자리를 홈으로 못 박습니다. */
        backHref="/home"
        right={
          <div className="flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
            {(
              [
                ["list", "목록"],
                ["calendar", "캘린더"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                /* 위 4px + 아래 8px. 합(12px)이 py-1.5와 같아 알약 높이는
                   그대로이고 글씨만 2px 위에 앉습니다. 다른 서브탭과 같은 방식. */
                className={`rounded-full px-3 pt-1 pb-2 text-[13px] font-bold transition ${
                  view === mode ? "bg-brand-500 text-white" : "text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-[98px] rounded-3xl" />
            <Skeleton className="h-[98px] rounded-3xl" />
            <Skeleton className="h-[98px] rounded-3xl" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : view === "calendar" ? (
          <div className="flex flex-col gap-5">
            <MonthCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {selectedDate ? (
              <section>
                <SectionTitle>{formatMonthDay(selectedDate)}</SectionTitle>
                {selectedEvents.length === 0 ? (
                  <p className="rounded-2xl bg-white px-5 py-6 text-center text-[14px] text-ink-faint shadow-[var(--shadow-card)]">
                    이 날에는 일정이 없어요
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <EventListItem event={event} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <p className="text-center text-[13px] text-ink-faint">
                날짜를 누르면 그 날의 일정을 볼 수 있어요
              </p>
            )}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<CalendarIcon className="h-10 w-10" />}
              title="등록된 일정이 없어요"
              description={
                isAdmin
                  ? "아래 '일정 등록' 버튼으로 첫 모임을 올려보세요."
                  : "운영진이 모임을 올리면 여기에 표시됩니다."
              }
            />
          </div>
        ) : (
          /* 남는 것은 앞으로의 일정뿐이라 따로 나눌 구역이 없습니다. */
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id}>
                <EventListItem event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 일정 등록은 운영진만 할 수 있습니다. */}
      {isAdmin ? (
        <Link
          href="/events/new"
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95"
        >
          <PlusIcon className="h-5 w-5" />
          일정 등록
        </Link>
      ) : null}
    </>
  );
}
