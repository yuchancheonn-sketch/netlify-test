"use client";

import { useRouter } from "next/navigation";
import CohortPicker from "@/components/CohortPicker";
import MemberMapCard from "@/components/MemberMapCard";
import PageHeader from "@/components/PageHeader";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { useViewCohort } from "@/lib/use-view-cohort";

/**
 * 원우 지도 — 홈 바로가기 "원우 지도"로 들어오는 화면.
 *
 * 홈과 같은 기수를 봅니다(useViewCohort). 운영진만 제목 옆에서 기수를 바꿀 수 있고,
 * 여기서 바꾸면 홈·자료·모임도 같은 기수로 따라갑니다.
 * 돌아갈 자리는 홈 하나라, 왼쪽 위 <와 오른쪽으로 밀기 모두 홈으로 갑니다(모임 화면과 같음).
 */
export default function MapPage() {
  const router = useRouter();
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });

  return (
    /*
      지도 카드 안의 "내 지역 등록" 시트는 화면에 떠 있는(fixed) 상자입니다. 밀려나는
      상자(transform) 안에 있어도 괜찮은 이유: 시트 위에서 시작한 손짓은 넘기기로 보지
      않도록(data-no-swipe-back) 해 두었고, 시트가 화면을 다 덮고 있어 그 밖에서 밀 수가
      없습니다. 그래서 시트가 떠 있는 동안 화면이 밀려날 일이 없습니다.
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
              원우 지도
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "원우 지도"
          )
        }
        backHref="/home"
      />

      <div className="px-4 pb-8">
        <MemberMapCard />
      </div>
    </div>
  );
}
