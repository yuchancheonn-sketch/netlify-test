"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon, ClockIcon, PeopleCountIcon, PinIcon } from "@/components/icons";
import {
  daysUntil,
  ddayLabel,
  formatDotDate,
  formatTime,
  parseDateString,
  WEEKDAYS,
} from "@/lib/format";
import type { EventDoc } from "@/lib/types";

/**
 * 홈 맨 위의 다가오는 모임 — 주황 카드 왼쪽에 둘레가 차오르는 흰 D-day 원, 옆에 두 줄
 * (이름 / 장소·시간), 오른쪽 끝에 ">".
 * 주황 카드 → 흰 카드(원 둘레만 주황) → 다시 주황 카드로 왔습니다(2026-09-11).
 * 주황 위 D-day는 네 시안(흰 둘레 원 / 흰 알+둘레 / 진한 주황 원 / 숫자만 크게) 가운데
 * 사용자가 "흰 둘레 원"을 골랐습니다 — 흰 카드 때 모양 그대로 색만 뒤집은 것.
 * 주황 위 흰 글씨는 대비가 2.7:1이라 제목은 굵게, 장소·시간은 font-medium을 지킵니다.
 *
 * 나만의닥터의 "다음 주사일" 카드 짜임새를 따랐습니다 (2026-09-11). 예전 홈은
 * 큰 주황 상자(EventHeroCard)에 "주요 일정" 이름표를 달고, 그 아래 "모임 일정 전체 보기"
 * 상자를 따로 두었는데 이 한 장으로 합쳤습니다.
 *
 * ★ 카드 전체가 모임 목록(/events)으로 가는 링크 하나입니다. 예전엔 몸통은 모임 상세로,
 *   ">"는 목록으로 나뉘어 있었는데, 모임 상세 화면을 없애면서(2026-09-11) 하나로 합쳤습니다.
 *
 * ★ 둘째 줄은 시작 시간만 적습니다. "오후 6:30 ~ 오후 10:30"까지 넣으면 D-day와
 *   ">" 사이의 좁은 폭에서 장소가 잘려 나갑니다.
 */
export function EventDdayCard({ event }: { event: EventDoc }) {
  const time = event.startTime ? formatTime(event.startTime) : "";

  return (
    <Link
      href="/events"
      className="flex items-center gap-4 rounded-3xl bg-brand-500 py-4 pl-4 text-white shadow-[var(--shadow-float)] transition active:opacity-80"
    >
      <DdayRing date={event.date} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[18px] leading-tight font-bold">{event.title}</span>
        {/*
          둘째 줄 — 장소 앞에 핀, 시간 앞에 시계. 아이콘이 둘을 갈라 주므로 사이의 " · "는 뺐습니다.
          자리가 모자라면 장소만 "…"로 줄고 시간은 끝까지 보입니다(shrink-0).
          아이콘·글씨 모두 흰색 — 주황 카드로 바꾸면서(2026-09-11) 검정(ink)에서 옮겼습니다.
        */}
        {event.location || time ? (
          <span className="mt-1.5 flex min-w-0 items-center gap-3 text-[14px] font-medium text-white">
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
      {/*
        오늘의 OX 퀴즈 카드 오른쪽 위 ">"와 같은 크기·굵기(24px·2.1) — 2026-09-11에 두 꺾쇠의 가운데 값으로
        맞췄습니다. 한쪽을 바꾸면 DosanQuizCard.tsx도 같이 바꿔 주세요.
      */}
      <span className="flex shrink-0 items-center pr-4 pl-3 text-white/80">
        <ChevronRightIcon className="h-6 w-6" strokeWidth={2.1} />
      </span>
    </Link>
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
 *   카드가 주황(brand-500)이라 둘레 바탕은 흰색을 32%만, 채워지는 둘레와 글씨는 흰색입니다
 *   (주황 카드 위 "흰 둘레 원" 시안, 2026-09-11). 어두운 화면에서도 카드가 주황이라 그대로입니다.
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
          stroke="rgba(255, 255, 255, 0.32)"
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
            stroke="#ffffff"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <span
        /* -translate-y-px: 원 한가운데에서 글씨만 1px 위로 — 가운데에 두면 눈에는 살짝 아래로 보였습니다(2026-09-11). */
        className="relative -translate-y-px leading-none font-bold tracking-tight text-white"
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
 *
 * @param href     주면 눌러서 가는 카드(오른쪽 ">")가 됩니다 — 홈의 이후 일정은 모임 목록으로.
 * @param children 안 주면 그냥 카드이고, 주면 한 줄 아래 같은 카드 안에 붙습니다 — 모임 목록은
 *                 여기에 안내와 수정·삭제를 답니다(모임 상세 화면을 없앤 2026-09-11부터).
 */
export function EventListItem({
  event,
  href,
  children,
}: {
  event: EventDoc;
  href?: string;
  children?: ReactNode;
}) {
  const date = parseDateString(event.date);

  const row = (
    <>
      {/*
        날짜 칸 — 주황으로 꽉 채우고 글씨는 흰색 (2026-09-11).
        예전엔 연한 주황(brand-50) 바탕에 주황 글씨였는데, 어두운 화면에서 그 바탕이 탁한 갈색으로
        보여 네 시안(주황 채움 / 달력 한 장 / 주황 테두리 / 상자 없이) 가운데 사용자가 "주황 채움"을 골랐습니다.
        홈 맨 위 D-day 카드(주황 바탕 + 흰 글씨)와 같은 결이고, 밝은·어두운 화면에서 똑같이 보입니다.
        요일·월은 흰색을 조금 풀어 가운데 날짜가 먼저 읽히게 합니다.
      */}
      <div className="flex h-[74px] w-[62px] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-500">
        <span className="text-[12px] font-bold text-white/90">
          {date ? WEEKDAYS[date.getDay()] : ""}
        </span>
        <span className="text-[24px] font-bold leading-tight text-white">
          {date ? date.getDate() : "-"}
        </span>
        <span className="text-[11px] font-medium text-white/90">
          {date ? `${date.getMonth() + 1}월` : ""}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold text-ink">{event.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          {event.startTime ? (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {event.endTime
                ? `${formatTime(event.startTime)} ~ ${formatTime(event.endTime)}`
                : formatTime(event.startTime)}
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
          {formatDotDate(event.date)}
        </p>
      </div>
    </>
  );

  const box = "rounded-3xl bg-surface p-3.5 shadow-[var(--shadow-card)]";

  if (href) {
    return (
      <Link href={href} className={`${box} flex items-center gap-4 transition active:scale-[0.99]`}>
        {row}
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
      </Link>
    );
  }

  return (
    <div className={box}>
      <div className="flex items-center gap-4">{row}</div>
      {children}
    </div>
  );
}
