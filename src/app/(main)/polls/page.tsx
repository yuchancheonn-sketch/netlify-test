"use client";

import { useRouter } from "next/navigation";
import CohortPicker from "@/components/CohortPicker";
import PageHeader from "@/components/PageHeader";
import { PollBoard } from "@/components/PollCard";
import { VoteStampIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { usePolls } from "@/lib/hooks";
import { isPollForCohort } from "@/lib/polls";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { useViewCohort } from "@/lib/use-view-cohort";

/**
 * 역대 투표 — 홈 투표 칸 아래 "역대 투표" 줄로 들어오는 화면 (2026-09-11).
 *
 * 홈에는 열린 투표만 올라오고 닫히면 내려가서, 지난 결과를 다시 볼 곳이 없었습니다.
 * 여기서는 그 기수에 올라온 투표·의견 모으기를 열린 것·닫힌 것 모두 최신순으로 보여줍니다.
 * 한 칸은 홈과 같은 PollBoard라, 열린 것은 여기서도 바로 고르고 닫힌 것은 결과만 보입니다.
 *
 * 보이는 기준은 홈과 같습니다 — 그 기수 것 + 모든 기수에 올린 것(lib/polls.ts의 isPollForCohort).
 * 운영진만 제목 옆에서 기수를 바꿀 수 있고, 돌아갈 자리는 홈이라 <와 오른쪽 밀기 모두 홈으로 갑니다.
 */
export default function PollsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const { data, loading, error } = usePolls();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });

  // usePolls가 이미 최신순으로 줍니다.
  const polls = data.filter((poll) => isPollForCohort(poll, cohort));

  return (
    /* 수업 기록 화면과 같은 짜임새 — 화면 전체를 한 상자로 밀어 홈으로 돌아갑니다. */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex items-center gap-2">
              역대 투표
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "역대 투표"
          )
        }
        backHref="/home"
      />

      <div className="flex flex-col gap-3 px-4 pb-8">
        {loading ? (
          <>
            <Skeleton className="h-[220px] rounded-3xl" />
            <Skeleton className="h-[220px] rounded-3xl" />
          </>
        ) : error ? (
          <ErrorState message={error} />
        ) : polls.length === 0 ? (
          <EmptyState icon={<VoteStampIcon className="h-9 w-9" />} title="아직 올라온 투표가 없어요" />
        ) : (
          polls.map((poll) => <PollBoard key={poll.id} poll={poll} myUid={user?.uid} />)
        )}
      </div>
    </div>
  );
}
