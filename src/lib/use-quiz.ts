"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { OxAnswer } from "@/lib/dosan-quiz";
import type { QuizHistoryItem, QuizStatus } from "@/lib/quiz-types";

/**
 * 오늘의 OX 퀴즈 — 앱 쪽에서 서버(/api/quiz, /api/quiz/history)를 부르는 곳 (2026-09-15).
 *
 * 예전에는 고른 답을 폰(localStorage)에만 적었는데(use-quiz-answer.ts, 삭제), 맞힌 개수와 기수 안 등수를
 * 매기면서 답·채점·성적을 서버로 옮겼습니다. 그래서 한 계정은 어느 폰에서든 하루 한 번만 풉니다.
 *
 * effect 안에서 곧바로 setState를 부르면 린트가 빌드를 막으므로, 받아 온 뒤(then)에만 적고
 * "불러오는 중"은 받아 둔 값이 지금 열쇠(uid·날짜)의 것인지로 가립니다.
 */

export class QuizRequestError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

async function quizFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new QuizRequestError("unauthorized");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  });
  const body = (await response.json().catch(() => null)) as
    | ({ ok: boolean; reason?: string } & T)
    | null;
  if (!response.ok || !body?.ok) throw new QuizRequestError(body?.reason ?? "failed");
  return body;
}

/** 오늘 문제에 답을 보내고 채점 결과(오늘 결과 + 성적)를 받습니다. 자정을 넘겼으면 reason "stale-quiz"로 실패합니다. */
export async function sendQuizAnswer(quizId: string, answer: OxAnswer): Promise<QuizStatus> {
  const body = await quizFetch<{ status: QuizStatus }>("/api/quiz", {
    method: "POST",
    body: JSON.stringify({ quizId, answer }),
  });
  return body.status;
}

/**
 * 오늘 문제를 풀었는지와 내 성적. day(한국 날짜 번호)가 바뀌면 다시 받습니다.
 * setStatus — 답을 보낸 뒤 받은 결과를 곧바로 넣어 다시 받지 않게 합니다.
 */
export function useQuizStatus(uid: string | undefined, day: number) {
  const key = uid ? `${uid}:${day}` : null;
  const [entry, setEntry] = useState<{
    key: string;
    status: QuizStatus | null;
    error: string | null;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    quizFetch<{ status: QuizStatus }>("/api/quiz")
      .then((body) => {
        if (!cancelled) setEntry({ key, status: body.status, error: null });
      })
      .catch(() => {
        if (!cancelled) setEntry({ key, status: null, error: "퀴즈를 불러오지 못했어요." });
      });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  const setStatus = useCallback(
    (status: QuizStatus) => {
      if (key) setEntry({ key, status, error: null });
    },
    [key],
  );

  const current = entry && entry.key === key ? entry : null;
  return {
    status: current?.status ?? null,
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    refresh,
    setStatus,
  };
}

/** 역대 퀴즈(정답·해설 포함). day가 바뀌면 다시 받습니다. */
export function useQuizHistory(uid: string | undefined, day: number) {
  const key = uid ? `${uid}:${day}` : null;
  const [entry, setEntry] = useState<{
    key: string;
    items: QuizHistoryItem[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    quizFetch<{ items: QuizHistoryItem[] }>("/api/quiz/history")
      .then((body) => {
        if (!cancelled) setEntry({ key, items: body.items, error: null });
      })
      .catch(() => {
        if (!cancelled) setEntry({ key, items: [], error: "역대 퀴즈를 불러오지 못했어요." });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = entry && entry.key === key ? entry : null;
  return {
    items: current?.items ?? [],
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
  };
}
