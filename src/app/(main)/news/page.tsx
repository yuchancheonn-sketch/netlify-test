"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AlbumList from "@/components/AlbumList";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { useViewCohort } from "@/lib/use-view-cohort";

/**
 * 소식 탭 — 원우 소식 (원우가 올리는 게시물 카드, components/AlbumList.tsx).
 *
 * ★ 2026-09-22에 이 탭이 여러 번 바뀌었습니다(모두 사용자 요청).
 *   1) 이 탭의 "복습 영상"과 자료 탭의 "행사 사진"을 맞바꿈 → 행사 사진 | 소식
 *   2) "행사 사진"을 "원우 소식"으로 이름 바꿈, 앨범 격자를 넘겨 보는 카드로
 *   3) 도산아카데미 사이트와 이어진 "소식"(RSS) 칸을 자료 탭(/library?tab=news)으로 옮김 — components/NewsList.tsx
 *   그래서 이제 칸이 하나뿐이라 서브탭 고르개 없이 제목 "원우 소식"만 둡니다.
 *   (예전 주소 /news?tab=news로 들어오면 /library?tab=news로 넘깁니다 — 아래 useEffect. 새 소식 알림은 처음부터 그 주소.)
 */
export default function NewsPage() {
  const router = useRouter();
  /*
   * 예전 알림(알림 목록에 남은 "도산아카데미 새 소식")은 /news?tab=news를 엽니다. 그 칸이 자료 탭으로 옮겨 갔으니
   * 그리로 넘깁니다. useSearchParams 대신 location을 읽어 Suspense 없이 끝냅니다(상태는 건드리지 않음).
   */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "news") {
      router.replace("/library?tab=news");
    }
  }, [router]);

  /*
   * 원우 소식은 기수마다 따로입니다. 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서
   * 바꿔 봅니다. 카드 목록이 같은 값(useViewCohort)을 읽습니다.
   */
  const { cohort, canSwitch, setCohort } = useViewCohort();

  return (
    <>
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">원우 소식</span>
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "원우 소식"
          )
        }
        right={<HeaderActions />}
      />

      {/*
        pt-4 — 카드 틀과 제목 줄 사이 16px. 제목 줄의 pb(6px)에 더해 22px입니다.
        홈·원우수첩과 같은 값이라 탭들의 첫 칸이 같은 높이에서 시작합니다.

        ★ 이 여백을 PageHeader의 pb로 주지 않는 이유
          제목 줄은 붙박이라 그 pb만큼의 본문이 스크롤할 때 제목 아래에 숨습니다.

        ★ 아래 여백은 없습니다 — 카드 틀이 "소식 올리기" 알약 위까지 화면을 채우고 스크롤하지 않습니다
          (components/AlbumList.tsx의 BookFrame이 높이를 잽니다). 여기에 여백을 더하면 화면이 괜히 조금 스크롤됩니다.
      */}
      <div className="px-4 pt-4">
        <AlbumList />
      </div>
    </>
  );
}
