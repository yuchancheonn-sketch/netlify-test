import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Firestore, Timestamp } from "firebase-admin/firestore";
import { inCohort } from "@/lib/cohort";
import { COHORT } from "@/lib/constants";

/**
 * 주간 원우 소식 "소식지" — 로그인 없이 보는 공개 링크 (2026-09-24 사용자 요청).
 *
 * 링크 모양: /letter/2026-09-22-3f9a1c0d2b7e4a61 (그 주 화요일 + 열쇠 16자).
 * ★ 열쇠가 필요한 이유 — 날짜만으로 열리면 누구나 날짜를 바꿔 넣어 모든 주의 원우 사진·글을 볼 수 있습니다.
 *   열쇠는 서버 비밀값(NEWS_CRON_TOKEN)으로 만든 서명이라, 공유된 주의 링크만 열립니다.
 *   비밀값을 바꾸면 그동안 나간 링크가 모두 닫힙니다.
 */

const KEY_LENGTH = 16;

function signWeek(weekId: string): string | null {
  const secret = process.env.NEWS_CRON_TOKEN;
  if (!secret) return null;
  return createHmac("sha256", `${secret}:week-letter`).update(weekId).digest("hex").slice(0, KEY_LENGTH);
}

/** 그 주의 공개 링크 경로. 비밀값이 없으면 null. */
export function letterPath(weekId: string): string | null {
  const key = signWeek(weekId);
  return key ? `/letter/${weekId}-${key}` : null;
}

/** "/letter/…"의 마지막 조각을 풀어 맞는 열쇠면 weekId를, 아니면 null. */
export function weekIdFromLetterSlug(slug: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})-([0-9a-f]+)$/.exec(slug);
  if (!match) return null;
  const expected = signWeek(match[1]);
  if (!expected || match[2].length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(match[2]), Buffer.from(expected)) ? match[1] : null;
}

export type WeekPost = {
  id: string;
  title: string;
  body: string;
  eventDate: string;
  coverImageUrl: string | null;
  createdBy: string;
  authorName: string;
  createdAt: number;
};

/**
 * 그 주(화 00:00 ~ 다음 화 00:00, 한국 시간)에 올라온 10기 원우 소식 — 올린 순서대로.
 *
 * ★ weekId 칸이 아니라 올린 시각(createdAt)으로 찾습니다. weekId는 2026-09-24에 생겨서 그 전 소식에는 없고,
 *   같은 칸 하나의 범위 조건이라 색인을 따로 만들 필요도 없습니다.
 * 이름은 원우수첩의 지금 이름을 먼저 씁니다(앱 카드와 같음).
 */
export async function fetchWeekPosts(db: Firestore, weekId: string): Promise<WeekPost[]> {
  const start = Date.parse(`${weekId}T00:00:00+09:00`);
  const end = start + 7 * 86_400_000;
  const snapshot = await db
    .collection("photoAlbums")
    .where("createdAt", ">=", new Date(start))
    .where("createdAt", "<", new Date(end))
    .get();

  const albums = snapshot.docs
    .map((document) => {
      const data = document.data() as {
        title?: string;
        body?: string;
        eventDate?: string;
        coverImageUrl?: string | null;
        category?: string;
        cohort?: string;
        createdBy?: string;
        createdByName?: string;
        createdAt?: Timestamp | null;
      };
      return { id: document.id, ...data };
    })
    .filter(
      (album) => album.title && (album.category ?? "member") === "member" && inCohort(album, COHORT),
    )
    .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

  const uids = [...new Set(albums.map((album) => album.createdBy).filter(Boolean))] as string[];
  const users = uids.length
    ? await db.getAll(...uids.map((uid) => db.collection("users").doc(uid)), { fieldMask: ["name"] })
    : [];
  const names = new Map(users.map((user) => [user.id, (user.get("name") as string | undefined) ?? ""]));

  return albums.map((album) => ({
    id: album.id,
    title: album.title ?? "",
    body: album.body?.trim() ?? "",
    eventDate: album.eventDate ?? "",
    coverImageUrl: album.coverImageUrl ?? null,
    createdBy: album.createdBy ?? "",
    authorName: names.get(album.createdBy ?? "") || album.createdByName || "원우",
    createdAt: album.createdAt?.toMillis() ?? 0,
  }));
}
