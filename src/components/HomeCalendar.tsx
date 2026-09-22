"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { inCohort } from "@/lib/cohort";
import { calendarSubscribeLinks, requestAcademySync } from "@/lib/calendar-client";
import { formatTime, todayString } from "@/lib/format";
import { useAcademyEvents, useEvents } from "@/lib/hooks";

/**
 * 홈의 한 달 캘린더 (2026-09-23 사용자 요청 — "다가오는 모임" 박스 밑).
 *
 * - 한 달 단위로만 봅니다(주·일 보기 없음). ‹ › 로 앞뒤 달을 넘깁니다.
 * - 점 두 가지: 주황 = 우리 기수 모임 일정(events), 회색 = 도산아카데미 일정(academyEvents).
 * - 날짜를 누르면 박스 아래쪽에 그날 일정이 섭니다. 처음엔 오늘.
 * - 맨 아래 "내 폰 캘린더에 연결" — 아이폰·구글 캘린더 구독(lib/calendar-feed-server.ts).
 * - 열릴 때 서버에 도산아카데미 새 글 일정을 넣으라고 한 번 알립니다(한 시간에 한 번만 실제로 돎).
 *
 * 모양은 홈의 다른 흰 박스와 같습니다(rounded-3xl · 헤어라인 테두리, 글로우 없음).
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

interface DayItem {
  key: string;
  kind: "cohort" | "academy";
  title: string;
  time: string;
  location: string;
  href: string;
}

function timeLabel(start: string, end: string): string {
  if (!start) return "";
  return end ? `${formatTime(start)} ~ ${formatTime(end)}` : formatTime(start);
}

export default function HomeCalendar({ cohort }: { cohort: string }) {
  const today = todayString();
  const [todayYear, todayMonth] = today.split("-").map(Number);
  /** 보고 있는 달 — month는 0부터(1월 = 0) */
  const [view, setView] = useState({ year: todayYear, month: todayMonth - 1 });
  const [selected, setSelected] = useState(today);
  const [linking, setLinking] = useState(false);

  const events = useEvents();
  const academy = useAcademyEvents();

  // 도산아카데미 새 글 일정 넣기 — 상태는 건드리지 않습니다(들어오면 useAcademyEvents가 받아 옵니다).
  useEffect(() => {
    requestAcademySync();
  }, []);

  const byDay = new Map<string, DayItem[]>();
  const push = (date: string, item: DayItem) => byDay.set(date, [...(byDay.get(date) ?? []), item]);
  for (const event of events.data) {
    if (!inCohort(event, cohort)) continue;
    push(event.date, {
      key: `e-${event.id}`,
      kind: "cohort",
      title: event.title,
      time: timeLabel(event.startTime, event.endTime),
      location: event.location,
      href: "/events",
    });
  }
  for (const event of academy.data) {
    push(event.date, {
      key: `a-${event.id}`,
      kind: "academy",
      title: event.title,
      time: timeLabel(event.startTime, event.endTime),
      location: event.location,
      href: event.link,
    });
  }

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function moveMonth(delta: number) {
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const selectedItems = byDay.get(selected) ?? [];
  const [, selMonth, selDay] = selected.split("-").map(Number);
  const selWeekday = WEEKDAYS[new Date(`${selected}T00:00:00`).getDay()];

  return (
    <section className="rounded-3xl bg-surface px-4 pt-4 pb-3 shadow-[var(--shadow-card-flat)]">
      {/* 달 이름과 ‹ › */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[18px] font-bold text-ink tabular-nums">
          {view.year}년 {view.month + 1}월
        </h2>
        <div className="-mr-2 flex items-center">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="앞 달"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-fill"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-fill"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 요일 */}
      <div className="mt-2 grid grid-cols-7 text-center text-[12px] font-medium">
        {WEEKDAYS.map((name, index) => (
          <span
            key={name}
            className={index === 0 ? "text-danger" : index === 6 ? "text-ink-muted" : "text-ink-faint"}
          >
            {name}
          </span>
        ))}
      </div>

      {/* 날짜 칸 */}
      <div className="mt-1 grid grid-cols-7">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} aria-hidden="true" />;
          const key = dateKey(view.year, view.month, day);
          const items = byDay.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selected;
          const hasCohort = items.some((item) => item.kind === "cohort");
          const hasAcademy = items.some((item) => item.kind === "academy");
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${view.month + 1}월 ${day}일${items.length ? `, 일정 ${items.length}개` : ""}`}
              aria-pressed={isSelected}
              className="flex h-11 flex-col items-center justify-start pt-1"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] tabular-nums ${
                  isSelected
                    ? "bg-brand-500 font-bold text-white"
                    : isToday
                      ? "font-bold text-brand-500"
                      : index % 7 === 0
                        ? "text-danger"
                        : "text-ink"
                }`}
              >
                {day}
              </span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5" aria-hidden="true">
                {hasCohort ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> : null}
                {hasAcademy ? <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* 고른 날의 일정 */}
      <div className="mt-2 border-t border-line px-1 pt-3">
        <p className="text-[13px] font-bold text-ink-muted">
          {selMonth}월 {selDay}일 ({selWeekday})
        </p>
        {selectedItems.length === 0 ? (
          <p className="py-2 text-[14px] text-ink-faint">일정이 없어요</p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {selectedItems.map((item) => {
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-9 w-1 shrink-0 rounded-full ${
                      item.kind === "cohort" ? "bg-brand-500" : "bg-ink-faint"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-ink">
                      {item.kind === "academy" ? (
                        <span className="mr-1 text-[12px] font-bold text-ink-muted">도산아카데미</span>
                      ) : null}
                      {item.title}
                    </span>
                    <span className="block truncate text-[13px] text-ink-muted">
                      {[item.time, item.location].filter(Boolean).join(" · ") || "시간 미정"}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.key}>
                  {item.kind === "academy" ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2.5 rounded-xl py-1.5 transition active:bg-fill"
                    >
                      {body}
                    </a>
                  ) : (
                    <Link href={item.href} className="flex gap-2.5 rounded-xl py-1.5 transition active:bg-fill">
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 폰 캘린더 연동 */}
      <button
        type="button"
        onClick={() => setLinking(true)}
        className="mt-2 w-full rounded-2xl py-2.5 text-[14px] font-bold text-brand-500 transition active:bg-fill"
      >
        내 폰 캘린더에 연결
      </button>

      {linking ? <PhoneCalendarSheet onClose={() => setLinking(false)} /> : null}
    </section>
  );
}

/**
 * "내 폰 캘린더에 연결" 시트 — 아이폰(webcal) / 구글 캘린더 두 갈래.
 * 한 번 구독하면 앱의 일정이 폰 캘린더에 저절로 들어오고 바뀌면 따라 바뀝니다(폰이 몇 시간마다 다시 읽음).
 */
function PhoneCalendarSheet({ onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<{ webcal: string; google: string; https: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (links || loading) return links;
    setLoading(true);
    setError(null);
    try {
      const next = await calendarSubscribeLinks();
      setLinks(next);
      return next;
    } catch {
      setError("연결 주소를 받지 못했어요. 잠시 후 다시 시도해 주세요.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function open(kind: "webcal" | "google") {
    const next = await load();
    if (!next) return;
    if (kind === "webcal") window.location.href = next.webcal;
    else window.open(next.google, "_blank", "noopener");
  }

  async function copy() {
    const next = await load();
    if (!next) return;
    try {
      await navigator.clipboard.writeText(next.https);
      setCopied(true);
    } catch {
      setError("복사하지 못했어요.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="내 폰 캘린더에 연결"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
      >
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />
        <h2 className="mt-5 text-[18px] font-bold text-ink">내 폰 캘린더에 연결</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed break-keep text-ink-muted">
          한 번 연결하면 우리 기수 모임과 도산아카데미 일정이 폰 캘린더에 저절로 들어와요.
          <br />
          일정이 바뀌면 폰에서도 따라 바뀌어요(몇 시간 걸릴 수 있어요).
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void open("webcal")}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fill py-[13px] text-[16px] font-bold text-ink disabled:opacity-50"
          >
            {loading ? <Spinner className="h-5 w-5" /> : null}
            아이폰 캘린더
          </button>
          <button
            type="button"
            onClick={() => void open("google")}
            disabled={loading}
            className="w-full rounded-2xl bg-fill py-[13px] text-[16px] font-bold text-ink disabled:opacity-50"
          >
            구글 캘린더 (안드로이드)
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={loading}
            className="w-full py-2 text-[14px] font-bold text-ink-muted disabled:opacity-50"
          >
            {copied ? "주소를 복사했어요" : "구독 주소 복사하기"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-center text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full py-3 text-[15px]! font-bold text-ink-soft"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
