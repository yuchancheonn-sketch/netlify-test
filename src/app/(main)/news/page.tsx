"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AlbumList from "@/components/AlbumList";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import TextTabs from "@/components/TextTabs";
import { MegaphoneIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDotDate } from "@/lib/format";
import { useViewCohort } from "@/lib/use-view-cohort";
import type { NewsItem } from "@/lib/rss";

const SITE_URL = "https://dosan21.kr";

/**
 * 소식 탭 — 행사 사진과 도산아카데미 소식.
 *
 *  - 행사 사진: 원우가 올리는 행사별 앨범 (photoAlbums) — components/AlbumList.tsx
 *  - 소식: 도산아카데미 홈페이지 RSS(dosan21.kr). 우리 앱 서버가 대신 받아 CDN에 캐시해 두고 내려줍니다.
 *
 * ★ 2026-09-22 사용자 요청으로 이 탭의 "복습 영상"과 자료 탭의 "행사 사진"을 맞바꿨습니다.
 *   복습 영상은 이제 자료 탭(/library)에 있습니다 — components/VideoList.tsx.
 *   예전엔 "받아오는 것(이 탭) / 원우가 올리는 것(자료 탭)"으로 갈라 두었는데 그 경계는 이제 없습니다.
 */
const SUBTABS = [
  { value: "photos", label: "행사 사진" },
  { value: "news", label: "소식" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function NewsPage() {
  /*
    주소의 ?tab을 읽는 useSearchParams는 정적 화면에서 Suspense로 감싸야 빌드가 됩니다(Next 문서).

    ★ 제목 줄까지 그 안으로 들어왔습니다 (2026-09-14).
      고르개가 제목 자리를 차지하게 되면서 제목이 subtab 상태를 써야 하는데,
      그 상태는 useSearchParams를 읽는 NewsTabs 안에만 있습니다. 그래서 머리를
      밖에 두지 못하고, 기다리는 동안은 아래 NewsFallback이 같은 모양의
      머리를 대신 그려 화면이 튀지 않게 합니다.
  */
  return (
    <Suspense fallback={<NewsFallback />}>
      <NewsTabs />
    </Suspense>
  );
}

/**
 * 기다리는 동안의 화면.
 *
 * 머리줄과 첫 칸 자리만 회색으로 잡아 둡니다. 제목 자리의 회색 칸은
 * TextTabs("header" 갈래)와 같은 크기입니다 — 글줄 27.5px(22px × 1.25배)를
 * 28px로 올림한 값. 2026-09-14에 header 갈래의 검은 바(사이 6px + 바 2.5px)를
 * 없애면서 37px에서 줄였습니다. 크기를 안 맞추면 자리가
 * 채워질 때 제목 줄 높이가 달라져 본문이 통째로 솟구칩니다.
 * (TextTabs의 글씨·바 크기를 고치면 이 값도 같이 고쳐 주세요.)
 */
function NewsFallback() {
  return (
    <>
      <PageHeader
        title={<Skeleton className="h-[28px] w-[165px] rounded-lg" />}
        right={<HeaderActions />}
      />
      {/*
        pt-4는 아래 NewsTabs의 본문 상자와 같은 값이어야 합니다 — 그쪽 주석 참고.
        처음 열리는 칸이 행사 사진이라 앨범 칸(2열 정사각형) 자리를 잡아 둡니다.
      */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-8">
        <Skeleton className="aspect-square rounded-[20px]" />
        <Skeleton className="aspect-square rounded-[20px]" />
      </div>
    </>
  );
}

/**
 * 행사 사진 / 소식 고르개와 그 아래 목록.
 * 주소가 /news?tab=news 면 소식 칸을 먼저 엽니다 — 새 소식 알림(lib/feed-watch.ts)이
 * 이 주소로 엽니다. 그 밖에는 행사 사진 칸이 먼저 열립니다.
 * (새 영상 알림은 복습 영상이 옮겨 간 자료 탭 /library로 엽니다.)
 */
function NewsTabs() {
  const searchParams = useSearchParams();
  const [subtab, setSubtab] = useState<Subtab>(() =>
    searchParams.get("tab") === "news" ? "news" : "photos",
  );
  /*
   * 행사 사진은 기수마다 따로입니다. 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서
   * 바꿔 봅니다(자료 탭에 있을 때와 같은 방식). 앨범 목록이 같은 값(useViewCohort)을 읽습니다.
   * 소식은 모든 기수가 같으므로, 기수 고르개는 행사 사진 칸에서만 답니다.
   */
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const tabs = (
    <TextTabs
      variant="header"
      items={SUBTABS}
      value={subtab}
      onChange={setSubtab}
      className="min-w-0"
    />
  );

  return (
    <>
      {/*
        제목 자리에 고르개를 넣습니다 (2026-09-14 사용자 요청).
        예전에는 제목이 "소식"이고 본문 맨 위에 고르개가 따로 서 있었는데,
        그 고르개에 이미 "소식" 칸이 있어 같은 말이 두 번 보였습니다.
        variant="header"가 글씨를 22px로 키워 다른 화면의 제목과 같게 맞춥니다.
        min-w-0은 폭이 모자랄 때 탭 쪽이 먼저 줄어들게 하려는 것입니다 — 없으면 기수 고르개가 밀려 잘립니다.
      */}
      <PageHeader
        title={
          canSwitch && subtab === "photos" ? (
            <span className="flex min-w-0 items-center gap-2">
              {tabs}
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            tabs
          )
        }
        right={<HeaderActions />}
      />

      {/*
        pt-4 — 맨 위 게시물과 제목 줄 사이 16px. 제목 줄의 pb(6px)에 더해 22px입니다.
        홈·원우수첩과 같은 값이라 세 탭의 첫 칸이 같은 높이에서 시작합니다.

        ★ 이 여백을 PageHeader의 pb로 주지 않는 이유
          제목 줄은 붙박이라 그 pb만큼의 본문이 스크롤할 때 제목 아래에 숨습니다.
          여기에 주면 본문과 함께 굴러가므로 아무것도 가리지 않습니다.

        ★ 위 NewsFallback의 같은 상자에도 같은 pt-4가 있어야 합니다.
          한쪽만 주면 기다리는 화면과 채워진 화면의 첫 칸 위치가 달라 튀어 보입니다.

        ★ 소식 목록(NewsList)의 상자 사이는 14px입니다
          (20px(gap-5) → 14px, 2026-09-22 사용자 "홈탭이랑 원우탭 목록 간격으로 맞춰줘").
          홈의 카드 사이·원우수첩 줄 사이와 같은 값이라 탭을 옮겨 다녀도 결이 같습니다.
          Tailwind 단계(12px·16px) 사이 값이라 gap-[14px]로 직접 적습니다.
          자리 표시 목록과 진짜 목록이 같아야 합니다 — 한쪽만 고치면 줄 자리가 한 번 들썩입니다.
          (자료 탭으로 옮긴 복습 영상 목록도 같은 14px입니다.)

        ★ 아래 여백 — 행사 사진 칸은 pb-24, 소식 칸은 pb-8.
          행사 사진에는 오른쪽 아래에 "앨범 만들기" 주황 알약이 떠 있습니다. 알약은 바닥에서 92px 위에
          서고 높이가 52px라 바닥 144px까지 가리는데, MainShell이 이미 78px을 비워 두므로 96px(pb-24)을
          더해 마지막 줄이 가리지 않게 합니다(자료 탭에 있을 때와 같은 셈법).
      */}
      <div className={`px-4 pt-4 ${subtab === "photos" ? "pb-24" : "pb-8"}`}>
        {subtab === "photos" ? <AlbumList /> : <NewsList />}
      </div>
    </>
  );
}

/**
 * 도산아카데미 홈페이지에 올라오는 안내를 그대로 가져와 보여줍니다.
 *
 * 우리 앱 서버(/api/dosan)가 도산아카데미 RSS를 대신 받아 정리해 줍니다.
 * 글을 누르면 원문(도산아카데미 사이트)으로 넘어갑니다.
 *
 * 한 칸의 짜임새는 복습 영상 카드와 같습니다 (2026-09-11) — 위에 큰 그림, 아래에 제목과
 * 날짜·원문 보기. 예전엔 68px 작은 그림 옆에 제목이 서는 한 줄 목록이었습니다.
 *
 * ★ 그림은 자르지 않고 원래 비율 그대로 폭에 맞춥니다.
 *   피드 그림은 대부분 700×700 정사각 포스터이고 가끔 16:9입니다(2026-09-11에 재어 봄).
 *   영상처럼 16:9 틀에 채우면 포스터 위아래의 글씨가 잘려 나갑니다.
 */
function NewsList() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dosan");
        const data = (await response.json()) as { items?: NewsItem[]; error?: string };
        if (!alive) return;
        if (!response.ok || data.error) {
          setError(data.error ?? "소식을 불러오지 못했어요.");
        } else {
          setItems(data.items ?? []);
        }
      } catch {
        if (alive) setError("소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <ul className="flex flex-col gap-[14px]">
        {[0, 1, 2].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-square rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <ErrorState message={error} />
        <div className="px-6 pb-6 text-center">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-bold text-brand-500"
          >
            도산아카데미 사이트 열기 ↗
          </a>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<MegaphoneIcon className="h-10 w-10" />}
          title="올라온 소식이 없어요"
          description="도산아카데미 홈페이지에 새 글이 올라오면 여기에 바로 보입니다."
        />
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-[14px]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)] transition active:scale-[0.99]"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="block h-auto w-full bg-fill"
                />
              ) : (
                <span className="flex aspect-video w-full items-center justify-center bg-brand-50 text-brand-300">
                  <MegaphoneIcon className="h-10 w-10" />
                </span>
              )}

              {/* 아래 글자 칸은 복습 영상 카드와 같은 크기·여백입니다. */}
              <div className="px-4 py-3.5">
                <p className="text-[15px] leading-snug font-bold text-ink">{item.title}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  {item.date ? (
                    <span className="text-[12px] text-ink-faint">
                      {formatDotDate(item.date)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 text-[12px] font-bold text-brand-500">
                    원문 보기 ↗
                  </span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 block rounded-2xl bg-surface py-3.5 text-center text-[14px] font-bold text-brand-500 shadow-[var(--shadow-card)]"
      >
        도산아카데미 홈페이지 열기 ↗
      </a>
    </>
  );
}
