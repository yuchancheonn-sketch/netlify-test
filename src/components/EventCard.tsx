"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ChevronRightIcon, ClockIcon, PeopleCountIcon, PinIcon } from "@/components/icons";
import {
  daysUntil,
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
 * 모임 상세 맨 위 상자에 쓰입니다. (홈의 "주요 일정" 카드도 이것이었지만
 * 2026-09-11부터 홈은 아래의 한 줄짜리 EventDdayCard를 씁니다.)
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
 * 홈 맨 위의 다가오는 모임 — 흰 카드 왼쪽에 둘레가 차오르는 D-day 원, 옆에 두 줄
 * (이름 / 장소·시간), 오른쪽 끝에 ">"(모임 일정 전체 보기).
 * 처음엔 주황 카드였다가 같은 날 흰 카드로 바꿨습니다 — 주황은 원의 채워진 둘레에만 씁니다.
 *
 * 나만의닥터의 "다음 주사일" 카드 짜임새를 따랐습니다 (2026-09-11). 예전 홈은
 * 위의 EventHeroCard에 "주요 일정" 이름표를 달고, 그 아래 "모임 일정 전체 보기"
 * 상자를 따로 두었는데 이 한 장으로 합쳤습니다. 모임 상세 맨 위는 여전히 EventHeroCard입니다.
 *
 * ★ 누르는 곳이 둘입니다 — 카드 몸통은 이 모임 상세로, 오른쪽 ">"는 전체 일정으로.
 *   링크 안에 링크를 넣을 수 없어 나란히 두 개를 세웠습니다. ">" 쪽은 카드 높이만큼
 *   세로로 늘어나 손끝이 닿기 쉽습니다.
 *
 * ★ 둘째 줄은 시작 시간만 적습니다. "오후 6:30 ~ 오후 10:30"까지 넣으면 D-day와
 *   ">" 사이의 좁은 폭에서 장소가 잘려 나갑니다. 끝나는 시간은 상세에서 봅니다.
 */
export function EventDdayCard({ event }: { event: EventDoc }) {
  const time = event.startTime ? formatTime(event.startTime) : "";

  return (
    <div className="flex items-stretch rounded-3xl bg-surface text-ink shadow-[var(--shadow-card)]">
      <Link
        href={`/events/${event.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 py-4 pl-4 transition active:opacity-80"
      >
        <DdayRing date={event.date} />
        <span className="min-w-0">
          <span className="block truncate text-[18px] leading-tight font-bold">{event.title}</span>
          {/*
            둘째 줄 — 장소 앞에 핀, 시간 앞에 시계. 모임 상세의 주황 상자(EventHeroCard)와
            같은 아이콘입니다. 아이콘이 둘을 갈라 주므로 사이의 " · "는 뺐습니다.
            자리가 모자라면 장소만 "…"로 줄고 시간은 끝까지 보입니다(shrink-0).
          */}
          {event.location || time ? (
            <span className="mt-1.5 flex min-w-0 items-center gap-3 text-[14px] font-medium text-ink-muted">
              {event.location ? (
                <span className="flex min-w-0 items-center gap-1">
                  <PinIcon className="h-[15px] w-[15px] shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              ) : null}
              {time ? (
                <span className="flex shrink-0 items-center gap-1">
                  <ClockIcon className="h-[15px] w-[15px]" />
                  {time}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </Link>
      <Link
        href="/events"
        aria-label="모임 일정 전체 보기"
        className="flex shrink-0 items-center pr-4 pl-3 text-ink-faint transition active:opacity-60"
      >
        <ChevronRightIcon className="h-7 w-7" strokeWidth={2.2} />
      </Link>
    </div>
  );
}

/** 둘레가 이만큼 전부터 채워지기 시작합니다(일). D-14 이전은 빈 둘레, D-DAY는 꽉 찬 둘레. */
const DDAY_RING_DAYS = 14;
/** 원 지름과 둘레 두께(px) — 나만의닥터 화면을 재어 옮긴 값 (아래 설명) */
const RING_SIZE = 48;
const RING_STROKE = 4;

/**
 * 흰 원 안의 D-day. 둘레는 모임이 다가올수록 회색에서 주황으로 채워집니다.
 * 나만의닥터 "다음 주사일" 카드의 원을 따랐습니다 (2026-09-11).
 *
 * ★ 크기는 나만의닥터 화면(아이폰 3배 스크린샷)을 픽셀로 재어 3으로 나눴습니다 —
 *   원 지름 144px → 48px, 둘레 두께 12px → 4px. D-day 글씨는 사진대로 옮기면 13px이지만
 *   작게 보여서 키웠습니다(세 글자 16px, 네 글자 14px). "D-DAY"처럼 다섯 글자는 원 안(40px)에
 *   들도록 11px입니다.
 *   카드가 흰색(surface)이라 회색 둘레는 line 토큰, 글씨는 ink 토큰으로 화면을 따라갑니다.
 *
 * ★ 얼마나 채울지는 "2주 전부터"로 고정했습니다. 일정을 올린 날을 기준으로 삼으면
 *   하루 전에 올린 번개는 D-1에도 빈 원이라, 같은 D-숫자가 일정마다 다르게 보입니다.
 *
 * 처음 그려질 때 빈 둘레에서 제자리까지 한 번 차오릅니다(animate — 기수 고르기
 * 목록과 같은 방식). "움직임 줄이기"를 켠 폰에서는 건너뜁니다.
 */
function DdayRing({ date }: { date: string }) {
  const label = ddayLabel(date);
  const days = daysUntil(date) ?? DDAY_RING_DAYS;
  const progress = Math.min(1, Math.max(0, (DDAY_RING_DAYS - days) / DDAY_RING_DAYS));
  const center = RING_SIZE / 2;
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const ringRef = useCallback(
    (node: SVGCircleElement | null) => {
      if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      node.animate([{ strokeDashoffset: circumference }, { strokeDashoffset: offset }], {
        duration: 800,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    },
    [circumference, offset],
  );

  /*
   * 원 안쪽 폭이 40px라 글자 수가 늘수록 줄입니다 — "D-5" 16px, "D-12" 14px, "D-DAY"·"D-100" 11px.
   * 네 글자를 15px, 다섯 글자를 12px로 그려 보니 글자 끝이 둘레에 닿았습니다.
   */
  const fontSize = label.length <= 3 ? 16 : label.length === 4 ? 14 : 11;

  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      {/* -rotate-90: SVG 원은 3시 방향에서 시작하므로 12시에서 시계 방향으로 차오르게 돌립니다. */}
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={RING_STROKE}
        />
        {/* 하나도 안 찼을 때 그리면 둥근 끝(round cap)이 점 하나로 남습니다. */}
        {progress > 0 ? (
          <circle
            ref={ringRef}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <span
        className="relative leading-none font-bold tracking-tight text-ink"
        style={{ fontSize }}
      >
        {label}
      </span>
    </span>
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
      className="flex items-center gap-4 rounded-3xl bg-surface p-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
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
