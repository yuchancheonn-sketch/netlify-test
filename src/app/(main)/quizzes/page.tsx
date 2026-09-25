"use client";

import GuestGate from "@/components/GuestGate";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { OMarkIcon, XMarkIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { kstDateString } from "@/lib/dosan-quiz";
import { formatMonthDay } from "@/lib/format";
import type { QuizHistoryItem } from "@/lib/quiz-types";
import { useKstDay } from "@/lib/use-kst-day";
import { useQuizHistory } from "@/lib/use-quiz";
import { useSwipeBack } from "@/lib/use-swipe-back";

/**
 * 역대 퀴즈 — 홈 "오늘의 OX 퀴즈" 카드 오른쪽 위 ">"로 들어오는 화면 (2026-09-11).
 *
 * 지금까지 나왔던 문제를 최근 날부터 모아, 문제·정답·해설을 보여줍니다.
 *  - 앞으로 나올 문제는 없습니다. 오늘 문제는 이 계정이 오늘 풀었을 때만 올라옵니다 — 정답이 새지 않게.
 *  - 정답·해설은 서버에서 받습니다(/api/quiz/history, 2026-09-15부터 정답이 앱 코드에 없음).
 * 해설은 줄마다 접혀 있고 "해설 보기"로 폅니다. 돌아갈 자리는 홈이라 <와 오른쪽 밀기 모두 홈으로 갑니다.
 */
function QuizzesPageContent() {
  const router = useRouter();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });
  const day = useKstDay();
  const todayDate = kstDateString(day);
  const { user } = useAuth();
  const { items, loading, error } = useQuizHistory(user?.uid, day);

  /** 해설을 펼쳐 둔 줄들 ("날짜:문제 id") */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setOpenKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    /* 수업 기록·역대 투표 화면과 같은 짜임새 — 화면 전체를 한 상자로 밀어 홈으로 돌아갑니다. */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="역대 퀴즈" backHref="/home" />

      <div className="px-4 pb-8">
        {loading ? (
          <ul className="flex flex-col gap-3">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton className="h-[140px] rounded-3xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState title="지난 퀴즈가 아직 없어요" />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const key = `${item.date}:${item.quizId}`;
              return (
                <li key={key}>
                  <PastQuizCard
                    item={item}
                    dateLabel={`${formatMonthDay(item.date)}${item.date === todayDate ? " · 오늘" : ""}`}
                    open={openKeys.has(key)}
                    onToggle={() => toggle(key)}
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

function PastQuizCard({
  item,
  dateLabel,
  open,
  onToggle,
}: {
  item: QuizHistoryItem;
  dateLabel: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    /* 홈 퀴즈 카드와 같은 여백(위 19px·옆 20px)과 문제 글씨(17px) */
    <article className="rounded-3xl bg-surface px-5 pt-[19px] pb-5 shadow-[var(--shadow-card)]">
      <p className="text-[13px] font-medium text-ink-faint">{dateLabel}</p>

      {/* break-keep: 줄 끝에서 낱말 가운데가 끊기지 않게 — 홈 퀴즈 카드와 같습니다. */}
      {/* gap-1 — "Q."와 질문 사이 4px, 홈 퀴즈 카드와 같이 (2026-09-25 사용자 요청, 8px → 6px → 4px). */}
      <p className="mt-2 flex gap-1 text-[17px] leading-relaxed font-medium text-ink">
        <span className="shrink-0 font-bold text-brand-500">Q.</span>
        <span className="break-keep">{item.question}</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* 정답 — 홈 카드에서 고른 칸과 같은 모양(주황 테두리·옅은 주황 바탕), O는 파랑·X는 빨강 */}
        <span className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-brand-500 bg-brand-50 px-3 py-1.5 text-[15px] font-bold text-brand-500">
          {item.answer === "O" ? (
            <OMarkIcon className="h-4 w-4 text-blue-500" />
          ) : (
            <XMarkIcon className="h-4 w-4 text-danger" />
          )}
          정답 · {item.answer === "O" ? "그렇다" : "아니다"}
        </span>

        {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="shrink-0 text-[14px]! font-medium text-ink-muted"
        >
          {open ? "해설 접기" : "해설 보기"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-[15px] leading-[1.8] break-keep text-ink-soft">
          {item.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** 역대 퀴즈는 내가 푼 답과 함께 보여서 로그인해야 봅니다 (2026-09-24, components/GuestGate.tsx). */
export default function QuizzesPage() {
  return (
    <GuestGate title="역대 퀴즈">
      <QuizzesPageContent />
    </GuestGate>
  );
}
