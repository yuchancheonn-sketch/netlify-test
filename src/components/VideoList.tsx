"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDotDate } from "@/lib/format";
import { embedUrl, videoThumbnailUrl, watchUrl, type VideoItem } from "@/lib/youtube";

const CHANNEL_URL = "https://www.youtube.com/@dosanacademy";

/**
 * 도산아카데미 유튜브 영상 목록 — 자료 탭의 "복습 영상" 칸.
 *
 * (2026-09-22 사용자 요청으로 소식 탭에서 자료 탭으로 옮기며 이 파일로 떼어 냈습니다.
 *  자리를 맞바꾼 행사 사진은 components/AlbumList.tsx.)
 *
 * 우리 앱 서버(/api/videos)가 채널에서 받아온 목록을 그대로 큰 그림으로 깝니다.
 * 그림을 누르면 그 자리에서 바로 재생되고, 유튜브에서 퍼가기를 막아둔 영상은
 * 아래 링크로 유튜브에 넘어가 볼 수 있습니다.
 *
 * 카드 사이 14px — 홈의 카드 사이·원우수첩 줄 사이와 같은 값(2026-09-22). 자리 표시 목록과 진짜 목록이 같아야 합니다.
 */
/*
 * 카드 테두리 — 자료탭 바탕이 흰색이 되며 공용 헤어라인(--color-line)이 흐려 보여, 이 목록만 한 단 진한 회색 1px로
 * (ring-1 ring-ink/[0.16], 2026-09-27 사용자 "복습 영상·일정 박스의 회색 테두리 더 진하게"). 그 전엔 shadow-[var(--shadow-card)].
 * 먹색(ink)을 옅게 쓰므로 어두운 화면에서도 따로 적을 것이 없습니다.
 */
export default function VideoList() {
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
      <ul className="flex flex-col gap-[14px]">
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
      <div className="rounded-3xl bg-surface ring-1 ring-ink/[0.16]">
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
      <div className="rounded-3xl bg-surface ring-1 ring-ink/[0.16]">
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
      <ul className="flex flex-col gap-[14px]">
        {videos.map((video) => (
          <li key={video.id}>
            <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/[0.16]">
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
        className="mt-5 block rounded-2xl bg-surface py-3.5 text-center text-[14px] font-bold text-brand-500 ring-1 ring-ink/[0.16]"
      >
        도산아카데미 유튜브 채널 열기 ↗
      </a>
    </>
  );
}
