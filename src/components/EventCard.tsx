"use client";

import Link from "next/link";
import { ChevronRightIcon, ClockIcon, PinIcon } from "@/components/icons";
import { ddayLabel, formatTime, parseDateString, WEEKDAYS } from "@/lib/format";
import type { EventDoc } from "@/lib/types";

/**
 * 홈의 다가오는 모임(주요 일정). ★ 지금 모양(2026-09-25, C안 "큰 D-day"):
 *    D-1   │ 아구찜 번개                   >
 *   09.15 화│ 오후 6:30 · 마산아구찜
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
  href,
  external = false,
}: {
  /** 우리 기수 모임(EventDoc)이거나 도산아카데미 일정 — 카드가 쓰는 칸만 받습니다 (2026-09-23). */
  event: Pick<EventDoc, "title" | "date" | "startTime" | "location"> & { endTime?: string };
  /**
   * 눌렀을 때 갈 곳 — 도산아카데미 일정은 원래 글 주소. 안 주면 누르는 카드가 아니고 오른쪽 ">"도 없습니다.
   * (우리 기수 모임은 예전엔 모임 목록 /events로 갔는데, 그 화면을 2026-09-26에 없애 이제 주지 않습니다.)
   */
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
   * ★ 지금은 "C · 큰 D-day" 시안입니다 (2026-09-25 사용자 요청, 다섯 시안 중에서 고름).
   *   왼쪽에 큰 주황 D-day와 그 아래 작은 날짜, 가는 세로 선, 오른쪽에 제목과 "시간 · 장소".
   *   같은 날 잠깐 "D · 주황 머리띠"(카드 위 주황 띠 "다가오는 일정 D-7")였다가 이것으로 바꿨습니다.
   *   그 전(2026-09-23~25)에는 한 줄에 "D-7 10.02. 제목", 아래 장소·시간 두 줄 짜임이었습니다.
   */
  /*
   * ★ 지금은 "주황 막대" 짜임입니다 (2026-09-25 사용자가 홈 달력의 일정 줄 캡처를 보내며 "이렇게 해봐").
   *     D-7 · 10.02 금                 ← 주황 D-day(막대 바로 위) + 회색 날짜
   *   ┃ 제목(굵게, 길면 줄을 바꿔 끝까지)   >
   *   ┃ 오후 6:30 ~ 오후 10:30 · 장소
   *   막대·제목·회색 줄은 HomeCalendar의 고른 날 일정 줄과 같은 결(막대 w-1, break-keep)입니다.
   *   ★ 같은 날 "두 부분을 같은 비율로 좀 줄여줘"로 D-day·날짜·제목·시간 장소·아이콘·막대 위쪽을 모두 0.9배로 줄였습니다
   *     (D-day 22→20, 날짜 14.5→13, 제목 17→15.5, 시간·장소 14→12.5, 시계 16→14.5, 핀 18→16, 막대 위쪽 4→3.5px).
   *     아래 주석들의 옛 px 값은 그 전 기록입니다. 캘린더 일정 줄도 같은 값입니다.
   *   바로 앞은 아래 주석의 "C · 큰 D-day"(왼쪽 큰 D-day | 세로 선 | 제목)였습니다 — 되살리려면 git 기록.
   */
  const className =
    // pt-[17px] — 위 흰 여백 (2026-09-25 사용자 "1px 늘려줘", 16px(py-4)에서).
    // pb-[19px] — 아래 흰 여백 (같은 날 사용자 "1.5px 만큼 늘려줘" 두 번, 16 → 17.5 → 19px).
    // pr-[16.5px] — 오른쪽 ">" 끝을 오늘의 OX 퀴즈 카드의 ">" 끝과 같은 줄(카드 끝에서 16.5px)에 맞춤
    //   (2026-09-26 사용자 "위치도 같은 선에 정렬" 12px → 18px, 이어서 두 카드 함께 "오른쪽으로 1.5px" → 16.5px).
    "flex items-center gap-2 rounded-card bg-surface pt-[17px] pb-[19px] pr-[16.5px] pl-5 text-ink shadow-[var(--shadow-card-flat)] transition active:opacity-80";
  const dday = ddayLabel(event.date);
  /** D-day 옆 작은 날짜 — "10.02 금" */
  const dateText = date
    ? `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${WEEKDAYS[date.getDay()]}`
    : "";
  /** "오후 6:30 ~ 오후 10:30" — 이제 줄을 바꿀 수 있어 끝나는 시간까지 적습니다(예전엔 한 줄이라 시작만). */
  const timeText =
    time && event.endTime ? `${time} ~ ${formatTime(event.endTime)}` : time;

  /*
   * 속은 한 벌이고 껍데기만 앱 안 링크(Link)와 바깥 링크(<a>)로 갈립니다.
   * 껍데기를 함수로 만들어 쓰면 그릴 때마다 새 컴포넌트가 되어 리액트가 속을 버리고 다시 만듭니다
   * (react-hooks/static-components). 그래서 조각(inside)만 만들어 두고 껍데기는 아래에서 직접 씁니다.
   */
  const inside = (
    <>
      <span className="min-w-0 flex-1">
        {/* 맨 위 — 주황 D-day(굵게)와 회색 날짜. 막대의 왼쪽 끝과 같은 자리에서 시작해 막대 "위"에 섭니다. */}
        <span className="flex items-baseline gap-1.5 leading-none">
          {/*
            22px — 같은 날 사용자 "5px 만큼 키워줘"(17px에서).
            -ml-[2px] — "D"의 세로 획을 막대 왼쪽 끝과 딱 맞춥니다(같은 날 사용자 요청). 글자는 제 칸 왼쪽에 여백이
            조금 붙어 그려져서(22px 굵은 D는 약 2px), 같은 자리에서 시작해도 막대보다 안쪽으로 들어가 보였습니다.
            D-day 크기를 바꾸면 이 값도 크기에 비례해 같이 바꿔 주세요.
          */}
          {/* [-webkit-text-stroke:0.3px] — 같은 날 "아주 조금만 더 굵게". 700 글씨에 얇은 테두리(다음 굵기 900은 너무 굵음). */}
          {/*
            21px·700 — 같은 날 사용자 "굵기 아주 조금만 줄이고, 크기는 조금만 키워줘": 20px에 둘렀던 0.3px 테두리를 걷고 1px 키움.
            -ml-[1.9px]도 크기에 맞춰(22px일 때 2px).
          */}
          {/* [-webkit-text-stroke:0.2px] — 2026-09-26 사용자 "아주 조금만 더 굵게". 700 글씨에 얇은 테두리(전에 0.3px은 걷었음). */}
          <span className="-ml-[1.9px] text-[21px] font-bold tracking-tight whitespace-nowrap [-webkit-text-stroke:0.2px_currentColor] text-brand-500">{dday}</span>
          {dateText ? (
            // 15px — 같은 날 사용자 요청(13 → 14.5 → 0.9배 13 → "2px 키워줘" 15px). 위로 2px(-translate-y-[2px]) — "1px 위로" 두 번.
            <span className="-translate-y-[2px] text-[15px] font-medium whitespace-nowrap text-ink-muted">{dateText}</span>
          ) : null}
        </span>

        {/*
          주황 막대 + 글 — 막대는 글이 두세 줄로 늘면 그만큼 길어집니다(self-stretch).
          mt-[9px] — 막대와 글을 통째로 1px 위로 (같은 날 사용자 요청, 10px(mt-2.5)에서).
        */}
        <span className="mt-[9px] flex gap-2.5">
          {/* 막대 3px — 같은 날 사용자 "두께 좀 줄여줘"(4px, w-1에서). */}
          {/*
            mt-[4px] — 막대 위쪽 끝을 제목 글자의 윗머리 높이에 맞춥니다 (같은 날 사용자 요청. 그 전엔 0.5px씩 두 번 줄여 1px).
            제목 줄(17px, 줄 높이 1.375)은 글자 위에 빈 줄 간격이 있어, 줄 맨 위보다 약 4px 아래에서 한글 윗머리가 시작합니다
            (글꼴 치수로 셈: 글줄 위 여백 + 한글이 글꼴 윗선보다 낮게 그려지는 몫 − 글 덩어리를 올린 0.5px).
            캡처로 재어 7.5px로 했다가 "너무 줄었다"고 해서 계산값으로 고쳤습니다. 제목 크기·줄 높이를 바꾸면 이 값도 같이.
          */}
          {/*
            막대 색 — 도산아카데미 사이트에서 이어진 공식 일정(external)은 주황, 원우가 올린 우리 기수 일정은 먹색
            (2026-09-25 사용자 요청. 홈 캘린더의 고른 날 일정 줄과 같은 기준).
          */}
          <span
            aria-hidden="true"
            className={`mt-[3.5px] w-[3px] shrink-0 self-stretch rounded-full ${external ? "bg-brand-500" : "bg-ink"}`}
          />
          {/* -translate-y-[0.5px] — 제목·시간·장소 글 덩어리를 0.5px 위로 (같은 날 사용자 요청). 막대는 따라가지 않습니다. */}
          <span className="min-w-0 flex-1 -translate-y-[0.5px]">
            {/*
              일정 이름 17px — 두 줄까지, 넘치면 "…"(line-clamp-2). 같은 날 사용자 요청으로
              끝까지 → 한 줄 → 두 줄. break-keep으로 한글은 낱말 단위로 넘깁니다.
              굵기 500(font-medium) — 같은 날 "아주 조금만 더 얇게"(600에서).
              그 뒤 "아주 조금만 더 두껍게" — 600으로 돌아가면 너무 굵어서, 500 글씨에 0.25px 테두리를 둘러
              500과 600 사이로 만듭니다([-webkit-text-stroke]). 더 두껍게는 0.4px쯤, 그 이상은 font-semibold.
            */}
            <span className="line-clamp-2 text-[15.5px] leading-snug font-medium break-keep [overflow-wrap:anywhere] [-webkit-text-stroke:0.25px_currentColor]">
              {event.title}
            </span>
            {/*
              시간·장소 한 줄 — 앞에 시계·핀 아이콘 (같은 날 사용자 요청). 시간은 자르지 않고, 장소만 길면 "…".
              둘 중 없는 것은 빼고, 둘 다 없으면 줄째 없앱니다.
            */}
            {timeText || event.location ? (
              // gap-2 — 시간과 장소 사이 8px (같은 날 사용자 "장소를 시간에 조금 더 붙여줘", 12px에서).
              <span className="mt-1 flex items-center gap-2 text-[12.5px] leading-snug font-medium text-ink-muted">
                {timeText ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <ClockIcon className="h-[14.5px] w-[14.5px]" />
                    {timeText}
                  </span>
                ) : null}
                {event.location ? (
                  // gap-px — 핀과 장소 글씨 사이 1px (같은 날 사용자 "조금 더 붙여줘" 두 번, 4px → 2px → 1px).
                  <span className="flex min-w-0 items-center gap-px">
                    {/*
                      핀 18px — 같은 날 사용자 "1.5px 키워줘" → "0.5px 더"(16px → 17.5px → 18px). 시계는 16px 그대로.
                      선 굵기 1.5 — 같은 날 "굵기 좀 줄여줘"(기본 1.8에서). -translate-y-[0.25px] — "0.25px 위로".
                    */}
                    <PinIcon strokeWidth={1.5} className="h-[16px] w-[16px] shrink-0 -translate-y-[0.25px]" />
                    <span className="truncate">{event.location}</span>
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        </span>
      </span>

      {/*
        오늘의 OX 퀴즈 카드 오른쪽 위 ">"와 같은 크기·굵기·색(24px·2.1). 한쪽을 바꾸면 DosanQuizCard.tsx도 같이 바꿔 주세요.
        색은 옅은 회색(ink-faint)과 진한 회색(ink-muted)의 딱 중간 (2026-09-26 사용자 "두 > 크기를 평균으로 똑같이" —
        크기는 둘 다 24px로 같았는데 색이 달라 퀴즈 쪽이 커 보였습니다).
      */}
      {href ? (
        <span className="flex shrink-0 items-center text-[color-mix(in_srgb,var(--color-ink-faint)_50%,var(--color-ink-muted))]">
          <ChevronRightIcon className="h-6 w-6" strokeWidth={2.1} />
        </span>
      ) : null}
    </>
  );

  if (!href) return <div className={className}>{inside}</div>;
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

