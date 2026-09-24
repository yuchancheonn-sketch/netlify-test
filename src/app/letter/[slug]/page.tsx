import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { thumbnailUrl, viewerUrl } from "@/lib/cloudinary";
import { getAdminDb } from "@/lib/firebase-admin";
import { formatDotDate } from "@/lib/format";
import { fetchWeekPosts, weekIdFromLetterSlug } from "@/lib/week-letter-server";
import { weekRangeLabel } from "@/lib/week";

/**
 * 주간 원우 소식 "소식지" — 로그인 없이 보는 공개 화면 (2026-09-24 사용자 요청
 * "지난주 원우 소식 링크만큼은 로그인 없이도… 수정 기능이나 탭 없이 정말 원우 소식 카드들만").
 *
 * 매주 월요일 저녁 단톡방에 올라가는 링크가 이 화면입니다(/api/news/weekly-close가 주소를 만듦).
 * 앱 화면이 아니라 서버가 그리는 읽기 전용 쪽이라 로그인·탭바·수정 단추가 없고, 카드는 위에서 아래로 늘어섭니다.
 * 주소 끝의 열쇠가 맞아야 열립니다 — lib/week-letter-server.ts. 틀리면 404.
 * 데이터는 서버(Admin SDK)가 읽으므로 보안 규칙을 바꾸지 않았습니다. 새 소식은 열 때마다 바로 보입니다.
 */
export const dynamic = "force-dynamic";

const APP_URL = "https://aegiaeta.web.app";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const weekId = weekIdFromLetterSlug(slug);
  const db = getAdminDb();
  if (!weekId || !db) return null;
  return { weekId, posts: await fetchWeekPosts(db, weekId) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "원우 소식" };
  const title = `이번주 원우 소식 · ${weekRangeLabel(data.weekId)}`;
  const cover = data.posts.find((post) => post.coverImageUrl)?.coverImageUrl;
  return {
    title,
    description: `애기애타 10기 원우 소식 ${data.posts.length}개`,
    openGraph: {
      title,
      description: `애기애타 10기 원우 소식 ${data.posts.length}개`,
      images: cover ? [{ url: thumbnailUrl(cover, 1200, 630), width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function WeekLetterPage({ params }: Props) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { weekId, posts } = data;

  return (
    <main className="mx-auto min-h-dvh max-w-[560px] bg-canvas px-4 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]">
      <header className="px-1">
        <p className="text-[14px] font-bold text-brand-500">애기애타 10기</p>
        <h1 className="mt-1 text-[24px] font-bold text-ink">이번주 원우 소식</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {weekRangeLabel(weekId)} · 소식 {posts.length}개
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-surface px-6 py-10 text-center text-[15px] text-ink-muted shadow-[var(--shadow-card)]">
          이 주에는 올라온 소식이 없어요.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {posts.map((post) => (
            // 앱의 원우 소식 카드(components/AlbumList.tsx AlbumCard)와 같은 짜임 — 올린 원우 → 사진 → 제목·본문.
            // 본문은 뒤집기 대신 전부 보여 줍니다.
            <li
              key={post.id}
              className="overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-card)]"
            >
              <div className="px-5 pt-4 pb-3.5">
                <p className="truncate text-[20px] font-bold text-ink">
                  {post.authorName}
                  {post.authorName !== "원우" ? (
                    <span className="ml-1 text-[17px] font-medium text-ink-muted">원우</span>
                  ) : null}
                </p>
                {post.eventDate ? (
                  <p className="text-[14px] text-ink">{formatDotDate(post.eventDate)}</p>
                ) : null}
              </div>
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewerUrl(post.coverImageUrl, 1200)}
                  alt={`${post.title} 사진`}
                  className="block h-auto w-full"
                  loading="lazy"
                />
              ) : null}
              <div className="px-5 pt-3.5 pb-5">
                <h2 className="text-[18px] leading-snug font-bold break-keep text-ink [overflow-wrap:anywhere]">
                  {post.title}
                </h2>
                {post.body ? (
                  <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line break-keep text-ink-soft">
                    {post.body}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-8 text-center text-[13px] leading-relaxed text-ink-faint">
        애기애타 10기 원우라면{" "}
        <a href={`${APP_URL}/news`} className="font-bold text-ink-muted underline">
          앱에서 소식 올리기
        </a>
      </footer>
    </main>
  );
}
