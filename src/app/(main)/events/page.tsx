"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CohortPicker from "@/components/CohortPicker";
import { EventListItem } from "@/components/EventCard";
import MonthCalendar from "@/components/MonthCalendar";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { formatMonthDay, todayString } from "@/lib/format";
import { useEvents } from "@/lib/hooks";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { useViewCohort } from "@/lib/use-view-cohort";

type ViewMode = "list" | "calendar";

export default function EventsPage() {
  const { isAdmin } = useAuth();
  const { data: allEvents, loading, error } = useEvents();
  // 홈과 같은 기수의 일정만. 운영진이 홈에서 고른 기수를 그대로 따릅니다.
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const [view, setView] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /*
   * 오른쪽으로 밀어서 홈으로 — 왼쪽 위 < 버튼(backHref)과 같은 곳으로 갑니다.
   * 이 화면은 홈의 모임 카드 ">"와 "전체 일정"으로 들어오므로 돌아갈 자리가 홈입니다.
   * 손짓은 수업·설정·내 프로필 화면과 같은 lib/use-swipe-back.ts를 씁니다.
   */
  const router = useRouter();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });

  /*
   * 지난 일정은 목록에서도 캘린더에서도 아예 빼둡니다.
   * 모임 당일까지는 보이고, 그 다음 날부터 사라집니다.
   *
   * 화면에서만 감추고 저장된 기록은 그대로 둡니다. 앱이 알아서 지우게 하면
   * 되돌릴 수 없고, 참석 응답까지 딸려 사라집니다. 정말 지워야 할 일정은
   * Firebase 콘솔에서 지우는 편이 안전합니다.
   */
  const today = todayString();
  const events = allEvents.filter(
    (event) => event.date >= today && inCohort(event, cohort),
  );

  const selectedEvents = selectedDate
    ? events.filter((event) => event.date === selectedDate)
    : [];

  return (
    /*
      손짓은 바깥 상자가 받고, 밀려나는 것은 안쪽 상자뿐입니다.
      아래 "일정 등록"은 화면에 떠 있는(fixed) 단추라, transform이 걸리는 상자 안에
      두면 화면이 아니라 그 상자를 기준으로 자리를 잡아 엉뚱한 곳으로 튑니다
      (lib/use-swipe-back.ts 설명). 그래서 밀려나는 상자 바깥에 둡니다.
      min-h-full: 일정이 적어 내용이 짧아도 그 아래 빈 자리에서 민 손짓을 받습니다.
    */
    <div className="min-h-full bg-canvas" {...swipe.handlers} style={swipe.touchAction}>
      <div style={swipe.slideStyle}>
        <PageHeader
          title={
            canSwitch ? (
              <span className="flex items-center gap-2">
                모임
                <CohortPicker value={cohort} onChange={setCohort} />
              </span>
            ) : (
              "모임"
            )
          }
          /* 홈의 "모임 일정 전체 보기"로 들어오는 화면이라, 돌아갈 자리를 홈으로 못 박습니다. */
          backHref="/home"
          right={
            <div className="flex rounded-full bg-surface p-1 shadow-[var(--shadow-card)]">
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
                    <p className="rounded-2xl bg-surface px-5 py-6 text-center text-[14px] text-ink-faint shadow-[var(--shadow-card)]">
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
            <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
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
      </div>

      {/* 일정 등록은 운영진만 할 수 있습니다. 밀려나는 상자 바깥에 둡니다(위 설명). */}
      {isAdmin ? (
        <Link
          href="/events/new"
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95"
        >
          <PlusIcon className="h-5 w-5" />
          일정 등록
        </Link>
      ) : null}
    </div>
  );
}
