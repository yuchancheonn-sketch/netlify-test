"use client";

import { useEffect, useState } from "react";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { ChevronRightIcon, MegaphoneIcon } from "@/components/icons";
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
  const [subtab, setSubtab] = useState<Subtab>("videos");

  return (
    <>
      <PageHeader title="소식" right={<HeaderActions />} />

      <div className="px-4 pb-8">
        {/* 끝만 둥근 상자 고르개 — 모서리 값의 이유는 원우수첩 필터의 설명에. */}
        <div className="flex rounded-xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {SUBTABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtab(value)}
              aria-pressed={subtab === value}
              /*
                위 6px(pt-1.5) + 아래 10px(pb-2.5).
                두 값의 합(16px)이 py-2(8+8)와 같아서 칸 높이는 그대로이고,
                두 값의 차(4px) 때문에 글씨만 2px 위에 앉습니다.
                원우수첩·자료 탭의 서브탭과 같은 방식입니다.
              */
              className={`flex-1 rounded-lg pt-1.5 pb-2.5 text-[14px] font-bold transition ${
                subtab === value ? "bg-brand-500 text-white" : "text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {subtab === "videos" ? <VideoList /> : <NewsList />}
        </div>
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
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((key) => (
          <li key={key}>
            <Skeleton className="h-[92px] rounded-3xl" />
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
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-[68px] w-[68px] shrink-0 rounded-2xl bg-canvas object-cover"
                />
              ) : (
                <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
                  <MegaphoneIcon className="h-7 w-7" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] leading-snug font-bold text-ink">
                  {item.title}
                </p>
                {item.date ? (
                  <p className="mt-1.5 text-[12px] text-ink-faint">
                    {formatDotDate(item.date)}
                  </p>
                ) : null}
              </div>

              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
            </a>
          </li>
        ))}
      </ul>

      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-2xl bg-surface py-3.5 text-center text-[14px] font-bold text-brand-500 shadow-[var(--shadow-card)]"
      >
        도산아카데미 홈페이지 열기 ↗
      </a>
    </>
  );
}
