"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { OMarkIcon, XMarkIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { kstDateString, pastQuizzes, quizForDay, type DosanQuiz } from "@/lib/dosan-quiz";
import { formatMonthDay } from "@/lib/format";
import { useKstDay } from "@/lib/use-kst-day";
import { useQuizAnswer } from "@/lib/use-quiz-answer";
import { useSwipeBack } from "@/lib/use-swipe-back";

/**
 * 역대 퀴즈 — 홈 "오늘의 OX 퀴즈" 카드 오른쪽 위 ">"로 들어오는 화면 (2026-09-11).
 *
 * 지금까지 나왔던 문제를 최근 날부터 모아, 문제·정답·해설을 보여줍니다(lib/dosan-quiz.ts의 pastQuizzes).
 *  - 앞으로 나올 문제는 없습니다. 오늘 문제는 이 계정이 오늘 풀었을 때만 올라옵니다 — 정답이 새지 않게.
 *  - 내가 그날 무엇을 골랐는지는 보이지 않습니다. 답은 오늘 것만 폰에 남기기 때문입니다(use-quiz-answer.ts).
 * 해설은 줄마다 접혀 있고 "해설 보기"로 폅니다. 돌아갈 자리는 홈이라 <와 오른쪽 밀기 모두 홈으로 갑니다.
 */
export default function QuizzesPage() {
  const router = useRouter();
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });
  const day = useKstDay();
  const { user } = useAuth();
  const todayQuiz = quizForDay(day);
  const [todayAnswer] = useQuizAnswer(user?.uid, `${kstDateString(day)}:${todayQuiz.id}`);
  const items = pastQuizzes(day, todayAnswer !== null);

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
        {items.length === 0 ? (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState title="지난 퀴즈가 아직 없어요" />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map(({ day: quizDay, quiz }) => {
              const key = `${quizDay}:${quiz.id}`;
              return (
                <li key={key}>
                  <PastQuizCard
                    quiz={quiz}
                    dateLabel={`${formatMonthDay(kstDateString(quizDay))}${quizDay === day ? " · 오늘" : ""}`}
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
  quiz,
  dateLabel,
  open,
  onToggle,
}: {
  quiz: DosanQuiz;
  dateLabel: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    /* 홈 퀴즈 카드와 같은 여백(위 19px·옆 20px)과 문제 글씨(17px) */
    <article className="rounded-3xl bg-surface px-5 pt-[19px] pb-5 shadow-[var(--shadow-card)]">
      <p className="text-[13px] font-medium text-ink-faint">{dateLabel}</p>

      {/* break-keep: 줄 끝에서 낱말 가운데가 끊기지 않게 — 홈 퀴즈 카드와 같습니다. */}
      <p className="mt-2 flex gap-2 text-[17px] leading-relaxed font-medium text-ink">
        <span className="shrink-0 font-bold text-brand-500">Q.</span>
        <span className="break-keep">{quiz.question}</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* 정답 — 홈 카드에서 푼 뒤 정답 칸과 같은 모양(주황 테두리·옅은 주황 바탕), O는 파랑·X는 빨강 */}
        <span className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-brand-500 bg-brand-50 px-3 py-1.5 text-[15px] font-bold text-brand-500">
          {quiz.answer === "O" ? (
            <OMarkIcon className="h-4 w-4 text-blue-500" />
          ) : (
            <XMarkIcon className="h-4 w-4 text-danger" />
          )}
          정답 · {quiz.answer === "O" ? "그렇다" : "아니다"}
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
          {quiz.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}
