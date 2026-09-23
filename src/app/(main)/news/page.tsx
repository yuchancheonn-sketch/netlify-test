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
        위원회 칸은 카드가 화면보다 길 수 있어(조직도) 아래를 넉넉히 비웁니다 —
        pb-24는 떠 있는 탭 알약에 마지막 줄이 가리지 않을 만큼입니다(자료 탭과 같은 셈법).
        원우 소식 칸은 카드 틀이 알약 위에서 끝나므로 아래 여백이 없습니다(BookFrame).
      */}
      <div className={`px-4 pt-4 ${subtab === "committee" ? "pb-24" : ""}`}>
        <AlbumList category={subtab} />
      </div>
    </>
  );
}
