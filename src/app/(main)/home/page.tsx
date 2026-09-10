"use client";

import Link from "next/link";
import CohortPicker from "@/components/CohortPicker";
import { EventDdayCard, EventListItem } from "@/components/EventCard";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import PollCard from "@/components/PollCard";
import SessionList from "@/components/SessionList";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import DosanAcademyFooter from "@/components/DosanAcademyFooter";
import DosanQuizCard from "@/components/DosanQuizCard";
import MemberMapCard from "@/components/MemberMapCard";
import { inCohort } from "@/lib/cohort";
import { APP_DEFINITION_TITLE } from "@/lib/constants";
import { useUpcomingEvents } from "@/lib/hooks";
import { quoteOfTheDay } from "@/lib/quotes";
import { useViewCohort } from "@/lib/use-view-cohort";

export default function HomePage() {
  const upcoming = useUpcomingEvents();
  /*
   * 홈은 기수마다 따로입니다 — 일정·투표·수업 기록 모두 보고 있는 기수의 것만.
   * 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서 바꿔 볼 수 있습니다.
   * 투표와 수업 기록은 각자 같은 값(useViewCohort)을 읽습니다.
   * (오늘의 도산은 모든 기수가 같은 말씀을 봅니다.)
   */
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const events = upcoming.data.filter((event) => inCohort(event, cohort));
  // 화면을 열 때의 날짜로 정합니다. 날짜가 바뀌면 다음에 열 때 새 말씀이 보입니다.
  const quote = quoteOfTheDay();

  const [nextEvent, ...laterEvents] = events;

  return (
    <>
      {/*
        홈의 제목 자리는 앱 이름 하나로만 씁니다.
        글씨는 다른 탭 제목("원우수첩", "자료" …)과 크기·굵기까지 똑같습니다.
        운영진에게만 이름 옆에 기수 고르기가 붙습니다.
      */}
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex items-center gap-2">
              {APP_DEFINITION_TITLE}
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            APP_DEFINITION_TITLE
          )
        }
        right={<HeaderActions />}
      />

      {/* 칸 사이는 20px. 아래 "모임 일정 전체 보기" 한 줄만 예외로 더 붙습니다. */}
      <div className="flex flex-col gap-5 px-4">
        {/* 오늘의 OX 퀴즈 — 도산 안창호 선생에 관한 문제가 하루 하나씩. 맨 위에 둡니다. */}
        <DosanQuizCard />

        {/*
          다가오는 모임 — D-day 한 줄. 오른쪽 ">"가 모임 일정 전체 보기로 갑니다
          (예전의 따로 선 "모임 일정 전체 보기" 상자를 이 카드에 합쳤습니다).
        */}
        <section>
          {upcoming.loading ? (
            <Skeleton className="h-[80px] rounded-3xl" />
          ) : nextEvent ? (
            <EventDdayCard event={nextEvent} />
          ) : (
            /*
              모임이 없어도 전체 일정 화면으로 갈 길은 남겨 둡니다 —
              운영진의 "일정 등록" 단추가 그 화면에 있습니다.
            */
            <Link
              href="/events"
              className="block rounded-3xl bg-surface shadow-[var(--shadow-card)] transition active:scale-[0.99]"
            >
              <EmptyState
                icon={<CalendarIcon className="h-9 w-9" />}
                title="다가오는 모임이 아직 없어요"
                description="운영진이 일정을 올리면 여기에 D-day로 표시됩니다."
              />
            </Link>
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
        ) : null}

        {/* 투표 — 원우 누구나 열 수 있고, 열려 있는 것만 여기 올라옵니다. */}
        <PollCard />

        {/* 오늘의 말씀 — 자정이 지나면 다음 말씀으로 넘어갑니다. */}
        <section>
          {/*
            다른 자리와 달리 제목을 카드 바깥이 아니라 안에 둡니다.
            말씀 한 편만 담긴 카드라, 제목과 글이 한 덩어리로 읽히는 편이 낫습니다.
            (SectionTitle을 쓰지 않고 같은 크기·굵기로 직접 적었습니다.)
          */}
          {/*
            제목 글씨 위 20px(pt-5), 아래 8px(mb-2). 카드 아래쪽 여백은 24px(pb-6).
            아래가 위(20px)보다 조금 넓은 것은 출처 줄의 글씨가 작아서 그렇습니다 —
            같은 값으로 맞추면 눈에는 아래가 더 좁아 보입니다.
            ★ 위 여백은 아래 "수업 기록" 카드와 같은 값이어야 나란히 보입니다.
          */}
          <div className="rounded-3xl bg-surface px-6 pt-5 pb-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-2 text-[18px] font-bold text-ink">오늘의 도산</h2>

            <p className="font-serif text-[18px] leading-[1.8] text-ink">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="mt-5 text-[13px] font-bold text-brand-500">도산 안창호</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
              {quote.source}
            </p>
          </div>
        </section>

        {/* 원우 지도 — 원우들이 등록한 시·도를 지도에 모아 봅니다. 보고 있는 기수만. */}
        <MemberMapCard />

        {/* 주차별 수업 기록 — 한 줄을 누르면 그 주 화면으로 넘어갑니다. */}
        <SessionList />

        {/* 맨 아래 — 과정을 여는 도산아카데미의 기관 정보. 다른 앱의 사업자 정보 자리입니다. */}
        <DosanAcademyFooter />
      </div>
    </>
  );
}
