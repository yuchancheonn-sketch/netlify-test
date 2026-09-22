"use client";

import { useEffect, useState } from "react";
import { MegaphoneIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDotDate } from "@/lib/format";
import type { NewsItem } from "@/lib/rss";

const SITE_URL = "https://dosan21.kr";

/*
 * 자료 탭의 "소식" 칸 — 도산아카데미 사이트(RSS)와 자동으로 이어진 글 목록.
 * 2026-09-22 사용자 요청으로 소식 탭(/news)에서 자료 탭(/library)으로 옮기며 이 파일로 떼어 냈습니다.
 * 원우가 사진을 올리는 칸이 아니라, 받아와 보여 주기만 합니다.
 */

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
export default function NewsList() {
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
