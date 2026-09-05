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
 * 일정 하나를 크게 보여주는 주황 상자.
 *
 * 홈의 "주요 일정" 카드와 모임 상세 맨 위 상자가 같은 자리에 쓰입니다.
 * 예전에는 둘을 따로 그려서 서로 갈라져 있었습니다 — 한쪽은 단색인데
 * 다른 쪽은 그라데이션, D-day가 한쪽은 맨 글씨인데 다른 쪽은 검은 알약,
 * 시간·장소가 한쪽은 가로로 눕고 다른 쪽은 세로로 섰습니다.
 * 같은 것을 두 번 그리면 반드시 갈라지므로 한 곳에 모았습니다.
 *
 * 색은 디자인 토큰의 원칙(globals.css)대로 brand-500 단색입니다.
 * brand-400은 연하게 깔 자리에만 쓰는 색이라 그라데이션에서 뺐습니다.
 *
 * @param caption 윗줄 왼쪽에 놓을 짧은 말. 홈에서는 "주요 일정", 상세에서는
 *                오른쪽 날짜에 없는 연도를 얹습니다.
 * @param href    주면 눌러서 들어가는 카드가 되고, 안 주면 그냥 상자입니다.
 */
export function EventHeroCard({
  event,
  caption,
  href,
}: {
  event: EventDoc;
  caption: string;
  href?: string;
}) {
  /* 종료 시간은 적어둔 일정에만 있습니다. 없으면 시작 시간만 보여줍니다. */
  const time = event.startTime
    ? event.endTime
      ? `${formatTime(event.startTime)} ~ ${formatTime(event.endTime)}`
      : formatTime(event.startTime)
    : "";

  /*
    밝은 주황 위의 흰 글씨는 대비가 넉넉하지 않아, 이 상자 안에서는
    투명도를 주지 않고 굵기를 올려 또렷하게 보이도록 했습니다.
  */
  const inside = (
    <>
      {/*
        윗줄 — 왼쪽에 이 상자가 무엇인지 알려주는 이름표, 오른쪽에 날짜와 D-day.
        기본은 상자에 걸어둔 18px이고 날짜만 16px입니다. 크기가 달라도
        밑선(baseline)으로 세워 두어 셋의 글자가 한 줄에 나란히 앉습니다.
        D-day는 굵기(900)로 나머지(700)보다 앞섭니다.
      */}
      <div className="flex items-baseline justify-between gap-3 text-[18px] leading-tight">
        <span className="font-bold text-white">{caption}</span>
        <span className="flex shrink-0 items-baseline gap-2.5">
          <span className="text-[16px] font-bold text-white">
            {formatMonthDay(event.date)}
          </span>
          <span className="font-black">{ddayLabel(event.date)}</span>
        </span>
      </div>

      <p className="mt-4 text-[22px] font-bold leading-tight">{event.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] font-medium text-white">
        {time ? (
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-[18px] w-[18px]" />
            {time}
          </span>
        ) : null}
        {event.location ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <PinIcon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        ) : null}
      </div>
    </>
  );

  const box = "block rounded-3xl bg-brand-500 p-5 text-white shadow-[var(--shadow-float)]";

  // 누를 곳이 없으면 눌리는 시늉(active:scale)도 하지 않아야 합니다.
  if (!href) return <div className={box}>{inside}</div>;

  return (
    <Link href={href} className={`${box} transition active:scale-[0.99]`}>
      {inside}
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
