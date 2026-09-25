"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, OMarkIcon, QMarkIcon, XMarkIcon } from "@/components/icons";
import { useGoToLogin, useIsGuest } from "@/components/LoginRequired";
import { PrimaryButton, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { kstDateString, quizForDay, type OxAnswer } from "@/lib/dosan-quiz";
import type { QuizStats, QuizTodayResult } from "@/lib/quiz-types";
import { useKstDay } from "@/lib/use-kst-day";
import { QuizRequestError, sendQuizAnswer, useQuizStatus } from "@/lib/use-quiz";

/** "채점 중이에요" 화면을 보여주는 가장 짧은 시간(ms). 서버가 빨리 답해도 이만큼은 보여줍니다. */
const GRADING_MS = 1600;

const CHOICES: { value: OxAnswer; label: string }[] = [
  { value: "O", label: "그렇다" },
  { value: "X", label: "아니다" },
];

function choiceLabel(value: OxAnswer): string {
  return `${value} · ${value === "O" ? "그렇다" : "아니다"}`;
}

/**
 * 홈 "오늘의 OX 퀴즈" 카드.
 *
 * 나만의닥터의 매일 퀴즈 흐름을 따랐습니다.
 *   1. 그렇다/아니다 중 하나를 누르면 "정답 제출하기"가 나타납니다.
 *   2. 제출하면 잠깐 "채점 중이에요" 화면이 뜹니다.
 *   3. 이어서 전체 화면 해설이 뜹니다.
 *
 * ★ 푼 뒤에는 카드 속이 **내 성적**으로 바뀝니다 (2026-09-15 사용자 요청).
 *   오늘 결과 한 줄 + "맞힌 문제 N개 / 푼 문제" + "N기 원우 중 N등 / 참여 N명". "해설 보기"로 오늘 해설을 다시 엽니다.
 *   오른쪽 위 ">"(역대 퀴즈)는 그대로 — 지나간 문제의 정답·해설을 모두 봅니다.
 *
 * ★ 채점은 서버가 합니다 (lib/quiz-server.ts, /api/quiz).
 *   정답·해설은 앱 코드에 없고 제출한 뒤에야 받습니다. 한 계정은 어느 폰에서든 하루 한 번만 풉니다.
 *   예전의 폰 저장(use-quiz-answer.ts)과 "?quiz-reset" 다시 풀기 뒷문은 이때 없앴습니다.
 */
export default function DosanQuizCard() {
  // 한국 시간 새벽 12시에 다음 문제로 — 홈을 켜 둔 채여도 그 순간 바뀝니다(use-kst-day.ts).
  const day = useKstDay();
  const quiz = quizForDay(day);
  const quizKey = `${kstDateString(day)}:${quiz.id}`;
  const { user } = useAuth();
  const quizStatus = useQuizStatus(user?.uid, day);
  // 자정 경계에서 서버가 본 오늘 문제와 화면의 문제가 다르면, 서버 값을 아직 쓰지 않습니다.
  const status = quizStatus.status?.quizId === quiz.id ? quizStatus.status : null;
  /*
   * 로그인 안 하고 둘러보는 사람 (2026-09-24 사용자 요청) — 풀 수는 있지만 기록은 안 남습니다(/api/quiz/check).
   * 결과는 이 화면에만 들고 있고, 성적 칸 대신 "나의 등수 보러가기"(로그인)를 보여 줍니다.
   */
  const isGuest = useIsGuest();
  const goToLogin = useGoToLogin();
  const [guestResult, setGuestResult] = useState<{ key: string; result: QuizTodayResult } | null>(null);
  const today = isGuest
    ? guestResult?.key === quizKey
      ? guestResult.result
      : null
    : (status?.today ?? null);

  /**
   * 제출 전에 눌러 둔 답. 어느 문제에 고른 것인지(key)와 함께 둡니다 —
   * 고르기만 하고 자정을 넘기면 새 문제에 어제 고른 답이 켜져 있지 않게 합니다.
   */
  const [pickedFor, setPickedFor] = useState<{ key: string; value: OxAnswer } | null>(null);
  const picked = pickedFor?.key === quizKey ? pickedFor.value : null;
  const [screen, setScreen] = useState<"none" | "grading" | "explanation">("none");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const gradingTimer = useRef<number | null>(null);

  // 채점 화면이 떠 있는 동안 홈을 벗어나면 타이머만 치웁니다.
  useEffect(
    () => () => {
      if (gradingTimer.current !== null) window.clearTimeout(gradingTimer.current);
    },
    [],
  );

  async function submit() {
    if (!picked || today || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setScreen("grading");
    const startedAt = Date.now();
    try {
      if (isGuest) {
        const response = await fetch("/api/quiz/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: quiz.id, answer: picked }),
        });
        if (!response.ok) {
          const reason = ((await response.json().catch(() => null)) as { reason?: string } | null)?.reason;
          throw new QuizRequestError(reason ?? "failed");
        }
        setGuestResult({ key: quizKey, result: (await response.json()) as QuizTodayResult });
      } else {
        const next = await sendQuizAnswer(quiz.id, picked);
        quizStatus.setStatus(next);
      }
      // 서버가 빨리 답해도 "채점 중이에요"를 잠깐은 보여줍니다 — 번쩍하고 지나가지 않게.
      const wait = Math.max(0, GRADING_MS - (Date.now() - startedAt));
      gradingTimer.current = window.setTimeout(() => setScreen("explanation"), wait);
    } catch (caught) {
      setScreen("none");
      setSubmitError(
        caught instanceof QuizRequestError && caught.reason === "stale-quiz"
          ? "자정이 지나 새 문제로 바뀌었어요. 새 문제를 풀어 주세요."
          : "제출하지 못했어요. 잠시 후 다시 눌러 주세요.",
      );
      quizStatus.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * 버튼 색 — 푸는 동안만 씁니다(푼 뒤에는 카드가 성적으로 바뀝니다).
   * 고른 칸은 주황 테두리 + 연한 주황 바탕(brand-50) + 주황 글씨(2026-09-15 사용자 요청), 나머지는 흰 칸.
   * 안 고른 칸의 테두리는 선 색(line)에 먹색(ink)을 8% 섞은 것 — 2026-09-25 사용자 "아주 조금만 더 진한 회색으로"
   * (밝은 화면 약 #D4D6D8, 예전 line #E4E6E9). 먹색을 섞으니 어두운 화면에서는 한 단 밝아져 역시 또렷해집니다.
   */
  function choiceClassName(value: OxAnswer): string {
    return picked === value
      ? "border-brand-500 bg-brand-50 text-brand-500"
      : "border-[color-mix(in_srgb,var(--color-line)_92%,var(--color-ink))] bg-surface text-ink";
  }

  return (
    <>
      {/* 위 여백 17px — 20px(pt-5) → 19px → 17px로 두 번 줄였습니다(2026-09-11). */}
      {/* pt-[13.5px] — 카드 위 흰 여백 (2026-09-25 사용자 "0.5px 줄여줘" → "좀 줄여줘", 17px → 16.5px → 13.5px). 캘린더 박스와 함께 3px씩. */}
      <section className="rounded-3xl bg-surface px-5 pt-[13.5px] pb-5 shadow-[var(--shadow-card-flat)]">
        <div className="flex items-center justify-between gap-2">
          {/*
            제목은 "오늘의 도산" 카드의 제목과 같은 크기·굵기·색입니다(18px, 굵게, 검정).
            처음엔 나만의닥터처럼 주황 바탕의 작은 이름표였는데 2026-09-11에 맞췄습니다.
          */}
          <h2 className="text-[18px] font-bold text-ink">오늘의 OX 퀴즈</h2>
          {/*
            오른쪽 위 — (푼 뒤에만) 해설 보기, 그리고 늘 ">" 역대 퀴즈(/quizzes).
            -mr-1.5: ">"의 손끝 자리(32px)는 넉넉히 두고, 꺾쇠 끝은 카드 오른쪽 여백 줄에 맞춥니다.
          */}
          <div className="-mr-1.5 flex shrink-0 items-center gap-1">
            {/*
              푼 뒤에 해설을 다시 여는 단추. 바로 옆에 ">"가 서므로 꺾쇠를 떼고 글자만 둡니다(2026-09-11).
              크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다.
            */}
            {today ? (
              <button
                type="button"
                onClick={() => setScreen("explanation")}
                className="text-[14px]! font-medium text-ink-muted"
              >
                해설 보기
              </button>
            ) : null}
            <Link
              href="/quizzes"
              aria-label="역대 퀴즈 보기"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition active:bg-fill"
            >
              {/*
                홈 D-day 카드의 ">"와 같은 크기·굵기(24px·2.1) — 한쪽을 바꾸면 EventCard.tsx도 같이 바꿔 주세요.
              */}
              <ChevronRightIcon className="h-6 w-6" strokeWidth={2.1} />
            </Link>
          </div>
        </div>

        {/*
          ★ 제목("오늘의 OX 퀴즈") 아래 여백은 네 갈래가 모두 pt-2(8px)입니다
            (16px → 12px → 8px, 2026-09-22 사용자 "줄여줘" → "더 줄여줘").
            갈래는 ① 불러오는 중 ② 푼 뒤 성적(QuizResultView) ③ 못 불러왔을 때 ④ 문제입니다.
            한 갈래만 고치면 상태가 바뀌는 순간 카드 속이 그 차이만큼 튑니다 — 특히 ①에서 ④로
            넘어갈 때(불러오기가 끝나는 순간) 눈에 그대로 보입니다.
          ★ 카드 맨 위 여백(위 section의 pt-[17px], 카드 테두리와 제목 사이)은 그대로입니다.
        */}
        {quizStatus.loading && !status ? (
          /* 서버에서 풀었는지·성적을 받아 오는 동안. 문제+두 칸 자리만큼. */
          <div className="pt-2">
            <Skeleton className="h-[52px] rounded-2xl" />
            <Skeleton className="mt-4 h-10 rounded-2xl" />
          </div>
        ) : today && isGuest ? (
          <>
            <QuizResultView today={today} stats={null} />
            {/* 로그인 안 하고 푼 답은 맞힌 수·등수에 안 들어갑니다 — 로그인하면 이 화면으로 돌아와 다시 풉니다. */}
            <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
              로그인하지 않고 푼 답은 등수에 들어가지 않아요.
            </p>
            <div className="mt-3">
              <PrimaryButton onClick={() => goToLogin()} size="compact">
                나의 등수 보러가기
              </PrimaryButton>
            </div>
          </>
        ) : today ? (
          <QuizResultView today={today} stats={status?.stats ?? null} />
        ) : quizStatus.error && !status ? (
          <div className="pt-2 text-center">
            <p className="text-[14px] text-ink-muted">{quizStatus.error}</p>
            <button
              type="button"
              onClick={quizStatus.refresh}
              className="mt-2 text-[14px]! font-bold text-brand-500"
            >
              다시 불러오기
            </button>
          </div>
        ) : (
          <>
            {/* break-keep: 줄 끝에서 "선생 / 이"처럼 낱말 가운데가 끊기지 않게 낱말 단위로 넘깁니다. */}
            {/* gap-1 — "Q."와 질문 사이 4px (2026-09-25 사용자 "더 붙여줘" 두 번, 8px → 6px → 4px). 퀴즈 기록 화면도 같은 값. */}
            <p className="flex gap-1 pt-2 text-[17px] leading-relaxed font-medium text-ink">
              {/*
                Q는 글꼴 글자 대신 굵은 Q 아이콘(QMarkIcon) — 사진처럼 꼬리가 길게 뚫고 나가는 모양(2026-09-22).
                크기: 0.9em(≈15px)에서 2px 키웠습니다(2026-09-22 사용자 요청).
                align-[-2.7px]: 아이콘 속 고리 바닥(아이콘 높이의 1/8 위)을 글줄(baseline)에 맞춘 값 -2.2px에서
                0.5px 더 내렸습니다(2026-09-22 사용자 요청). 꼬리는 그 아래로 살짝 내려갑니다.
                크기를 바꾸면 높이÷8 + 0.5px로 이 값도 같이 바꿔 주세요.
              */}
              <span className="shrink-0 font-bold text-brand-500">
                <QMarkIcon className="inline-block h-[calc(0.9em+2px)] w-[calc(0.9em+2px)] align-[-2.7px]" />
                <span className="sr-only">Q</span>.
              </span>
              <span className="break-keep">{quiz.question}</span>
            </p>

            {/*
              고른 칸을 한 번 더 누르면 고르기가 풀립니다 (2026-09-14, 사용자 요청).
              아무것도 안 고른 상태로 돌아가므로 아래 "정답 제출하기"도 함께 사라집니다.

              높이: 위아래 6.5px(py-[6.5px]) + 테두리 1.5px씩 + 글줄 24px ≈ 40px.
              테두리는 2026-09-15 사용자 요청으로 2px → 1.5px로 얇게 했고, 줄어든 0.5px씩을 위아래 여백에
              더해 높이는 그대로 40px입니다(아래 "정답 제출하기"(PrimaryButton compact)와 같은 높이를 지키려고).
            */}
            <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="답 고르기">
              {CHOICES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={picked === value}
                  disabled={submitting}
                  onClick={() => setPickedFor(picked === value ? null : { key: quizKey, value })}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-[1.5px] py-[6.5px] text-[16px]! font-bold transition active:scale-[0.98] disabled:active:scale-100 ${choiceClassName(
                    value,
                  )}`}
                >
                  {value === "O" ? (
                    /*
                      O는 파랑, X는 빨강 — OX 퀴즈에서 흔히 쓰는 짝입니다(2026-09-11, 예전엔 O가 주황).
                      -translate-y-px: 아이콘만 1px 위로 (2026-09-15 사용자 요청). 옆 글씨는 따로 2px 올라가 있습니다.
                    */
                    <OMarkIcon className="h-5 w-5 -translate-y-px text-blue-500" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 -translate-y-px text-danger" />
                  )}
                  {/* -translate-y-[2px]: 글씨를 2px 위로 — 아이콘 옆에서 살짝 아래로 앉아 보였습니다(2026-09-15). */}
                  <span className="-translate-y-[2px]">{label}</span>
                </button>
              ))}
            </div>

            {picked ? (
              <div className="mt-3">
                <PrimaryButton onClick={submit} size="compact" loading={submitting}>
                  정답 제출하기
                </PrimaryButton>
              </div>
            ) : null}
            {submitError ? (
              <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
                {submitError}
              </p>
            ) : null}
          </>
        )}
      </section>

      {screen === "grading" ? <GradingScreen /> : null}
      {screen === "explanation" && today ? (
        <ExplanationScreen
          question={quiz.question}
          today={today}
          onClose={() => setScreen("none")}
        />
      ) : null}
    </>
  );
}

/**
 * 푼 뒤 카드 속 — 오늘 결과 한 줄과 성적 두 칸 (2026-09-15).
 *
 * 왼쪽 "맞힌 문제": 지금까지 맞힌 개수 / 푼 문제 수. 오른쪽 "N기 원우 중": 기수 안 등수 / 참여 원우 수.
 * 등수는 본인 화면에만 보이고 다른 원우의 이름은 나오지 않습니다. 맞힌 수가 같으면 "공동 N등".
 * 두 칸은 흰 카드 위의 옅은 회색(bg-fill) 상자로, 오늘의 도산·원우 상세 정보 상자와 같은 결입니다.
 */
function QuizResultView({ today, stats }: { today: QuizTodayResult; stats: QuizStats | null }) {
  return (
    <>
      {/* 제목 아래 여백 8px — 위 DosanQuizCard의 다른 세 갈래와 같은 값이어야 합니다(거기 주석 참고). */}
      <p className={`pt-2 text-[15px] font-bold ${today.correct ? "text-brand-500" : "text-danger"}`}>
        {today.correct ? "오늘 퀴즈 정답이에요!" : `아쉽게 틀렸어요 · 정답은 ${today.answer}`}
      </p>

      {/*
        ★ 등수 칸은 기수 안 10등까지만 (2026-09-15 사용자 요청).
          서버가 11등부터는 rank를 null로 보내고, 그때는 맞힌 문제 칸 하나만 폭 가득(grid-cols-1) 둡니다.
      */}
      {stats ? (
        <div className={`mt-3 grid gap-3 ${stats.rank !== null ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-2xl bg-fill px-4 py-3">
            <p className="text-[13px] text-ink-muted">맞힌 문제</p>
            <p className="mt-1 text-[22px] leading-tight font-bold text-ink">
              <span className="tabular-nums">{stats.correct}</span>개
              <span className="ml-1 text-[14px] font-medium text-ink-faint">
                / <span className="tabular-nums">{stats.answered}</span>문제
              </span>
            </p>
          </div>
          {stats.rank !== null ? (
            <div className="rounded-2xl bg-fill px-4 py-3">
              <p className="text-[13px] text-ink-muted">{stats.cohort} 원우 중</p>
              <p className="mt-1 text-[22px] leading-tight font-bold text-brand-500">
                {/* 동점이어도 "공동" 없이 등수만 (2026-09-15 사용자 요청) — 공동 1등도 그냥 "1등" */}
                <span className="tabular-nums">{stats.rank}</span>등
                <span className="ml-1 text-[14px] font-medium text-ink-faint">
                  / <span className="tabular-nums">{stats.participants}</span>명
                </span>
              </p>
            </div>
          ) : null}
        </div>
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

/** 전체 화면 해설. 위에 제목과 닫기, 가운데 문제·정답·해설, 아래에 확인 단추. 정답·해설은 서버가 준 값입니다. */
function ExplanationScreen({
  question,
  today,
  onClose,
}: {
  question: string;
  today: QuizTodayResult;
  onClose: () => void;
}) {
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
        <p className={`text-[15px] font-bold ${today.correct ? "text-brand-500" : "text-danger"}`}>
          {today.correct ? "정답이에요!" : "아쉽게 틀렸어요"}
        </p>
        <h3 className="mt-2 text-[24px] leading-snug font-bold tracking-tight break-keep text-ink">
          {question}
        </h3>

        <dl className="mt-5 flex flex-col gap-2 rounded-2xl bg-fill px-5 py-4 text-[15px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">정답</dt>
            <dd className="font-bold text-brand-500">{choiceLabel(today.answer)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">내 답</dt>
            <dd className={`font-bold ${today.correct ? "text-brand-500" : "text-danger"}`}>
              {choiceLabel(today.myAnswer)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-4 text-[16px] leading-[1.8] break-keep text-ink-soft">
          {today.explanation.map((paragraph) => (
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
