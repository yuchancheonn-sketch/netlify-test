"use client";

import { useRouter } from "next/navigation";
import CohortPicker from "@/components/CohortPicker";
import PageHeader from "@/components/PageHeader";
import SessionList from "@/components/SessionList";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { useViewCohort } from "@/lib/use-view-cohort";

/**
 * 수업 기록 — 홈 바로가기 "수업 기록"으로 들어오는 화면. 1~10주차가 한 줄씩 있고,
 * 한 줄을 누르면 그 주 화면(/sessions/{주차})으로 갑니다.
 *
 * 홈과 같은 기수를 봅니다(useViewCohort). 운영진만 제목 옆에서 기수를 바꿀 수 있고,
 * 여기서 바꾸면 홈·자료·모임·원우 지도도 같은 기수로 따라갑니다.
 * 돌아갈 자리는 홈 하나라, 왼쪽 위 <와 오른쪽으로 밀기 모두 홈으로 갑니다(원우 지도와 같음).
 */
export default function SessionsPage() {
  const router = useRouter();
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });

  return (
    /*
      안에 떠 있는(fixed) 요소가 없어 화면 전체를 한 상자로 밀어도 됩니다.
      min-h-full: 내용이 짧아도 그 아래 빈 자리에서 민 손짓을 받습니다.
    */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex items-center gap-2">
              수업 기록
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "수업 기록"
          )
        }
        backHref="/home"
      />

      <div className="px-4 pb-8">
        <SessionList />
      </div>
    </div>
  );
}
