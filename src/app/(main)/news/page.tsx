"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlbumList, { type AlbumCategory } from "@/components/AlbumList";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import TextTabs from "@/components/TextTabs";
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
/**
 * 소식 탭의 두 칸 (2026-09-23 사용자 요청 "위원회ㅣ원우소식").
 * 둘 다 같은 카드 짜임(AlbumList)이고, 위원회 칸에는 "소식 올리기" 단추가 없습니다.
 * 데이터는 한 곳(photoAlbums)에 있고 category 칸으로 갈립니다 — 칸이 없는 예전 소식은 원우 소식입니다.
 */
const SUBTABS = [
  { value: "committee", label: "위원회" },
  { value: "member", label: "원우 소식" },
] as const;

export default function NewsPage() {
  const router = useRouter();
  // 소식 탭을 처음 열면 위원회 칸부터 보입니다 (2026-09-23 사용자 요청).
  const [subtab, setSubtab] = useState<AlbumCategory>("committee");
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
   * 원우 소식 칸에서는 화면이 위아래로 굴러가지 않게 잠급니다 (2026-09-23 사용자 요청).
   * 카드가 화면에 딱 맞게 서는 칸이라 굴릴 것이 없는데, 남아 있던 몇 px의 스크롤이 카드를 옆으로 미는
   * 손짓을 자꾸 채 갔습니다. 위원회 칸은 카드가 길어질 수 있어 잠그지 않습니다.
   * 칸을 바꾸거나 다른 탭으로 나가면 정리(cleanup)에서 곧 풀립니다 — 규칙은 globals.css의 data-lock-scroll.
   */
  useEffect(() => {
    if (subtab !== "member") return;
    document.body.dataset.lockScroll = "yes";
    return () => {
      delete document.body.dataset.lockScroll;
    };
  }, [subtab]);

  /*
   * 원우 소식은 기수마다 따로입니다. 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서
   * 바꿔 봅니다. 카드 목록이 같은 값(useViewCohort)을 읽습니다.
   */
  const { cohort, canSwitch, setCohort } = useViewCohort();

  return (
    <>
      {/*
        제목 자리에 칸 고르개 "위원회 | 원우 소식" (2026-09-23 사용자 요청 — 예전엔 제목 "원우 소식" 하나).
        자료 탭과 같은 공용 TextTabs variant="header"라 글씨가 다른 화면 제목과 같은 크기·자리에 섭니다.
        기수 고르개(운영진만)는 그대로 옆에 답니다 — min-w-0은 폭이 모자랄 때 고르개가 아니라 탭 쪽이 줄게 합니다.
      */}
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex min-w-0 items-center gap-2">
              <TextTabs
                variant="header"
                items={SUBTABS}
                value={subtab}
                onChange={setSubtab}
                className="min-w-0"
              />
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            <TextTabs variant="header" items={SUBTABS} value={subtab} onChange={setSubtab} />
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
      {/*
        아래 여백은 두지 않습니다 — 카드 틀(BookFrame)이 탭 알약 위에서 끝나도록 스스로 높이를 잽니다.
        (2026-09-23: 위원회 칸에 pb-24를 뒀더니 그만큼 카드 자리가 짧아져 카드가 위로 붙었습니다.)
      */}
      <div className="px-4 pt-4">
        <AlbumList category={subtab} />
      </div>
    </>
  );
}
