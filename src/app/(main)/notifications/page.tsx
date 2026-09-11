"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { BellIcon, CalendarIcon, ChevronRightIcon, MegaphoneIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { markNoticesSeen } from "@/lib/chat-read";
import { cohortOf } from "@/lib/cohort";
import { formatChatListTime } from "@/lib/format";
import { useNotices, useNoticesSeenAt } from "@/lib/hooks";
import { useSwipeBack } from "@/lib/use-swipe-back";
import type { NoticeDoc } from "@/lib/types";

/**
 * 알림함 — 헤더 종(알림 열기)으로 들어오는 화면 (2026-09-11).
 *
 * 폰에 푸시로 온 것과 같은 알림이 최근 순으로 쌓입니다(lib/notices.ts).
 *  - 새 일정(내 기수), 새 복습 영상·도산아카데미 소식(모든 기수)
 *  - 채팅은 여기 없습니다 — 채팅 탭에 빨간 점이 따로 있습니다.
 * 한 줄을 누르면 그 화면으로 갑니다. 푸시를 꺼 둔 원우도 여기서는 모두 봅니다.
 *
 * 화면을 여는 순간 "다 봤다"고 적어 종의 빨간 점을 끕니다. 다만 이번에 새로 온 줄은
 * 열기 직전의 기준 시각으로 옅은 주황 바탕을 남겨, 무엇이 새로 왔는지 보이게 합니다.
 */
export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  /*
   * 오른쪽으로 밀면 들어오기 전 화면으로 돌아갑니다(2026-09-11).
   * 종은 모든 탭의 제목 줄에 있어서, 갈 곳을 홈으로 못 박으면 원우가 있던 탭이 아니라
   * 엉뚱한 탭으로 나가게 됩니다 — 내 프로필·설정 화면과 같은 router.back()이고, 제목 줄의 <도 같습니다.
   */
  const swipe = useSwipeBack({ onCommit: () => router.back() });
  const { data: notices, loading, error } = useNotices(cohortOf(profile?.cohort));
  const seenAt = useNoticesSeenAt(user?.uid);

  /*
   * 새로 온 줄을 가를 기준 — 화면을 연 뒤 처음 알게 된 "지난번에 본 시각"을 붙잡아 둡니다.
   * 아래에서 다 봤다고 적으면 seenAt이 지금 시각으로 바뀌는데, 그 값을 따라가면 강조가 곧바로 사라집니다.
   * 렌더 중에 한 번만 붙잡는 방식이라 effect 안 setState 린트에 걸리지 않습니다.
   */
  const [baseline, setBaseline] = useState<number | null>(null);
  if (baseline === null && seenAt !== null) {
    setBaseline(seenAt || (profile?.createdAt?.toMillis() ?? 0));
  }

  const uid = user?.uid;
  useEffect(() => {
    if (uid) void markNoticesSeen(uid);
  }, [uid]);

  return (
    /*
      안에 떠 있는(fixed) 요소가 없어 화면 전체를 한 상자로 밀어도 됩니다(수업 기록·역대 투표와 같음).
      min-h-full: 알림이 몇 줄 없어도 그 아래 빈 자리에서 민 손짓을 받습니다.
    */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="알림" back />

      <div className="px-4 pb-8">
        {loading ? (
          <ul className="flex flex-col gap-3">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton className="h-[76px] rounded-3xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <ErrorState message={error} />
          </div>
        ) : notices.length === 0 ? (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState icon={<BellIcon className="h-10 w-10" />} title="아직 온 알림이 없어요" />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {notices.map((notice) => (
              <li key={notice.id}>
                <NoticeRow
                  notice={notice}
                  isNew={baseline !== null && (notice.createdAt?.toMillis() ?? 0) > baseline}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 알림 종류마다의 그림 — 일정은 달력, 영상은 재생, 소식은 확성기 */
function NoticeGlyph({ type }: { type: NoticeDoc["type"] }) {
  if (type === "event") return <CalendarIcon className="h-[22px] w-[22px]" />;
  if (type === "news") return <MegaphoneIcon className="h-[22px] w-[22px]" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10.2 9.2v5.6l4.6-2.8z" fill="currentColor" />
    </svg>
  );
}

function NoticeRow({ notice, isNew }: { notice: NoticeDoc; isNew: boolean }) {
  const createdAt = notice.createdAt?.toDate();

  return (
    <Link
      href={notice.url}
      className={`flex items-center gap-3 rounded-3xl p-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.99] ${
        isNew ? "bg-brand-50" : "bg-surface"
      }`}
    >
      {/* 날짜 칸·D-day 카드와 같은 결로, 주황을 꽉 채우고 그림은 흰색 */}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
        <NoticeGlyph type={notice.type} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-snug font-bold text-ink">
          {notice.title}
        </span>
        {notice.body ? (
          <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{notice.body}</span>
        ) : null}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        {createdAt ? (
          <span className="text-[12px] text-ink-faint">{formatChatListTime(createdAt)}</span>
        ) : null}
        <ChevronRightIcon className="h-4 w-4 text-ink-faint" />
      </span>
    </Link>
  );
}
