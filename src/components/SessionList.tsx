"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import { useSessions } from "@/lib/hooks";
import { useViewCohort } from "@/lib/use-view-cohort";
import { COURSE_TOTAL_SESSIONS } from "@/lib/constants";
import type { SessionDoc } from "@/lib/types";

/**
 * 수업 기록 — 1주차부터 마지막 주차까지 한 줄씩. 보고 있는 기수의 기록입니다.
 *
 * 수업 기록 화면(/sessions)의 본문입니다. 2026-09-11 전에는 홈 아래쪽에 제목과 함께
 * 통째로 있었는데, 홈 바로가기 "수업 기록"으로 들어오는 화면으로 옮기면서 제목은
 * 화면 머리로 올라갔습니다.
 *
 * 한 줄을 누르면 그 주 화면(/sessions/{주차})으로 넘어갑니다. 예전에는
 * 바텀시트를 열었는데, 느낀점이 여럿이 주고받는 댓글이 되면서 시트로는
 * 좁아져 화면을 따로 뒀습니다. 주소에는 기수를 싣지 않습니다 — 그 화면도
 * 같은 useViewCohort를 읽으므로 같은 기수가 열립니다.
 */
export default function SessionList() {
  const { cohort } = useViewCohort();
  const sessions = useSessions(cohort);

  const sessionByWeek = useMemo(() => {
    const map = new Map<number, SessionDoc>();
    for (const session of sessions.data) map.set(session.week, session);
    return map;
  }, [sessions.data]);

  const weeks = useMemo(
    () => Array.from({ length: COURSE_TOTAL_SESSIONS }, (_, index) => index + 1),
    [],
  );

  if (sessions.loading) {
    return (
      <section>
        <Skeleton className="h-[320px] rounded-3xl" />
      </section>
    );
  }

  return (
    <section>
      {/*
        열 줄을 카드 한 장에 담습니다. 칸마다 카드를 띄우면 화면이 너무 길어집니다.
        제목("수업 기록")은 화면 머리(PageHeader)에 있습니다.
      */}
      <div className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        {/*
          맨 윗줄 위와 맨 아랫줄 아래에 8px씩 더 둡니다. 줄마다 위아래 12px씩
          갖고 있는데, 끝줄은 그 12px이 그대로 카드 끝이 되어 가운데 줄들보다
          답답해 보입니다.
        */}
        <ul className="py-2">
          {weeks.map((week, index) => {
            const session = sessionByWeek.get(week);
            const comments = session?.commentCount ?? 0;
            return (
              <li key={week}>
                {/*
                  줄 사이 구분선. 좌우 24px씩 들여 그어, 카드 테두리와 부딪히지
                  않고 안쪽에서 칸만 나눕니다. 맨 윗줄 위에는 긋지 않습니다 —
                  카드 윗단이 이미 갈라주고 있습니다.
                */}
                {index > 0 ? <div className="mx-6 border-t border-line" /> : null}

                <Link
                  href={`/sessions/${week}`}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-canvas"
                >
                  {/*
                    폭을 32px로 못 박아 두는 이유: 한 자리(1)와 두 자리(11)의
                    너비가 달라서, 그냥 두면 줄마다 제목 시작점이 어긋납니다.
                    tabular-nums는 숫자 폭을 서로 같게 맞춰줍니다.
                  */}
                  <span className="w-8 shrink-0 text-center text-[19px] font-bold text-brand-500 tabular-nums">
                    {week}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-ink">
                      {session?.topic || `${week}주차`}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
                      {[
                        session?.instructor ? `${session.instructor} 강사님` : null,
                        comments > 0 ? `느낀점 ${comments}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "아직 비어 있어요"}
                    </span>
                  </span>

                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
