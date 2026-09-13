"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { MegaphoneIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDotDate } from "@/lib/format";
import {
  embedUrl,
  videoThumbnailUrl,
  watchUrl,
  type VideoItem,
} from "@/lib/youtube";
import type { NewsItem } from "@/lib/rss";

const SITE_URL = "https://dosan21.kr";
const CHANNEL_URL = "https://www.youtube.com/@dosanacademy";

/**
 * 소식 탭 — 도산아카데미가 만들어 내려주는 것들을 한자리에 모읍니다.
 *
 * 서브탭 둘 다 **우리가 올리는 것이 아니라 받아오는 것**입니다.
 *  - 복습 영상: 유튜브 채널(@dosanacademy)
 *  - 소식: 홈페이지 RSS(dosan21.kr)
 * 둘 다 우리 앱 서버가 대신 받아 CDN에 캐시해 두고 내려줍니다.
 *
 * 원우가 직접 올리는 사진·파일은 자료 탭(/library)에 있습니다.
 * 받아오는 것과 올리는 것을 탭으로 갈라 둔 것이 이 둘의 경계입니다.
 */
const SUBTABS = [
  { value: "videos", label: "복습 영상" },
  { value: "news", label: "소식" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function NewsPage() {
  return (
    <>
      <PageHeader title="소식" right={<HeaderActions />} />

      <div className="px-4 pb-8">
        {/*
          주소의 ?tab을 읽는 useSearchParams는 정적 화면에서 Suspense로 감싸야 빌드가 됩니다(Next 문서).
          그동안은 고르개 줄과 첫 칸 자리만 회색으로 잡아 둡니다.

          첫 칸의 크기는 아래 고르개와 같게 맞춥니다 — 25px(20px 글씨 × 글줄 1.25배)
          높이에 "복습 영상 소식" 두 칸만큼의 폭. 알약이던 시절의 h-[40px] rounded-full을
          그대로 두면 자리가 차지된 뒤 줄이 15px 솟구쳐 화면이 튑니다.
        */}
        <Suspense
          fallback={
            <>
              <Skeleton className="ml-3 h-[25px] w-[142px] rounded-lg" />
              <Skeleton className="mt-5 aspect-video rounded-2xl" />
            </>
          }
        >
          <NewsTabs />
        </Suspense>
      </div>
    </>
  );
}

/**
 * 복습 영상 / 소식 알약과 그 아래 목록.
 * 주소가 /news?tab=news 면 소식 칸을 먼저 엽니다 — 새 소식 알림(netlify/functions/feed-push.mts)이
 * 이 주소로 엽니다. 새 영상 알림은 그냥 /news(복습 영상 칸)로 엽니다.
 */
function NewsTabs() {
  const searchParams = useSearchParams();
  const [subtab, setSubtab] = useState<Subtab>(() =>
    searchParams.get("tab") === "news" ? "news" : "videos",
  );

  return (
    <>
        {/*
          복습 영상 / 소식 고르개 — 원우수첩의 구분 고르개와 **똑같은 짜임**입니다
          (2026-09-14에 흰 알약 하나 안에 둘을 담던 방식에서 바꿨습니다).
          글자만 늘어놓고, 고른 것은 먹색·나머지는 회색. 바탕도 테두리도 밑줄도 없습니다.
          값을 바꿀 때는 members/page.tsx의 같은 줄도 함께 고쳐 주세요 —
          두 화면이 나란히 읽혀야 하는 자리라 한쪽만 바뀌면 어긋나 보입니다.

          pl-3은 원우수첩과 같은 들여쓰기입니다. 바깥 px-4(16px)에 더해 28px에서
          시작합니다.

          원우수첩 쪽에 있는 가로 밀기(overflow-x-auto)는 여기 두지 않았습니다.
          여기는 칸이 둘뿐이고 "복습 영상 소식"을 다 합쳐도 약 140px이라,
          보기 설정을 "크게"로 둔 좁은 폰에서도 넘칠 일이 없습니다.
        */}
        <div className="flex gap-[14px] pl-3">
          {SUBTABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtab(value)}
              aria-pressed={subtab === value}
              /*
                고른 것과 아닌 것의 차이는 색 하나뿐입니다. 굵기까지 바꾸면
                고를 때마다 글자 폭이 달라져 옆 칸이 좌우로 밀립니다.

                안 고른 칸의 ink-faint는 원우수첩 구분 고르개와 같은 값입니다
                (2026-09-14에 ink-muted에서 함께 옮겼습니다). 한쪽만 고치지 마세요.
              */
              className={`transition ${
                subtab === value ? "text-ink" : "text-ink-faint"
              }`}
            >
              {/*
                ★ 글씨 크기는 <button>이 아니라 이 <span>에 겁니다.
                  globals.css의 `button { font-size: 16px }`가 레이어 밖에 있어,
                  @layer utilities 안의 text-* 유틸리티를 이깁니다. 단추에 직접
                  걸면 조용히 무시되고 16px로 그려집니다.
                  (자세한 내막은 members/page.tsx의 같은 자리에 적어 뒀습니다.)
              */}
              <span className="text-[20px] leading-tight font-bold">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5">
          {subtab === "videos" ? <VideoList /> : <NewsList />}
        </div>
    </>
  );
}

/**
 * 도산아카데미 유튜브 영상 목록.
 *
 * 우리 앱 서버(/api/videos)가 채널에서 받아온 목록을 그대로 큰 그림으로 깝니다.
 * 그림을 누르면 그 자리에서 바로 재생되고, 유튜브에서 퍼가기를 막아둔 영상은
 * 아래 링크로 유튜브에 넘어가 볼 수 있습니다.
 */
function VideoList() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 지금 재생 중인 영상 (한 번에 하나만 틉니다) */
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch("/api/videos");
        const data = (await response.json()) as {
          items?: VideoItem[];
          error?: string;
        };
        if (!alive) return;
        if (!response.ok || data.error) setError(data.error ?? "영상을 불러오지 못했어요.");
        else setVideos(data.items ?? []);
      } catch {
        if (alive) setError("영상을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
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
      <ul className="flex flex-col gap-5">
        {[0, 1, 2].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-video rounded-2xl" />
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
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-bold text-brand-500"
          >
            도산아카데미 유튜브 열기 ↗
          </a>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<span className="text-[40px]">🎬</span>}
          title="아직 올라온 영상이 없어요"
          description="도산아카데미 유튜브에 영상이 올라오면 여기에 바로 보입니다."
        />
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-5">
        {videos.map((video) => (
          <li key={video.id}>
            <div className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)]">
              {playingId === video.id ? (
                <iframe
                  src={embedUrl(video.id)}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayingId(video.id)}
                  aria-label={`${video.title} 재생`}
                  className="relative block aspect-video w-full bg-black transition active:scale-[0.99]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={videoThumbnailUrl(video.id)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-[26px] text-white">
                      ▶
                    </span>
                  </span>
                </button>
              )}

              <div className="px-4 py-3.5">
                <p className="text-[15px] leading-snug font-bold text-ink">{video.title}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  {video.date ? (
                    <span className="text-[12px] text-ink-faint">
                      {formatDotDate(video.date)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <a
                    href={watchUrl(video.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[12px] font-bold text-brand-500"
                  >
                    유튜브에서 보기 ↗
                  </a>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 block rounded-2xl bg-surface py-3.5 text-center text-[14px] font-bold text-brand-500 shadow-[var(--shadow-card)]"
      >
        도산아카데미 유튜브 채널 열기 ↗
      </a>
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
      <ul className="flex flex-col gap-5">
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
      <ul className="flex flex-col gap-5">
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
