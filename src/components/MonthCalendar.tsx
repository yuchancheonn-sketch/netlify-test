"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { toDateString, todayString, WEEKDAYS } from "@/lib/format";
import type { EventDoc } from "@/lib/types";

/**
 * 월간 캘린더.
 * 일정이 있는 날에는 점을 찍고, 날짜를 누르면 선택 상태를 바깥으로 알려줍니다.
 */
export default function MonthCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: EventDoc[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = todayString();
  const [cursor, setCursor] = useState(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  /** 일정이 하나라도 있는 날짜 모음 */
  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);

  /** 달력 격자에 채울 42칸(6주). 앞뒤 달의 날짜는 흐리게 보여줍니다. */
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        key: toDateString(date),
        inMonth: date.getMonth() === cursor.getMonth(),
      };
    });
  }, [cursor]);

  function moveMonth(delta: number) {
    setCursor((previous) => new Date(previous.getFullYear(), previous.getMonth() + delta, 1));
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:bg-stone-100"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <p className="text-[16px] font-bold text-ink" aria-live="polite">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="다음 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:bg-stone-100"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-[12px] font-bold text-ink-faint"
            aria-hidden="true"
          >
            {weekday}
          </div>
        ))}

        {cells.map(({ date, key, inMonth }) => {
          const hasEvent = eventDates.has(key);
          const isToday = key === today;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일${hasEvent ? ", 일정 있음" : ""}`}
              aria-pressed={isSelected}
              className="flex flex-col items-center py-1"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] transition ${
                  isSelected
                    ? "bg-brand-500 font-bold text-white"
                    : isToday
                      ? "bg-brand-50 font-bold text-brand-700"
                      : inMonth
                        ? "font-medium text-ink"
                        : "text-ink-faint/60"
                }`}
              >
                {date.getDate()}
              </span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  hasEvent ? (isSelected ? "bg-brand-500" : "bg-brand-400") : "bg-transparent"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
