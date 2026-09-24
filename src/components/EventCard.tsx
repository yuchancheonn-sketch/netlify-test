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
 * 홈의 다가오는 모임(주요 일정). ★ 지금 모양(2026-09-25, D안 "주황 머리띠"):
 *   머리띠  "다가오는 일정 ··················· D-1"   (옅은 주황 바탕)
 *   1행     아구찜 번개                              >
 *   2행     09.15 (화) 오후 6:30  📍마산아구찜
 * 아래 주석들은 그 전 짜임의 기록입니다 — 예전 짜임: 1행 "D-1 09.15. 아구찜 번개", 2행 📍장소 🕒시간.
 *   (맨 위 "주요 일정" 이름표는 2026-09-23 사용자 요청으로 뺐습니다. 아래 주석의 "2행·3행"은 지금의 1·2행입니다.)
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
export function EventDdayCard({
  event,
  href = "/events",
  external = false,
}: {
  /** 우리 기수 모임(EventDoc)이거나 도산아카데미 일정 — 카드가 쓰는 칸만 받습니다 (2026-09-23). */
  event: Pick<EventDoc, "title" | "date" | "startTime" | "location">;
  /** 눌렀을 때 갈 곳. 기본은 모임 목록, 도산아카데미 일정은 원래 글 주소입니다. */
  href?: string;
  /** 앱 밖 주소(도산아카데미 글)면 새 창으로 엽니다. */
  external?: boolean;
}) {
  const time = event.startTime ? formatTime(event.startTime) : "";
  const date = parseDateString(event.date);
  /*
   * 흰 카드 + 회색 1px 테두리 — 홈의 다른 박스들과 같은 모양 (2026-09-23 사용자 "주요일정 박스의 색을 흰색으로").
   * 예전에는 주황 바탕에 흰 글씨였습니다. 바탕이 흰색이 되면서 글씨는 먹색, D-day만 주황으로 둡니다.
   */
  /*
   * ★ 2026-09-25 사용자 요청으로 "D · 주황 머리띠" 시안으로 바꿨습니다(다섯 시안 중에서 고름).
   *   카드 위에 옅은 주황 띠 "다가오는 일정 ··· D-7", 그 아래 큰 제목, 맨 아래 날짜·시간과 장소.
   *   그 전(2026-09-23~25)에는 한 줄에 "D-7 10.02. 제목", 아래 장소·시간 두 줄 짜임이었습니다.
   *   띠가 머리 끝까지 칠해지도록 카드가 overflow-hidden입니다.
   */
  const className =
    "flex flex-col overflow-hidden rounded-3xl bg-surface text-ink shadow-[var(--shadow-card-flat)] transition active:opacity-80";
  const dateText = date
    ? `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${WEEKDAYS[date.getDay()]})`
    : "";

  /*
   * 속은 한 벌이고 껍데기만 앱 안 링크(Link)와 바깥 링크(<a>)로 갈립니다.
   * 껍데기를 함수로 만들어 쓰면 그릴 때마다 새 컴포넌트가 되어 리액트가 속을 버리고 다시 만듭니다
   * (react-hooks/static-components). 그래서 조각(inside)만 만들어 두고 껍데기는 아래에서 직접 씁니다.
   */
  const inside = (
    <>
      {/*
        머리띠 — 주황 바탕에 흰 글씨 "다가오는 일정 D-7" (2026-09-25 사용자 요청: 옅은 주황 → 주황, 글씨 주황 → 흰색,
        D-day를 오른쪽 끝에서 "다가오는 일정" 바로 옆으로). 둘 다 13px 굵게, D-day만 한 단 더 굵게.
      */}
      <span className="flex items-center gap-1.5 bg-brand-500 px-5 py-[9px] text-[13px] font-bold text-white">
        <span>다가오는 일정</span>
        <span className="font-extrabold">{ddayLabel(event.date)}</span>
      </span>

      <span className="flex items-center gap-3 pt-3 pr-4 pb-3.5 pl-5">
        <span className="min-w-0 flex-1">
          {/* 일정 이름 18px 굵게 — 길면 "…"로 줄입니다. */}
          <span className="block truncate text-[18px] leading-tight font-bold">{event.title}</span>
          {/*
            날짜·시간 + 장소. 날짜·시간은 끝까지 보이고(shrink-0), 모자라면 장소만 "…"로 줄어듭니다.
            장소 앞에만 핀을 둡니다(시계 아이콘은 날짜·시간이 한 덩어리라 뺐습니다).
          */}
          <span className="mt-1 flex min-w-0 items-center gap-2.5 text-[14px] font-medium text-ink-muted">
            {dateText || time ? (
              <span className="shrink-0">{[dateText, time].filter(Boolean).join(" ")}</span>
            ) : null}
            {event.location ? (
              <span className="flex min-w-0 items-center gap-[3px]">
                <PinIcon className="h-[15px] w-[15px] shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            ) : null}
          </span>
        </span>
        {/*
          오늘의 OX 퀴즈 카드 오른쪽 위 ">"와 같은 굵기(2.1). 한쪽을 바꾸면 DosanQuizCard.tsx도 같이 바꿔 주세요.
          D안에서는 몸통(제목·장소 줄) 가운데에 섭니다.
        */}
        <span className="flex shrink-0 items-center text-ink-faint">
          <ChevronRightIcon className="h-6 w-6" strokeWidth={2.1} />
        </span>
      </span>
    </>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inside}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inside}
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
  external = false,
  children,
}: {
  /** 우리 기수 모임이거나 도산아카데미 일정 — 이 카드가 쓰는 칸만 받습니다 (2026-09-23). */
  event: Pick<EventDoc, "title" | "date" | "startTime" | "endTime" | "location">;
  href?: string;
  /** 앱 밖 주소(도산아카데미 글)면 새 창으로 엽니다. */
  external?: boolean;
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
    const linkClassName = `${box.replace("shadow-[var(--shadow-card)]", "shadow-[var(--shadow-card-flat)]")} flex items-center gap-4 transition active:scale-[0.99]`;
    const inside = (
      <>
        {row}
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
      </>
    );
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {inside}
      </a>
    ) : (
      <Link href={href} className={linkClassName}>
        {inside}
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
