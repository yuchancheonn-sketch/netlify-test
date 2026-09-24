import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LetterBook } from "@/components/AlbumList";
import { PlusIcon } from "@/components/icons";
import { thumbnailUrl } from "@/lib/cloudinary";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchWeekPosts, weekIdFromLetterSlug } from "@/lib/week-letter-server";
import { weekRangeLabel } from "@/lib/week";
import type { PhotoAlbumDoc } from "@/lib/types";

/**
 * 주간 원우 소식 "소식지" — 로그인 없이 보는 공개 화면 (2026-09-24 사용자 요청
 * "지난주 원우 소식 링크만큼은 로그인 없이도… 수정 기능이나 탭 없이 정말 원우 소식 카드들만").
 *
 * 매주 월요일 저녁 단톡방에 올라가는 링크가 이 화면입니다(/api/news/weekly-close가 주소를 만듦).
 * 로그인·탭바·수정 단추가 없는 읽기 전용 쪽입니다. 카드는 앱과 같은 카드 책(LetterBook → AlbumBook)이라
 * 옆으로 넘기기·애니메이션·눌러서 뒤집어 본문 전체 보기가 앱과 똑같습니다(같은 날 사용자 요청 — 처음엔 위아래 목록이었음).
 * 주소 끝의 열쇠가 맞아야 열립니다 — lib/week-letter-server.ts. 틀리면 404.
 * 데이터는 서버(Admin SDK)가 읽으므로 보안 규칙을 바꾸지 않았습니다. 새 소식은 열 때마다 바로 보입니다.
 */
export const dynamic = "force-dynamic";

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
  // 앱 카드가 읽는 모양(PhotoAlbumDoc)으로 — 이름은 서버가 원우수첩에서 찾아 createdByName에 담습니다.
  const albums: PhotoAlbumDoc[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    eventDate: post.eventDate,
    coverImageUrl: post.coverImageUrl,
    photoCount: 1,
    createdBy: post.createdBy,
    createdByName: post.authorName,
    createdAt: null,
  }));

  return (
    <main className="mx-auto max-w-[560px] px-4 pt-[calc(20px+env(safe-area-inset-top))]">
      <header className="px-1">
        <p className="text-[14px] font-bold text-brand-500">애기애타 10기</p>
        <h1 className="mt-1 text-[24px] font-bold text-ink">이번주 원우 소식</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {weekRangeLabel(weekId)} · 소식 {posts.length}개
        </p>
      </header>

      <div className="mt-5">
        {posts.length === 0 ? (
          <p className="rounded-3xl bg-surface px-6 py-10 text-center text-[15px] text-ink-muted shadow-[var(--shadow-card)]">
            이 주에는 올라온 소식이 없어요.
          </p>
        ) : (
          <LetterBook albums={albums} />
        )}
      </div>

      {/*
        소식 올리러 가기 — 앱 원우 소식 칸의 "소식 올리기" 알약과 같은 모양·같은 오른쪽 자리 (2026-09-24 사용자 요청).
        누르면 앱의 원우 소식 칸이 소식 올리기 창을 연 채로 열립니다(/news?compose=1). 로그인이 안 돼 있으면
        로그인 뒤 그 창으로 이어집니다(StageGate가 주소를 기억). 탭바가 없어서 바닥에서 20px에 섭니다.
        ★ Link가 아니라 a입니다 — 앱 안 이동이면 소식 탭이 처음 그려질 때 주소가 아직 바뀌기 전이라
          ?compose=1을 못 읽을 수 있어서, 페이지를 새로 엽니다(소식지는 앱과 따로 떨어진 쪽이라 새로 열어도 됩니다).
      */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/news?compose=1"
        className="fixed right-5 bottom-[calc(20px+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95"
      >
        <PlusIcon className="h-5 w-5" />
        소식 올리러 가기
      </a>
    </main>
  );
}
