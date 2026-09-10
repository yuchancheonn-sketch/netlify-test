"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRightIcon, OMarkIcon, XMarkIcon } from "@/components/icons";
import { PrimaryButton } from "@/components/ui";
import { quizOfTheDay, type DosanQuiz, type OxAnswer } from "@/lib/dosan-quiz";
import { todayString } from "@/lib/format";
import { useQuizAnswer, useQuizCollapsed } from "@/lib/use-quiz-answer";

/** "채점 중이에요" 화면을 보여주는 시간(ms). 너무 짧으면 번쩍하고, 길면 답답합니다. */
const GRADING_MS = 1600;

const CHOICES: { value: OxAnswer; label: string }[] = [
  { value: "O", label: "그렇다" },
  { value: "X", label: "아니다" },
];

function choiceLabel(value: OxAnswer): string {
  return `${value} · ${value === "O" ? "그렇다" : "아니다"}`;
}

/**
 * 홈 맨 위 "오늘의 OX 퀴즈" 카드.
 *
 * 나만의닥터의 매일 퀴즈 흐름을 따랐습니다.
 *   1. 그렇다/아니다 중 하나를 누르면 "정답 제출하기"가 나타납니다.
 *   2. 제출하면 잠깐 "채점 중이에요" 화면이 뜹니다.
 *   3. 이어서 전체 화면 해설이 뜹니다. 닫으면 카드에 결과가 남고,
 *      "해설 보기"로 다시 열 수 있습니다.
 *
 * 문제와 해설은 lib/dosan-quiz.ts, 고른 답은 이 폰에만(lib/use-quiz-answer.ts).
 */
export default function DosanQuizCard() {
  const quiz = quizOfTheDay();
  const quizKey = `${todayString()}:${quiz.id}`;
  const [answer, saveAnswer] = useQuizAnswer(quizKey);
  /** 푼 뒤에만 접을 수 있습니다. 풀기 전에는 늘 펼쳐 둡니다 — 접힌 채로는 문제를 못 봅니다. */
  const [collapsed, setCollapsed] = useQuizCollapsed(quizKey);
  const expanded = !answer || !collapsed;
  /** 제출 전에 눌러 둔 답 */
  const [picked, setPicked] = useState<OxAnswer | null>(null);
  const [screen, setScreen] = useState<"none" | "grading" | "explanation">("none");
  const gradingTimer = useRef<number | null>(null);

  // 채점 화면이 떠 있는 동안 홈을 벗어나면 타이머만 치웁니다.
  useEffect(
    () => () => {
      if (gradingTimer.current !== null) window.clearTimeout(gradingTimer.current);
    },
    [],
  );

  function submit() {
    if (!picked || answer) return;
    saveAnswer(picked);
    setScreen("grading");
    gradingTimer.current = window.setTimeout(() => setScreen("explanation"), GRADING_MS);
  }

  /*
   * 버튼 색.
   * 풀기 전에는 고른 칸만 주황. 푼 뒤에는 정답 칸이 주황이고, 내가 틀리게 고른
   * 칸은 빨간 테두리, 나머지는 흐리게 둡니다.
   */
  function choiceClassName(value: OxAnswer): string {
    if (!answer) {
      return picked === value
        ? "border-brand-500 bg-brand-50 text-brand-500"
        : "border-line bg-surface text-ink";
    }
    if (value === quiz.answer) return "border-brand-500 bg-brand-50 text-brand-500";
    if (value === answer) return "border-danger bg-surface text-danger";
    return "border-line bg-surface text-ink-faint";
  }

  const correct = answer === quiz.answer;

  return (
    <>
      <section className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          {/*
            제목은 "오늘의 도산" 카드의 제목과 같은 크기·굵기·색입니다(18px, 굵게, 검정).
            처음엔 나만의닥터처럼 주황 바탕의 작은 이름표였는데 2026-09-11에 맞췄습니다.
          */}
          <h2 className="text-[18px] font-bold text-ink">오늘의 OX 퀴즈</h2>
          {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
          {answer ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setScreen("explanation")}
                className="flex items-center gap-0.5 text-[14px]! font-medium text-ink-muted"
              >
                해설 보기
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              {/*
                접고 펴기. 접혀 있으면 ∨(눌러서 펼침), 펼쳐 있으면 ∧(눌러서 접음).
                오른쪽 화살표를 돌려 씁니다. 손끝 자리는 32px로 넉넉히 두되,
                -mr-1.5로 카드 오른쪽 여백 안쪽 줄에 화살표가 맞게 당깁니다.
              */}
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={expanded}
                aria-label={expanded ? "오늘의 OX 퀴즈 접기" : "오늘의 OX 퀴즈 펼치기"}
                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition active:bg-fill"
              >
                <ChevronRightIcon
                  className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${
                    expanded ? "-rotate-90" : "rotate-90"
                  }`}
                />
              </button>
            </div>
          ) : null}
        </div>

        {/*
          접고 펴는 부분 — 문제·고르기·결과.
          높이를 재지 않고 grid 줄 높이를 1fr ↔ 0fr로 바꿔 부드럽게 여닫습니다.
          접혀 있는 동안에는 inert로 안의 단추가 눌리거나 초점을 받지 않게 합니다.
        */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
          inert={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            {/* break-keep: 줄 끝에서 "선생 / 이"처럼 낱말 가운데가 끊기지 않게 낱말 단위로 넘깁니다. */}
            <p className="flex gap-2 pt-4 text-[17px] leading-relaxed font-medium text-ink">
              <span className="shrink-0 font-bold text-brand-500">Q.</span>
              <span className="break-keep">{quiz.question}</span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="답 고르기">
              {CHOICES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={(answer ?? picked) === value}
                  disabled={Boolean(answer)}
                  onClick={() => setPicked(value)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-[16px]! font-bold transition active:scale-[0.98] disabled:active:scale-100 ${choiceClassName(
                    value,
                  )}`}
                >
                  {value === "O" ? (
                    <OMarkIcon className="h-5 w-5 text-brand-500" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 text-danger" />
                  )}
                  {label}
                </button>
              ))}
            </div>

            {answer ? (
              <p
                className={`mt-4 text-center text-[15px] font-bold ${
                  correct ? "text-brand-500" : "text-danger"
                }`}
              >
                {correct ? "정답이에요!" : `아쉬워요, 정답은 ${quiz.answer}예요`}
              </p>
            ) : picked ? (
              <div className="mt-3">
                <PrimaryButton onClick={submit} size="compact">
                  정답 제출하기
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {screen === "grading" ? <GradingScreen /> : null}
      {screen === "explanation" && answer ? (
        <ExplanationScreen quiz={quiz} answer={answer} onClose={() => setScreen("none")} />
      ) : null}
    </>
  );
}

/**
 * 제출하고 해설이 뜨기 전 잠깐 — "두구두구두구.. 채점 중이에요".
 *
 * 북은 animate()로 좌우로 흔듭니다. 붙는 순간(ref) 한 번 걸면 되어 globals.css에
 * 키프레임을 따로 두지 않습니다(기수 고르기 목록과 같은 방식).
 * "움직임 줄이기"를 켠 폰에서는 가만히 둡니다.
 */
function GradingScreen() {
  const drumRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.animate(
      [
        { transform: "rotate(-10deg) scale(1)" },
        { transform: "rotate(10deg) scale(1.06)" },
      ],
      { duration: 160, direction: "alternate", iterations: Infinity, easing: "ease-in-out" },
    );
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center bg-surface px-6 pt-[calc(18dvh+env(safe-area-inset-top))] text-center"
    >
      <p className="text-[17px] font-medium text-ink">두구두구두구..</p>
      <p className="mt-1 text-[30px] font-bold tracking-tight text-ink">채점 중이에요</p>
      <p className="mt-3 text-[16px] font-bold text-brand-500">과연 정답은 무엇일까요?</p>
      <span ref={drumRef} aria-hidden="true" className="mt-20 inline-block text-[96px] leading-none">
        🥁
      </span>
    </div>
  );
}

/** 전체 화면 해설. 위에 제목과 닫기, 가운데 문제·정답·해설, 아래에 확인 단추. */
function ExplanationScreen({
  quiz,
  answer,
  onClose,
}: {
  quiz: DosanQuiz;
  answer: OxAnswer;
  onClose: () => void;
}) {
  const correct = answer === quiz.answer;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="퀴즈 해설"
      className="fixed inset-0 z-50 flex flex-col bg-surface"
    >
      <div className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-14 items-center justify-center px-14">
          <h2 className="text-[17px] font-bold text-ink">퀴즈 해설</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink"
          >
            <XMarkIcon className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
        <p className={`text-[15px] font-bold ${correct ? "text-brand-500" : "text-danger"}`}>
          {correct ? "정답이에요!" : "아쉽게 틀렸어요"}
        </p>
        <h3 className="mt-2 text-[24px] leading-snug font-bold tracking-tight break-keep text-ink">
          {quiz.question}
        </h3>

        <dl className="mt-5 flex flex-col gap-2 rounded-2xl bg-fill px-5 py-4 text-[15px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">정답</dt>
            <dd className="font-bold text-brand-500">{choiceLabel(quiz.answer)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">내 답</dt>
            <dd className={`font-bold ${correct ? "text-brand-500" : "text-danger"}`}>
              {choiceLabel(answer)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-4 text-[16px] leading-[1.8] break-keep text-ink-soft">
          {quiz.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-6 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <PrimaryButton onClick={onClose}>확인</PrimaryButton>
      </div>
    </div>
  );
}
