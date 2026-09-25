"use client";

import GuestGate from "@/components/GuestGate";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import {
  BellIcon,
  CalendarIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  VoteStampIcon,
} from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { markNoticesSeen } from "@/lib/chat-read";
import { cohortOf } from "@/lib/cohort";
import { useNotices, useNoticesSeenAt } from "@/lib/hooks";
import { useSwipeBack } from "@/lib/use-swipe-back";
import type { NoticeDoc } from "@/lib/types";

/**
 * 알림함 — 헤더 종(알림 열기)으로 들어오는 화면 (2026-09-11).
 *
 * 폰에 푸시로 온 것과 같은 알림이 최근 순으로 쌓입니다(lib/notices.ts).
 * 일주일(NOTICE_KEEP_DAYS)이 지난 알림은 목록에서 사라지고, 서버 예약 함수가 문서도 지웁니다 (2026-09-15).
 *  - 새 일정(내 기수), 새 복습 영상·도산아카데미 소식(모든 기수)
 *  - 채팅은 여기 없습니다 — 채팅 탭에 빨간 점이 따로 있습니다.
 * 한 줄을 누르면 그 화면으로 갑니다. 푸시를 꺼 둔 원우도 여기서는 모두 봅니다.
 *
 * 화면을 여는 순간 "다 봤다"고 적어 종의 빨간 점을 끕니다. 다만 이번에 새로 온 줄은
 * 열기 직전의 기준 시각으로 옅은 주황 바탕을 남겨, 무엇이 새로 왔는지 보이게 합니다.
 */
function NotificationsPageContent() {
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

      {/*
        pt-4 — 제목 줄과 첫 칸 사이 16px (2026-09-14 사용자 요청, 예전엔 0이라 칸이 제목 줄에 붙어 보였습니다).
        제목 줄의 pb(6px)에 더해 22px로, 홈·원우수첩·소식·자료의 본문 첫 칸과 같은 높이에서 시작합니다.
        목록·빈 화면·오류 칸 모두 같은 자리에 섭니다.
      */}
      <div className="px-4 pt-4 pb-8">
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
          /*
            날짜는 줄 오른쪽이 아니라 박스 위에 글씨만 (2026-09-25 사용자 요청). 같은 날 온 알림은 한 묶음으로,
            날짜는 그날 가장 최근 알림(목록이 최근 순이라 묶음의 첫 줄) 위에 한 번만 적습니다.
            묶음 사이 20px, 묶음 안 줄 사이는 예전과 같은 12px.
          */
          <ul className="flex flex-col gap-3">
            {notices.map((notice, index) => {
              const day = dayKey(notice);
              const firstOfDay = index === 0 || dayKey(notices[index - 1]) !== day;
              return (
                <li key={notice.id} className={firstOfDay && index > 0 ? "mt-2" : ""}>
                  {firstOfDay ? (
                    // 가운데 정렬 — 같은 날 사용자 "날짜는 가운데로".
                    <p className="mb-2 text-center text-[13px] font-bold text-ink-muted">{dayLabel(notice)}</p>
                  ) : null}
                  <NoticeRow
                    notice={notice}
                    isNew={baseline !== null && (notice.createdAt?.toMillis() ?? 0) > baseline}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 같은 날인지 가르는 열쇠 — 폰의 지역 시간 기준 날짜. 시각이 아직 없는(방금 온) 알림은 오늘로 봅니다. */
function dayKey(notice: NoticeDoc): string {
  return (notice.createdAt?.toDate() ?? new Date()).toDateString();
}

/** 묶음 위 날짜 글씨 — "오늘", "어제", 그 밖에는 "9월 21일 (월)". */
function dayLabel(notice: NoticeDoc): string {
  const date = notice.createdAt?.toDate() ?? new Date();
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "오늘";
  if (date.toDateString() === yesterday.toDateString()) return "어제";
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${"일월화수목금토"[date.getDay()]})`;
}

/** 알림 종류마다의 그림 — 일정은 달력, 투표는 기표 도장, 영상은 재생, 소식은 확성기 */
function NoticeGlyph({ type, className }: { type: NoticeDoc["type"]; className: string }) {
  if (type === "event") return <CalendarIcon className={className} />;
  if (type === "poll") return <VoteStampIcon className={className} strokeWidth={2.2} />;
  if (type === "news") return <MegaphoneIcon className={className} />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10.2 9.2v5.6l4.6-2.8z" fill="currentColor" />
    </svg>
  );
}

function NoticeRow({ notice, isNew }: { notice: NoticeDoc; isNew: boolean }) {
  return (
    <Link
      href={notice.url}
      // px-4 — 왼쪽 그림 칸을 걷으면서 글이 카드 끝에 붙지 않게 좌우를 16px로(예전 p-3.5 = 14px).
      className={`flex items-center gap-3 rounded-3xl px-4 py-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.99] ${
        isNew ? "bg-brand-50" : "bg-surface"
      }`}
    >
      <span className="min-w-0 flex-1">
        {/*
          종류 그림은 제목 왼쪽에 작게(17px, 진회색) — 2026-09-25 사용자 "아이콘 박스는 없애고, 아이콘만 줄여서 제목 왼쪽으로".
          예전엔 줄 맨 왼쪽의 44px 연회색 칸(bg-fill) 안에 22px 그림이었고, 그 전엔 주황 칸에 흰 그림이었습니다.
        */}
        <span className="flex items-center gap-1.5">
          {/* 19px — 같은 날 사용자 "2px 키워줘"(17px에서). */}
          <NoticeGlyph type={notice.type} className="h-[19px] w-[19px] shrink-0 text-ink-soft" />
          <span className="min-w-0 truncate text-[15px] leading-snug font-bold text-ink">
            {notice.title}
          </span>
        </span>
        {notice.body ? (
          <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{notice.body}</span>
        ) : null}
      </span>

      {/* 날짜는 줄 오른쪽에서 빼 박스 위로 옮겼습니다(2026-09-25) — 오른쪽엔 꺾쇠만. */}
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />

    </Link>
  );
}

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function NotificationsPage() {
  return (
    <GuestGate title="알림" back>
      <NotificationsPageContent />
    </GuestGate>
  );
}
