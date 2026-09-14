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
 * 홈 맨 위의 다가오는 모임 — 흰 카드 왼쪽에 주황 D-day 뱃지, 옆에 두 줄
 * (이름 / 장소·시간), 오른쪽 끝에 ">".
 *
 * ★ 흰 카드 + 주황 뱃지 (2026-09-14, 사용자가 세 방향 가운데 "A"를 고름).
 *   그 전에는 주황 카드에 둘레가 차오르는 흰 D-day 원(2026-09-11, 네 시안 가운데 "흰 둘레 원")이었는데,
 *   ① 거의 찬 둘레가 로딩 표시처럼 보이고 ② 제목·장소·시간·아이콘·꺾쇠가 모두 흰색이라 강약이 없고
 *   ③ 같은 날 하단 탭·원우 칩·검색칸이 흰색·회색·먹색으로 가라앉은 가운데 진한 주황 덩어리만 튀어서
 *   바꿨습니다. 주황은 뱃지 한 곳에만 남겨 여전히 가장 먼저 눈에 들어옵니다.
 *   (B: 주황 카드에 링만 걷기, C: 일정 목록과 같은 날짜 칸 — 둘은 고르지 않았습니다.)
 *   지나온 모양: 주황 카드 → 흰 카드(원 둘레만 주황) → 주황 카드 + 흰 둘레 원 → 흰 카드 + 주황 뱃지.
 *
 * 카드 바탕·그림자는 원우수첩 검색칸과 같은 값입니다 — 흰 판 + 옅고 넓은 그림자 +
 * ring-black/[0.04]. 한쪽을 바꾸면 같이 봐 주세요.
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
      className="flex items-center gap-4 rounded-3xl bg-surface py-4 pl-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_6px_24px_rgba(28,25,23,0.07)] ring-1 ring-black/[0.04] transition active:scale-[0.99]"
    >
      <DdayBadge date={event.date} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[18px] leading-tight font-bold text-ink">
          {event.title}
        </span>
        {/*
          둘째 줄 — 장소 앞에 핀, 시간 앞에 시계. 아이콘이 둘을 갈라 주므로 사이의 " · "는 뺐습니다.
          자리가 모자라면 장소만 "…"로 줄고 시간은 끝까지 보입니다(shrink-0).
          아이콘·글씨 모두 중간 회색(ink-muted) — 흰 카드로 바꾸면서(2026-09-14) 흰색에서 옮겨,
          먹색 제목 → 회색 둘째 줄로 읽는 차례가 생겼습니다.
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
      {/*
        오늘의 OX 퀴즈 카드 오른쪽 위 ">"와 같은 크기·굵기(24px·2.1) — 2026-09-11에 두 꺾쇠의 가운데 값으로
        맞췄습니다. 한쪽을 바꾸면 DosanQuizCard.tsx도 같이 바꿔 주세요.
        색은 ink-faint — 흰 카드 위라 흰색 80%에서 옮겼습니다(2026-09-14). 일정 목록 카드의 ">"와 같은 색입니다.
      */}
      <span className="flex shrink-0 items-center pr-4 pl-3 text-ink-faint">
        <ChevronRightIcon className="h-6 w-6" strokeWidth={2.1} />
      </span>
    </Link>
  );
}

/**
 * 주황 D-day 뱃지 — 48px 둥근 네모(rounded-[14px]) 주황 바탕에 흰 굵은 글씨 (2026-09-14).
 *
 * 예전에는 둘레가 2주 전부터 차오르는 원(DdayRing, 나만의닥터 "다음 주사일" 카드의 원)이었습니다.
 * 거의 다 찬 둘레가 로딩 표시처럼 읽혀서 둘레를 걷고 판 하나로 바꿨습니다. 그래서 "얼마나
 * 다가왔는지"는 이제 숫자만 말합니다. 되살리려면 git 기록의 DdayRing을 보세요.
 *
 * - 크기 48px은 옛 원 지름 그대로 — 카드 높이와 옆 두 줄의 자리가 바뀌지 않습니다.
 * - 둥근 네모인 까닭: 원이면 옛 링과 같은 모양으로 읽히고, 알약이면 옆 칩·단추와 헷갈립니다.
 * - 글씨 크기는 글자 수로 줄입니다 — "D-5" 17px, "D-12" 15px, "D-DAY"·"D-100" 13px.
 *   둘레가 빠져 안쪽 폭이 40px → 48px로 넓어진 만큼 옛 값(16·14·11)보다 한 단씩 키웠습니다.
 * - 주황 위 흰 글씨는 대비가 약해(약 2.6:1) 늘 굵게(bold) 둡니다.
 *   어두운 화면에서도 brand-500은 그대로라 뱃지 모양이 같습니다.
 */
const DDAY_BADGE_SIZE = 48;

function DdayBadge({ date }: { date: string }) {
  const label = ddayLabel(date);
  const fontSize = label.length <= 3 ? 17 : label.length === 4 ? 15 : 13;

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[14px] bg-brand-500"
      style={{ width: DDAY_BADGE_SIZE, height: DDAY_BADGE_SIZE }}
    >
      <span className="leading-none font-bold tracking-tight text-white" style={{ fontSize }}>
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
        홈 맨 위 D-day 카드의 주황 뱃지(2026-09-14부터 흰 카드 + 주황 뱃지)와 같은 결이고,
        밝은·어두운 화면에서 똑같이 보입니다.
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
