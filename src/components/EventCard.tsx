"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon, ClockIcon, PeopleCountIcon, PinIcon } from "@/components/icons";
import {
  ddayLabel,
  formatDotDate,
  formatTime,
  parseDateString,
  WEEKDAYS,
} from "@/lib/format";
import type { EventDoc } from "@/lib/types";

/**
 * 홈의 다가오는 모임(주요 일정) — 주황 카드에 세 줄, 오른쪽 끝에 ">".
 *   1행  "주요 일정"
 *   2행  D-day + 날짜 + 일정 이름   "D-1  09.15.  아구찜 번개"
 *   3행  장소 + 시간                📍마산아구찜  🕒오후 6:30
 *
 * ★ 세 줄 짜임 (2026-09-14 사용자 요청). 그 전에는 왼쪽에 둘레가 차오르는 흰 D-day 원
 *   (2026-09-11, 네 시안 가운데 "흰 둘레 원")과 두 줄(이름 / 장소·시간)이었습니다.
 *   D-day가 셋째 줄 글씨 안으로 들어가면서 원은 걷었습니다 — 되살리려면 git 기록의 DdayRing.
 *   같은 날 흰 카드 + 주황 뱃지로 바꿨다가 되돌린 적이 있어, 카드 바탕은 주황 그대로입니다.
 *
 * 주황 위 흰 글씨는 대비가 2.7:1이라 제목·날짜는 굵게, 장소·시간은 font-medium을 지킵니다.
 *
 * 나만의닥터의 "다음 주사일" 카드 짜임새에서 출발했습니다 (2026-09-11). 예전 홈은
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
  const date = parseDateString(event.date);

  return (
    <Link
      href="/events"
      className="flex items-center gap-3 rounded-3xl bg-brand-500 py-4 pl-5 text-white shadow-[var(--shadow-float)] transition active:opacity-80"
    >
      <span className="min-w-0 flex-1">
        {/*
          1행 — 이름표. 홈의 "오늘의 도산" 카드 제목(h2, 18px bold)과 같은 크기·굵기입니다
          (2026-09-14 사용자 요청). 두 카드 제목이 같은 급으로 읽히게 — 한쪽을 바꾸면 같이 바꿔 주세요.
        */}
        <span className="block text-[18px] leading-tight font-bold">주요 일정</span>

        {/*
          2행 — D-day + 날짜 + 일정 이름. 셋 다 크기·굵기·색이 같습니다(18px bold 흰색,
          2026-09-14 사용자 요청 — 처음엔 날짜만 흰색 90%로 한 단 물렸었고, D-day는 3행에 있었습니다).
          자리가 모자라면 이름만 "…"로 줄고 D-day·날짜는 끝까지 보입니다(shrink-0).
        */}
        {/*
          줄 사이 간격: 1행→2행 8px(mt-2), 2행→3행 4px(mt-1) — 2행(D-day·날짜·이름)이 3행(장소·시간)과
          한 덩어리로 읽히고 1행 "주요 일정" 이름표와는 떨어져 보이게 (2026-09-15 사용자 요청, 예전엔 4px/8px 반대).
          두 간격의 합(12px)은 그대로라 카드 높이·홈 스켈레톤 높이는 바뀌지 않았습니다.
        */}
        <span className="mt-2 flex min-w-0 items-baseline gap-2 text-[18px] leading-tight font-bold">
          {/* D-day — 날짜 왼쪽, 날짜·이름과 같은 18px bold 흰색 (2026-09-14 사용자 요청으로 3행에서 옮김) */}
          <span className="shrink-0">{ddayLabel(event.date)}</span>
          {date ? (
            <span className="shrink-0">
              {/* "09.15." — 월·일 모두 두 자리 + 끝에 점 (2026-09-14 사용자 요청, "9월 15일"에서 바꿈) */}
              {String(date.getMonth() + 1).padStart(2, "0")}.{String(date.getDate()).padStart(2, "0")}.
            </span>
          ) : null}
          {/* 일정 이름만 17px — 2026-09-15 사용자 요청으로 D-day·날짜(18px)보다 1px 작게. 줄은 items-baseline이라 아랫선이 맞습니다. */}
          <span className="truncate text-[17px]">{event.title}</span>
        </span>

        {/*
          3행 — 장소 + 시간. 둘 다 없는 일정이면 이 줄을 통째로 그리지 않습니다.
          (D-day는 2026-09-14까지 이 줄 맨 앞에 있다가 사용자 요청으로 2행 날짜 왼쪽으로 옮겼습니다.)
          장소 앞에 핀, 시간 앞에 시계. 아이콘이 둘을 갈라 주므로 사이의 " · "는 뺐습니다.
          자리가 모자라면 장소만 "…"로 줄고 시간은 끝까지 보입니다(shrink-0).
        */}
        {event.location || time ? (
          /* 글씨 15px · 아이콘 18px — 2026-09-15 사용자 요청으로 14px · 15px에서 키웠다가(16px), 같은 날 글씨만 15px로 줄였습니다. */
          <span className="mt-1 flex min-w-0 items-center gap-3 text-[15px] font-medium text-white">
            {event.location ? (
              <span className="flex min-w-0 items-center gap-1">
                <PinIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            ) : null}
            {time ? (
              <span className="flex shrink-0 items-center gap-1">
                <ClockIcon className="h-[18px] w-[18px]" />
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
    // href를 넘기는 곳은 홈뿐이라, 홈 카드들처럼 글로우 없이 헤어라인만 둡니다 (2026-09-23 사용자 요청).
    // 모임 화면(href 없음)은 그대로 --shadow-card입니다.
    return (
      <Link
        href={href}
        className={`${box.replace("shadow-[var(--shadow-card)]", "shadow-[var(--shadow-card-flat)]")} flex items-center gap-4 transition active:scale-[0.99]`}
      >
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
