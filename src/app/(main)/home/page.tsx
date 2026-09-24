"use client";

import Link from "next/link";
import CohortPicker from "@/components/CohortPicker";
import { EventDdayCard } from "@/components/EventCard";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import PollCard from "@/components/PollCard";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import DosanAcademyFooter from "@/components/DosanAcademyFooter";
import DosanQuizCard from "@/components/DosanQuizCard";
import HomeShortcuts from "@/components/HomeShortcuts";
import HomeCalendar from "@/components/HomeCalendar";
import { inCohort } from "@/lib/cohort";
import { APP_DEFINITION_TITLE } from "@/lib/constants";
import { todayString } from "@/lib/format";
import { useAcademyEvents, useUpcomingEvents } from "@/lib/hooks";
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
  // 화면을 열 때의 날짜로 정합니다. 날짜가 바뀌면 다음에 열 때 새 말씀이 보입니다.
  const quote = quoteOfTheDay();

  /*
   * 주요 일정(D-day 카드) — 우리 기수 모임과 도산아카데미 일정을 한 줄로 세워 가장 가까운 하나를 씁니다
   * (2026-09-23 사용자 요청 "가장 가까운 일정이 자동으로, 하나가 끝나면 그다음").
   * 오늘 지난 일정은 useUpcomingEvents·아래 today 비교에서 빠지므로, 날이 바뀌면 저절로 다음 일정이 올라옵니다.
   */
  const academy = useAcademyEvents();
  const today = todayString();
  const events = [
    ...upcoming.data
      .filter((event) => inCohort(event, cohort))
      .map((event) => ({ ...event, key: `e-${event.id}`, href: "/events", external: false })),
    ...academy.data
      .filter((event) => event.date >= today)
      .map((event) => ({ ...event, key: `a-${event.id}`, href: event.link, external: true })),
  ].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"),
  );

  const [nextEvent] = events;

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

      {/*
        칸 사이는 14px (20px → 16px(2026-09-11) → 14px(2026-09-22 사용자 "아주 조금씩 줄여줘")).
        Tailwind 단계(12px·16px) 사이 값이라 직접 적습니다.
        ("이후 일정" 칸은 2026-09-23에 없앴습니다 — 그 안의 12px 간격 이야기도 함께 지웠습니다.)

        pt-2 — 맨 위 OX 퀴즈 카드와 제목 줄 사이 8px
        (16px(2026-09-14) → 12px(2026-09-22 사용자 "박스 위 간격 좀 줄여줘") → 10px → 8px(둘 다 2026-09-25 사용자 요청)).
        제목 줄의 pb(6px)에 더해 14px이 됩니다 (예전 22px → 18px).
        ★ 카드 **안쪽** 위 여백(DosanQuizCard의 pt-[17px])은 그대로입니다 — 그쪽은
          제목 글씨와 카드 테두리 사이라 여기와 따로 맞춰 둔 값입니다.

        ★ 이 여백을 PageHeader의 pb로 주지 않는 이유
          제목 줄은 붙박이라 그 pb만큼의 본문이 스크롤할 때 제목 아래에 숨습니다.
          여기에 주면 본문과 함께 굴러가므로 아무것도 가리지 않습니다.
      */}
      <div className="flex flex-col gap-[14px] px-4 pt-2">
        {/* 오늘의 OX 퀴즈 — 도산 안창호 선생에 관한 문제가 하루 하나씩. 맨 위에 둡니다. */}
        <DosanQuizCard />

        {/*
          다가오는 모임 — D-day 한 줄. 누르면 모임 일정 전체 보기로 갑니다
          (예전의 따로 선 "모임 일정 전체 보기" 상자를 이 카드에 합쳤습니다).
        */}
        <section>
          {upcoming.loading || academy.loading ? (
            /* 머리띠 카드(2026-09-25 D안)와 같은 높이 — 띠 약 36px + 몸통(위 12 · 제목 · 4 · 날짜/장소 · 아래 14) 약 73px ≈ 109px.
               (2026-09-23~25의 두 줄 카드는 81px, 그전 세 줄 카드는 109px이었습니다.) */
            <Skeleton className="h-[109px] rounded-3xl" />
          ) : nextEvent ? (
            <EventDdayCard event={nextEvent} href={nextEvent.href} external={nextEvent.external} />
          ) : (
            /*
              모임이 없을 때 — 한 줄짜리 낮은 상자 (2026-09-15 사용자 요청: "박스 높이 훨씬 줄이고,
              일정 추가 단추는 최대한 눈에 안 띄게·간소하게").
              왼쪽 달력 그림 · 가운데 "다가오는 모임이 아직 없어요" · 오른쪽 끝에 옅은 회색 "+ 등록" 글자 링크(/events/new).
              단추 모양(주황 알약)을 걷고 글자만 두어 홈에서 눈길을 끌지 않으면서, 필요한 원우는 바로 찾게 했습니다.
              높이는 위아래 12px + 한 줄 (2026-09-22 사용자 "박스 높이 줄여줘"로 16px에서 4px씩 내렸습니다.
              2026-09-15에 가운데 정렬 빈 화면 약 170px에서 이 한 줄짜리로 바꾼 뒤 두 번째 감량입니다).
              "+ 등록"은 손끝 자리를 넉넉히 두려고 글자보다 큰 상자(px-2 py-1.5)에 둡니다.
              ★ 더 줄이려면 그 py-1.5부터 봐야 합니다 — 상자 높이를 정하는 것은 이제 위아래 여백이
                아니라 이 링크의 높이입니다. 다만 줄이면 손끝이 닿는 자리도 같이 좁아집니다.
              위치: 상자 오른쪽 여백 pr-[11px] + 단추 안쪽 8px → 글자가 카드 끝에서 19px 안쪽 (2026-09-15 사용자 지정).
              같은 날 12px(pr-3 + -mr-2) → 44px(pr-9, "왼쪽으로 많이") → 20px → 19px로 맞췄습니다.
              지나온 모양(같은 날): 카드 전체가 모임 목록 링크 → 주황 "모임 등록하기" 단추 → 설명 문구 삭제 → 지금.
            */
            <div className="flex items-center gap-3 rounded-3xl bg-surface py-3 pr-[11px] pl-5 shadow-[var(--shadow-card-flat)]">
              {/* 달력 그림은 앱의 기본 주황(brand-500) — 처음엔 옅은 brand-300이라 흐린 주황으로 보인다고 해서 바꿨습니다(2026-09-15). */}
              <CalendarIcon className="h-[22px] w-[22px] shrink-0 text-brand-500" />
              {/*
                색은 먹색(ink), 굵기는 medium(500) — 둘 다 2026-09-22 사용자 요청
                ("검은색으로 바꿔주고 글씨 굵기를 좀 줄여줘"). 그 전에는 ink-soft + bold였습니다.
                ★ 500 아래는 400(normal)뿐입니다. layout.tsx가 Noto Sans KR을 400·500·700·900
                  네 벌만 받아서, 600을 적어도 브라우저가 700으로 그립니다. 더 얇게 하려면 font-normal.
              */}
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                다가오는 모임이 아직 없어요
              </p>
              <Link
                href="/events/new"
                className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1.5 text-[14px] font-medium text-ink-faint transition active:bg-fill"
              >
                <PlusIcon className="h-4 w-4" />
                등록
              </Link>
            </div>
          )}
        </section>

        {/*
          한 달 캘린더 — 다가오는 모임 바로 밑 (2026-09-23 사용자 요청).
          우리 기수 모임 + 도산아카데미 일정(새 글에서 서버가 읽어 넣음), 폰 캘린더 연결까지. components/HomeCalendar.tsx (모임 화면의 MonthCalendar와 따로)
        */}
        <HomeCalendar cohort={cohort} />

        {/*
          투표·의견 모으기 — 원우 누구나 열 수 있고, 열려 있는 것만 여기 올라옵니다.
          다가오는 모임(D-day) 카드 바로 아래에 둡니다(2026-09-11 — 예전엔 이후 일정 아래).
          열린 것이 없으면 PollCard가 아무것도 그리지 않아 바로가기가 곧바로 이어집니다.
        */}
        <PollCard />

        {/* 바로가기 — 투표 만들기 · 의견 모으기 · 수업 기록 · 역대 투표. 그림 아이콘과 이름을 2열로. */}
        <HomeShortcuts />

        {/*
          "이후 일정" 칸(다음 일정 두 개 + "전체 일정" 링크)은 2026-09-23 사용자 요청으로 없앴습니다.
          다가오는 일정은 위 주황 카드(가장 가까운 하나)와 캘린더에서 봅니다. 되살리려면 git 기록을 보세요.
        */}

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
            ★ 위 여백은 수업 기록 화면(/sessions)의 카드와 같은 값입니다 — 둘이 같은 결로 보이게.
          */}
          <div className="rounded-3xl bg-surface px-6 pt-5 pb-6 shadow-[var(--shadow-card-flat)]">
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

        {/* 맨 아래 — 과정을 여는 도산아카데미의 기관 정보. 다른 앱의 사업자 정보 자리입니다. */}
        <DosanAcademyFooter />
      </div>
    </>
  );
}
