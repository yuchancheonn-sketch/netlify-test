"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { inCohort } from "@/lib/cohort";
import {
  calendarSubscribeLinks,
  isCalendarLinked,
  markCalendarLinked,
  requestAcademySync,
  subscribeCalendarLinked,
} from "@/lib/calendar-client";
import { formatTime, todayString } from "@/lib/format";
import { useAcademyEvents, useEvents } from "@/lib/hooks";

/**
 * 홈의 한 달 캘린더 (2026-09-23 사용자 요청 — "다가오는 모임" 박스 밑).
 *
 * - 한 달 단위로만 봅니다(주·일 보기 없음). ‹ › 로 앞뒤 달을 넘깁니다.
 * - 일정이 있는 날은 날짜 밑에 주황 점 하나(우리 기수 모임 events · 도산아카데미 academyEvents 모두, 2026-09-23).
 *   고른 날의 목록에서도 왼쪽 막대가 모두 주황입니다(2026-09-23 사용자 요청 — 예전엔 도산아카데미만 회색).
 *   도산아카데미 일정은 누르면 원래 글이 열리는 것으로 갈립니다.
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
  /* 이 기기에서 이미 폰 캘린더에 연결했는지. 서버 그림에서는 "연결함"으로 두어 단추가 깜빡이지 않게 합니다. */
  const linked = useSyncExternalStore(subscribeCalendarLinked, isCalendarLinked, () => true);

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

  /*
   * 캘린더 어디를 눌러도 캘린더가 화면 한가운데로 옵니다 (2026-09-23 사용자 요청).
   * 날짜를 눌러 아래 일정 줄이 늘어나도 그 줄이 화면 밖에 있지 않게 하려는 것입니다.
   * 누른 것이 무엇이든(날짜·달 넘기기·일정 줄) 이 칸에서 한 번만 받습니다.
   * prefers-reduced-motion(움직임 줄이기)을 켠 원우에게는 스르륵 없이 바로 옮깁니다.
   */
  function centerSelf(event: React.MouseEvent<HTMLElement>) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    event.currentTarget.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }

  return (
    <section
      onClick={centerSelf}
      className="rounded-3xl bg-surface px-4 pt-4 pb-3 shadow-[var(--shadow-card-flat)]"
    >
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
          /*
            주 사이 가로줄 (2026-09-23 사용자 요청) — 칸마다 윗변에 옅은 회색 선 하나.
            첫 줄의 선은 요일 이름과 날짜를 가르는 줄이 됩니다. 빈 칸에도 같은 선을 둬야 줄이 끊기지 않습니다.
          */
          const rowLine = "border-t border-line";
          if (day === null) return <span key={`blank-${index}`} className={rowLine} aria-hidden="true" />;
          const key = dateKey(view.year, view.month, day);
          const items = byDay.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${view.month + 1}월 ${day}일${items.length ? `, 일정 ${items.length}개` : ""}`}
              aria-pressed={isSelected}
              className={`flex h-11 flex-col items-center justify-start pt-1 ${rowLine}`}
            >
              {/*
                오늘은 주황 동그라미에 흰 숫자, 내가 고른 날은 검은 동그라미에 흰 숫자 (2026-09-23 사용자 요청).
                오늘을 고른 때(화면을 열면 그렇습니다)는 주황이 이깁니다 — "오늘"이라는 표시가 사라지지 않게.
                (예전엔 고른 날이 주황 동그라미, 오늘은 동그라미 없이 주황 글씨였습니다.)
              */}
              {/* 날짜 글씨 15px·medium (2026-09-23 사용자 "숫자 사이즈·굵기 좀만 더 키워줘" — 14px·보통에서). */}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium tabular-nums ${
                  isToday
                    ? "bg-brand-500 font-bold text-white"
                    : isSelected
                      ? "bg-ink font-bold text-white"
                      : index % 7 === 0
                        ? "text-danger"
                        : "text-ink"
                }`}
              >
                {day}
              </span>
              {/*
                일정이 있는 날은 주황 점 하나 — 우리 기수 모임이든 도산아카데미든 같습니다
                (2026-09-23 사용자 요청, 예전엔 도산아카데미만 회색 점이었고 둘 다 있으면 점 두 개).
              */}
              <span className="mt-0.5 flex h-1.5 items-center" aria-hidden="true">
                {items.length > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> : null}
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
                  {/*
                    왼쪽 막대는 둘 다 주황 (2026-09-23 사용자 요청 — 도산아카데미 일정도 같은 색).
                    self-stretch — 제목이 두세 줄로 늘어나면 막대도 그만큼 길어집니다(예전엔 36px 고정).
                  */}
                  <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full bg-brand-500" />
                  <span className="min-w-0 flex-1">
                    {/*
                      제목은 자르지 않고 줄을 바꿔 끝까지 보여 줍니다 (2026-09-23 사용자 "두 줄이든 세 줄이든 끝까지").
                      break-keep — 한글은 낱말 단위로 넘깁니다. 긴 영문·주소는 [overflow-wrap:anywhere]로 잘라 넘깁니다.
                    */}
                    <span className="block text-[15px] leading-snug font-bold break-keep text-ink [overflow-wrap:anywhere]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug break-keep text-ink-muted">
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

      {/*
        폰 캘린더 연동 — 이 기기에서 한 번 연결했으면 감춥니다 (2026-09-23 사용자 요청).
        폰이 실제로 구독을 마쳤는지는 알 수 없어, "연결 단추를 눌러 캘린더 앱으로 넘어갔는지"로 봅니다(lib/calendar-client.ts).
      */}
      {linked ? null : (
        <button
          type="button"
          onClick={() => setLinking(true)}
          className="mt-2 w-full rounded-2xl py-2.5 text-[14px] font-bold text-brand-500 transition active:bg-fill"
        >
          내 폰 캘린더에 연결
        </button>
      )}

      {linking ? <PhoneCalendarSheet onClose={() => setLinking(false)} /> : null}
    </section>
  );
}

/**
 * "내 폰 캘린더에 연결" 시트 — 아이폰(webcal) / 구글 캘린더 두 갈래.
 * 한 번 구독하면 앱의 일정이 폰 캘린더에 저절로 들어오고 바뀌면 따라 바뀝니다(폰이 몇 시간마다 다시 읽음).
 */
function PhoneCalendarSheet({ onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<{ webcal: string; google: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    // 캘린더 앱으로 넘어가면 이 기기는 "연결함"으로 적어 둡니다 — 다음부터 연결 단추를 감춥니다(2026-09-23).
    markCalendarLinked();
    if (kind === "webcal") window.location.assign(next.webcal);
    else window.open(next.google, "_blank", "noopener");
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
          {/* "구독 주소 복사하기"는 뺐습니다 (2026-09-23 사용자 요청). */}
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
