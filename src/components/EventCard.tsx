"use client";

import Link from "next/link";
import { ChevronRightIcon, ClockIcon, PeopleCountIcon, PinIcon } from "@/components/icons";
import {
  ddayLabel,
  formatDotDate,
  formatMonthDay,
  formatTime,
  parseDateString,
  WEEKDAYS,
} from "@/lib/format";
import type { EventDoc } from "@/lib/types";

/**
 * 홈 화면 맨 위에 뜨는 다가오는 일정 카드.
 * 포스터의 주황 리본에서 색을 가져온 그라데이션을 씁니다.
 */
export function EventDdayCard({ event }: { event: EventDoc }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-3xl bg-brand-500 p-5 text-white shadow-[var(--shadow-float)] transition active:scale-[0.99]"
    >
      {/*
        밝은 주황 위의 흰 글씨는 대비가 넉넉하지 않아, 이 카드 안에서는
        투명도를 주지 않고 굵기를 올려 또렷하게 보이도록 했습니다.
      */}
      {/*
        윗줄 — 왼쪽에 이 카드가 무엇인지 알려주는 이름표, 오른쪽에 날짜와 D-day.
        날짜와 D-day는 밑선(baseline)을 맞춰 크기가 달라도 나란히 앉게 합니다.
        D-day만 아래 제목과 같은 크기에 굵기를 한 단계 더 올려(900) 두어,
        이 카드에서 가장 먼저 눈에 들어옵니다.
      */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[18px] font-bold leading-tight text-white">주요 일정</span>
        <span className="flex shrink-0 items-baseline gap-2.5">
          <span className="text-[14px] font-bold text-white">
            {formatMonthDay(event.date)}
          </span>
          <span className="text-[22px] font-black leading-tight">
            {ddayLabel(event.date)}
          </span>
        </span>
      </div>

      <p className="mt-4 text-[22px] font-bold leading-tight">{event.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] font-medium text-white">
        {event.startTime ? (
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-[18px] w-[18px]" />
            {formatTime(event.startTime)}
          </span>
        ) : null}
        {event.location ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <PinIcon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * 일정 목록에 쓰는 한 줄 카드.
 * 왼쪽에 요일/일/월을 담은 날짜 블록을 두는 참고 디자인 형태입니다.
 */
export function EventListItem({
  event,
  attendingCount,
}: {
  event: EventDoc;
  /** 참석하겠다고 응답한 인원 수 */
  attendingCount?: number;
}) {
  const date = parseDateString(event.date);

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-4 rounded-3xl bg-white p-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      <div className="flex h-[74px] w-[62px] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50">
        <span className="text-[12px] font-bold text-brand-500">
          {date ? WEEKDAYS[date.getDay()] : ""}
        </span>
        <span className="text-[24px] font-bold leading-tight text-brand-500">
          {date ? date.getDate() : "-"}
        </span>
        <span className="text-[11px] font-medium text-brand-500">
          {date ? `${date.getMonth() + 1}월` : ""}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold text-ink">{event.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          {event.startTime ? (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {formatTime(event.startTime)}
            </span>
          ) : null}
          {event.location ? (
            <span className="flex min-w-0 items-center gap-1">
              <PinIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-faint">
          <PeopleCountIcon className="h-4 w-4" />
          {attendingCount === undefined
            ? formatDotDate(event.date)
            : attendingCount > 0
              ? `${attendingCount}명 참석 예정`
              : "아직 응답한 사람이 없어요"}
        </p>
      </div>

      <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
    </Link>
  );
}
