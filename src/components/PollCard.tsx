"use client";

import { useState } from "react";
import { FieldError, FieldLabel, PrimaryButton, inputClassName } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import { usePolls, usePollVotes } from "@/lib/hooks";
import {
  castVote,
  closePoll,
  countVotes,
  createPoll,
  deletePoll,
  votePercent,
} from "@/lib/polls";
import { saveErrorMessage } from "@/lib/firestore-commit";
import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  POLL_QUESTION_MAX_LENGTH,
} from "@/lib/constants";
import type { PollDoc } from "@/lib/types";

/**
 * 홈 화면의 투표 자리 — "오늘의 도산"과 "수업 기록" 사이.
 *
 * 짜임새는 중앙선관위 온라인투표(vote.kvoting.go.kr) 화면을 따랐습니다.
 *  · 물음을 네모 안에 가둬 한눈에 보이게
 *  · 고를 것을 큼직한 상자로 나란히
 *  · 고른 상자만 테두리와 글씨에 색이 들어옴
 *  · 그 아래 "투표완료하기"로 확정
 * 다만 색은 그 화면의 빨강이 아니라 이 앱의 주황을 씁니다. 빨강은 이 앱에서
 * "지우기·되돌릴 수 없음"이라는 뜻으로 이미 쓰고 있어서, 고른 것을 빨갛게
 * 칠하면 경고처럼 읽힙니다.
 *
 * 열려 있는 투표만 올라옵니다. 닫힌 투표는 결과가 남지만 홈에서는 내려갑니다.
 */
export default function PollCard() {
  const { user } = useAuth();
  const { data: polls, loading } = usePolls();
  const [creating, setCreating] = useState(false);

  const open = polls.filter((poll) => !poll.closed);

  // 불러오는 동안에는 자리만 비워 둡니다 — 잠깐 나타났다 사라지면 더 산만합니다.
  if (loading) return null;

  return (
    <section className="mt-8">
      {open.length > 0 ? (
        <div className="flex flex-col gap-3">
          {open.map((poll) => (
            <OnePoll key={poll.id} poll={poll} myUid={user?.uid} />
          ))}
        </div>
      ) : null}

      {/*
        투표 만들기는 원우 누구나. 열린 투표가 없을 때는 이 단추가 곧 안내가
        되므로 따로 빈 화면을 두지 않습니다.
      */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 text-[15px] font-bold text-brand-500 shadow-[var(--shadow-card)] transition active:scale-[0.99] ${
          open.length > 0 ? "mt-3" : ""
        }`}
      >
        <PlusIcon className="h-5 w-5" />
        투표 만들기
      </button>

      {creating ? <PollCreateSheet onClose={() => setCreating(false)} /> : null}
    </section>
  );
}

/** 투표 하나 — 고르는 중이거나, 이미 넣었으면 결과. */
function OnePoll({ poll, myUid }: { poll: PollDoc; myUid?: string }) {
  const { isAdmin } = useAuth();
  const { data: votes } = usePollVotes(poll.id);

  const myVote = votes.find((vote) => vote.uid === myUid);
  /** 고르는 중인 자리. 아직 안 눌렀으면 이미 넣은 표를 기본으로 둡니다. */
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 표를 넣은 뒤에도 다시 고르는 중인지 */
  const [changing, setChanging] = useState(false);

  const counts = countVotes(poll, votes);
  const total = votes.length;
  const mine = myVote?.optionIndex ?? null;
  const showResult = mine !== null && !changing;
  const canManage = poll.createdBy === myUid || isAdmin;

  const selected = picked ?? mine;

  async function handleSubmit() {
    if (selected === null || !myUid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await castVote({ pollId: poll.id, uid: myUid, optionIndex: selected });
      setChanging(false);
      setPicked(null);
    } catch (caught) {
      setError(saveErrorMessage(caught, "표를 넣지 못했어요."));
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!window.confirm("이 투표를 닫을까요?\n결과는 남지만 더는 고칠 수 없어요.")) return;
    try {
      await closePoll(poll.id);
    } catch {
      setError("투표를 닫지 못했어요.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 투표를 지울까요?\n들어온 표도 함께 사라집니다.")) return;
    try {
      await deletePoll(poll.id);
    } catch {
      setError("투표를 지우지 못했어요.");
    }
  }

  return (
    <div className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold text-ink">투표</h2>
        {/* 몇 명이 넣었는지. 고르기 전에도 보이는 편이 참여를 부릅니다. */}
        <span className="shrink-0 text-[12px] font-medium text-ink-faint">
          {total}명 참여
        </span>
      </div>

      {/*
        물음을 네모 안에 가둡니다 (선관위 화면의 짜임새).
        카드 바탕과 같은 흰색 위에 테두리만 둘러, 물음이 카드 안의 또 다른
        판처럼 보이게 합니다.
      */}
      <div className="rounded-2xl border border-line px-4 py-4 text-center">
        <p className="text-[16px] leading-relaxed font-bold whitespace-pre-wrap text-ink">
          {poll.question}
        </p>
      </div>

      {showResult ? (
        <PollResult poll={poll} counts={counts} total={total} mine={mine} />
      ) : (
        <>
          {/*
            고를 것들. 두 개면 나란히, 셋 이상이면 한 줄에 하나씩 놓습니다.
            셋을 억지로 나란히 놓으면 칸이 좁아 글씨가 줄바꿈됩니다.
          */}
          <div
            className={`mt-3 grid gap-2 ${
              poll.options.length === 2 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {poll.options.map((option, index) => {
              const on = selected === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPicked(index)}
                  aria-pressed={on}
                  /*
                    고른 상자만 테두리가 두꺼워지고 주황이 됩니다.
                    테두리 두께를 늘리지 않고 색만 바꾸면, 밝은 화면에서
                    골랐는지 아닌지가 잘 구분되지 않습니다.
                  */
                  className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[0.98] ${
                    on
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-surface"
                  }`}
                >
                  <span
                    className={`min-w-0 text-[15px] font-bold ${
                      on ? "text-brand-500" : "text-ink"
                    }`}
                  >
                    {option}
                  </span>
                  {/*
                    동그라미 하나로 고름/안 고름을 표시합니다.
                    선관위 화면은 큰 기호를 쓰지만, 그건 찬성·반대 둘뿐일 때
                    이야기입니다. 고를 것이 늘어나면 기호마다 뜻을 새로 정해야
                    하므로, 어디에나 통하는 동그라미로 둡니다.
                  */}
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? "border-brand-500" : "border-ink-faint"
                    }`}
                  >
                    {on ? (
                      <span className="h-[11px] w-[11px] rounded-full bg-brand-500" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected === null || saving}
            className="mt-3 w-full rounded-2xl bg-brand-500 py-4 text-[15px] font-bold text-white transition active:scale-[0.99] disabled:bg-brand-200"
          >
            {saving ? "넣는 중…" : "투표완료하기"}
          </button>

          {changing ? (
            <button
              type="button"
              onClick={() => {
                setChanging(false);
                setPicked(null);
              }}
              className="mt-2 w-full py-1 text-[13px]! font-bold text-ink-faint"
            >
              그대로 두기
            </button>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="min-w-0 truncate text-[12px] text-ink-faint">
          {poll.createdByName}님이 만듦
        </span>

        <div className="flex shrink-0 items-center gap-3">
          {showResult ? (
            <button
              type="button"
              onClick={() => {
                setChanging(true);
                setPicked(mine);
              }}
              className="text-[12px]! font-bold text-brand-500"
            >
              다시 고르기
            </button>
          ) : null}
          {canManage ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="text-[12px]! font-bold text-ink-faint"
              >
                마감
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-[12px]! font-bold text-ink-faint active:text-danger"
              >
                지우기
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 표를 넣은 뒤 보이는 결과 — 자리마다 막대와 표 수. */
function PollResult({
  poll,
  counts,
  total,
  mine,
}: {
  poll: PollDoc;
  counts: number[];
  total: number;
  mine: number | null;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {poll.options.map((option, index) => {
        const percent = votePercent(counts[index], total);
        const on = mine === index;
        return (
          <div
            key={index}
            className={`rounded-2xl border-2 px-4 py-3 ${
              on ? "border-brand-500 bg-brand-50" : "border-line"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`min-w-0 truncate text-[15px] font-bold ${
                  on ? "text-brand-500" : "text-ink"
                }`}
              >
                {option}
                {on ? " ✓" : ""}
              </span>
              <span className="shrink-0 text-[13px] font-bold text-ink-muted tabular-nums">
                {counts[index]}표 · {percent}%
              </span>
            </div>

            {/*
              막대. 숫자만으로도 알 수 있지만, 어느 쪽이 앞서는지는 길이로 볼 때
              훨씬 빨리 읽힙니다. 0표일 때도 홈이 비어 보이지 않도록 바탕은 남깁니다.
            */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-fill">
              <div
                className={`h-full rounded-full ${on ? "bg-brand-500" : "bg-ink-faint"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 새 투표를 여는 바텀시트 */
function PollCreateSheet({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [question, setQuestion] = useState("");
  /** 처음에는 찬성·반대를 채워 둡니다 — 가장 흔한 물음이라 그대로 쓰면 됩니다. */
  const [options, setOptions] = useState<string[]>(["찬성", "반대"]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setOption(index: number, value: string) {
    setOptions((previous) =>
      previous.map((option, at) =>
        at === index ? value.slice(0, POLL_OPTION_MAX_LENGTH) : option,
      ),
    );
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError("무엇을 물어볼지 적어 주세요.");
      return;
    }

    const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
    if (trimmedOptions.length < POLL_MIN_OPTIONS) {
      setError(`고를 것을 ${POLL_MIN_OPTIONS}개 이상 적어 주세요.`);
      return;
    }
    if (new Set(trimmedOptions).size !== trimmedOptions.length) {
      setError("고를 것에 같은 말이 두 번 들어 있어요.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPoll({
        question: trimmedQuestion,
        options: trimmedOptions,
        author: { uid: user.uid, profile },
      });
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "투표를 만들지 못했어요."));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="새 투표 만들기"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">새 투표 만들기</h2>

        <div className="mb-5">
          <FieldLabel htmlFor="poll-question">무엇을 물어볼까요</FieldLabel>
          <input
            id="poll-question"
            value={question}
            onChange={(changed) => {
              setQuestion(changed.target.value.slice(0, POLL_QUESTION_MAX_LENGTH));
              setError(null);
            }}
            placeholder="예) 수료식 날짜를 언제로 할까요?"
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="poll-option-0">고를 것</FieldLabel>
          <div className="flex flex-col gap-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  id={`poll-option-${index}`}
                  value={option}
                  onChange={(changed) => setOption(index, changed.target.value)}
                  placeholder={`${index + 1}번`}
                  className={inputClassName}
                />
                {/* 두 개까지는 지울 수 없습니다 — 하나만 남으면 물어볼 것이 없습니다. */}
                {options.length > POLL_MIN_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((previous) => previous.filter((_, at) => at !== index))
                    }
                    aria-label={`${index + 1}번 지우기`}
                    className="shrink-0 rounded-full px-2 py-2 text-[13px]! font-bold text-ink-faint active:text-danger"
                  >
                    지우기
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {options.length < POLL_MAX_OPTIONS ? (
            <button
              type="button"
              onClick={() => setOptions((previous) => [...previous, ""])}
              className="mt-2 flex items-center gap-1 text-[13px]! font-bold text-brand-500"
            >
              <PlusIcon className="h-4 w-4" />
              고를 것 추가
            </button>
          ) : null}
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-fill px-6 py-4 text-[15px] font-bold text-ink-muted"
          >
            취소
          </button>
          <PrimaryButton type="submit" loading={saving}>
            만들기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
