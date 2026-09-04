"use client";

import { useEffect, useState } from "react";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { ChevronRightIcon, MegaphoneIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatDotDate } from "@/lib/format";
import type { NewsItem } from "@/lib/rss";

const SITE_URL = "https://dosan21.kr";

/**
 * 도산아카데미 홈페이지에 올라오는 안내를 그대로 가져와 보여주는 화면.
 *
 * 우리 앱 서버(/api/dosan)가 도산아카데미 RSS를 대신 받아 정리해 줍니다.
 * 글을 누르면 원문(도산아카데미 사이트)으로 넘어갑니다.
 */
export default function NewsPage() {
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

  return (
    <>
      <PageHeader title="소식" right={<ProfileAvatarButton />} />

      <div className="px-4 pb-6">
        {loading ? (
          <ul className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((key) => (
              <li key={key}>
                <Skeleton className="h-[92px] rounded-3xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
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
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<MegaphoneIcon className="h-10 w-10" />}
              title="올라온 소식이 없어요"
              description="도산아카데미 홈페이지에 새 글이 올라오면 여기에 바로 보입니다."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
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
        )}

        {!loading && !error && items.length > 0 ? (
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-2xl bg-white py-3.5 text-center text-[14px] font-bold text-brand-500 shadow-[var(--shadow-card)]"
          >
            도산아카데미 홈페이지 열기 ↗
          </a>
        ) : null}
      </div>
    </>
  );
}
