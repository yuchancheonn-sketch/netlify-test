"use client";

import { useState } from "react";
import Link from "next/link";
import { EventHeroCard, EventListItem } from "@/components/EventCard";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import SessionNotes from "@/components/SessionNotes";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { APP_DEFINITION_TITLE } from "@/lib/constants";
import { useUpcomingEvents } from "@/lib/hooks";
import { quoteOfTheDay } from "@/lib/quotes";

export default function HomePage() {
  const events = useUpcomingEvents();
  // 화면을 열 때의 날짜로 정합니다. 날짜가 바뀌면 다음에 열 때 새 말씀이 보입니다.
  const quote = quoteOfTheDay();

  const [nextEvent, ...laterEvents] = events.data;

  return (
    <>
      {/*
        홈의 제목 자리는 앱 이름 하나로만 씁니다.
        글씨는 다른 탭 제목("원우수첩", "자료" …)과 크기·굵기까지 똑같습니다.
      */}
      <PageHeader title={APP_DEFINITION_TITLE} right={<HeaderActions />} />

      {/* 칸 사이는 20px. 아래 "모임 일정 전체 보기" 한 줄만 예외로 더 붙습니다. */}
      <div className="flex flex-col gap-5 px-4">
        {/* 다가오는 모임 */}
        <section>
          {events.loading ? (
            <Skeleton className="h-[150px] rounded-3xl" />
          ) : nextEvent ? (
            <EventHeroCard
              event={nextEvent}
              caption="주요 일정"
              href={`/events/${nextEvent.id}`}
            />
          ) : (
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<CalendarIcon className="h-9 w-9" />}
                title="다가오는 모임이 아직 없어요"
                description="운영진이 일정을 올리면 여기에 D-day로 표시됩니다."
              />
            </div>
          )}
        </section>

        {/* 이후 일정 */}
        {laterEvents.length > 0 ? (
          <section>
            <SectionTitle
              action={
                <Link
                  href="/events"
                  className="flex items-center gap-0.5 text-[13px] font-bold text-brand-500"
                >
                  전체 일정
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              }
            >
              이후 일정
            </SectionTitle>
            <ul className="flex flex-col gap-3">
              {laterEvents.slice(0, 2).map((event) => (
                <li key={event.id}>
                  <EventListItem event={event} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          /*
            -mt-3으로 위 카드와의 간격을 20 → 8px로 좁힙니다.
            (바깥 상자의 gap-5에서 12px을 도로 당겨오는 셈입니다.)
            제목 없이 한 줄짜리 링크라 위 카드에 딸린 것처럼 붙는 편이 자연스럽습니다.
          */
          <Link
            href="/events"
            className="-mt-3 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
              <CalendarIcon className="h-[26px] w-[26px] text-brand-500" />
              모임 일정 전체 보기
            </span>
            <ChevronRightIcon className="h-[26px] w-[26px] text-ink-faint" />
          </Link>
        )}

        {/* 오늘의 말씀 — 자정이 지나면 다음 말씀으로 넘어갑니다. */}
        <section>
          {/*
            다른 자리와 달리 제목을 카드 바깥이 아니라 안에 둡니다.
            말씀 한 편만 담긴 카드라, 제목과 글이 한 덩어리로 읽히는 편이 낫습니다.
            (SectionTitle을 쓰지 않고 같은 크기·굵기로 직접 적었습니다.)
          */}
          {/*
            제목 글씨 위 20px(pt-5), 아래 8px(mb-2). 카드 아래쪽 여백은 그대로 28px.
            ★ 위 여백은 아래 "수업 기록" 카드와 같은 값이어야 나란히 보입니다.
          */}
          <div className="rounded-3xl bg-white px-6 pt-5 pb-7 shadow-[var(--shadow-card)]">
            <h2 className="mb-2 text-[18px] font-bold text-ink">오늘의 도산</h2>

            <p className="font-serif text-[18px] leading-[1.8] text-ink">
              &ldquo;{quote.text}&rdquo;
            </p>

            {/*
              이름·출처는 왼쪽, 초상은 오른쪽 아래.

              초상을 말씀 글 위에 얹지 않고 이 줄에 나란히 세운 이유:
              말씀은 날마다 바뀌어 길이가 제각각입니다. 초상을 카드 구석에
              띄워 두면 짧은 말씀에서는 허전하고 긴 말씀에서는 글자를 덮습니다.
              한 줄에 세워 두면 말씀이 길든 짧든 초상은 늘 이름 옆, 카드
              오른쪽 아래에 앉습니다.

              items-end로 초상의 아랫변을 출처 글의 밑줄에 맞춥니다.
              초상이 두 줄보다 높아서 위로 자라나며, 그만큼이 말씀과 이름 사이
              빈자리를 채웁니다.
            */}
            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-brand-500">도산 안창호</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                  {quote.source}
                </p>
              </div>
              <DosanPortrait />
            </div>
          </div>
        </section>

        {/* 주차별 수업 기록 — 주제·강사는 함께 채우고, 느낀점은 각자 남깁니다. */}
        <SessionNotes />
      </div>
    </>
  );
}

/**
 * "오늘의 도산" 카드 오른쪽 아래에 앉는 도산 선생 초상.
 *
 * 흰 바탕에 검은 점으로 찍은 판화풍 그림이라 흰 카드에 그대로 얹힙니다.
 * (로그인 화면 배경으로 쓰는 brand/dosan.jpg는 배경이 어두운 컬러 사진이라
 *  여기에는 맞지 않습니다. 그래서 파일을 따로 둡니다.)
 *
 * mix-blend-multiply를 거는 이유: 그림의 흰 배경이 카드의 흰색과 조금이라도
 * 다르면 네모난 자국이 드러납니다. 곱하기로 겹치면 흰색은 아무것도 남기지
 * 않고 사라져서, 그림이 카드에 직접 인쇄된 것처럼 보입니다.
 *
 * 파일이 아직 없으면 조용히 자리를 비웁니다. 깨진 그림 아이콘이 뜨는 것보다
 * 낫고, 파일을 넣는 순간 따로 고칠 것 없이 나타납니다.
 */
function DosanPortrait() {
  const [missing, setMissing] = useState(false);
  if (missing) return null;

  return (
    /*
      next/image가 아니라 맨 img를 쓰는 이유: next/image는 가로·세로를 미리
      알려줘야 하는데, 이 파일은 나중에 넣는 것이라 비율을 못 박아 둘 수
      없습니다. 높이만 정하고 너비는 그림의 실제 비율대로 따라오게 둡니다.
    */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/dosan-portrait.png"
      alt=""
      aria-hidden="true"
      onError={() => setMissing(true)}
      className="h-[84px] w-auto shrink-0 mix-blend-multiply select-none"
    />
  );
}
