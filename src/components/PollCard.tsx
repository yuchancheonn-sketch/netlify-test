"use client";

import { useState } from "react";
import { FieldError, FieldLabel, PrimaryButton, inputClassName } from "@/components/ui";
import { PlusIcon, VoteStampIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import { usePollOpinions, usePolls, usePollVotes } from "@/lib/hooks";
import {
  addOpinion,
  castVote,
  closePoll,
  countVotes,
  createPoll,
  deleteOpinion,
  deletePoll,
  votePercent,
} from "@/lib/polls";
import { inCohort } from "@/lib/cohort";
import { saveErrorMessage } from "@/lib/firestore-commit";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useViewCohort } from "@/lib/use-view-cohort";
import {
  OPINION_MAX_LENGTH,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  POLL_QUESTION_MAX_LENGTH,
} from "@/lib/constants";
import type { PollDoc } from "@/lib/types";

/**
 * 홈 화면의 투표 자리 — 모임 일정 바로 아래, "오늘의 도산" 위.
 *
 * 답해 달라고 부르는 자리라 위쪽에 둡니다. 오늘의 도산과 수업 기록은 읽는
 * 것이지만 투표는 손이 가야 끝나는 일이라, 스크롤을 내려야 보이면 놓칩니다.
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
  // 보고 있는 기수의 투표만 — 홈이 기수마다 따로입니다.
  const { cohort } = useViewCohort();
  const [creating, setCreating] = useState(false);

  const open = polls.filter((poll) => !poll.closed && inCohort(poll, cohort));

  // 불러오는 동안에는 자리만 비워 둡니다 — 잠깐 나타났다 사라지면 더 산만합니다.
  if (loading) return null;

  return (
    /*
      위아래 여백을 따로 주지 않습니다.
      홈의 바깥 상자가 gap-5(20px)로 칸 사이를 정하고 있어서, 여기서 mt-를
      더하면 그만큼 혼자 더 벌어집니다. "모임 일정 전체 보기"와 "오늘의 도산"
      사이가 곧 그 20px이고, 투표도 같은 간격으로 섭니다.
    */
    <section>
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

        생김새는 자료 탭의 "앨범 만들기"·"파일 올리기", 수첩의 "원우 추가하기"와
        똑같습니다. 넷 다 "목록 아래에서 새로 하나 더하기"라는 같은 일을 하므로,
        한쪽을 고치면 나머지도 같이 맞춰 주세요.
        (한때 이 단추만 주황 테두리를 둘렀다가 도로 맞췄습니다.)
      */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 text-[15px] font-bold text-brand-500 shadow-[var(--shadow-card)] transition active:scale-[0.99] ${
          open.length > 0 ? "mt-5" : ""
        }`}
      >
        <PlusIcon className="h-5 w-5" />
        투표 만들기
      </button>

      {creating ? <PollCreateSheet onClose={() => setCreating(false)} /> : null}
    </section>
  );
}

/** 투표든 의견 모으기든, 한 칸을 그립니다. */
function OnePoll({ poll, myUid }: { poll: PollDoc; myUid?: string }) {
  // kind가 없는 옛 문서는 투표입니다 (투표가 먼저 있었습니다).
  return poll.kind === "opinion" ? (
    <OpinionBoard poll={poll} myUid={myUid} />
  ) : (
    <VoteBoard poll={poll} myUid={myUid} />
  );
}

/** 투표 하나 — 고르는 중이거나, 이미 넣었으면 결과. */
function VoteBoard({ poll, myUid }: { poll: PollDoc; myUid?: string }) {
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
      {/*
        물음이 이 카드에서 가장 큰 글씨입니다 (19px — 카드 제목 "투표"보다도 큽니다).
        답하기 전에 읽어야 하는 단 하나가 이것이라, 제목이나 선택지에 눌리면
        안 됩니다. 선관위 화면도 물음만 크게 띄웁니다.
      */}
      <div className="rounded-2xl border border-line px-4 py-5 text-center">
        <p className="text-[19px] leading-relaxed font-bold whitespace-pre-wrap text-ink">
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
                    고른 상자만 테두리가 빨개집니다.

                    이 앱에서 빨강은 원래 "지우기·되돌릴 수 없음"이었지만,
                    투표만은 예외로 둡니다. 종이 투표용지에 기표하는 그 빨강이라
                    원우들에게는 오히려 이쪽이 곧바로 읽힙니다. 대신 빨강은
                    **고른 것을 표시할 때만** 쓰고, 마감·지우기 같은 단추에는
                    쓰지 않아 뜻이 섞이지 않게 합니다.

                    ★ 바탕은 칠하지 않습니다.
                      테두리와 도장이 이미 빨간데 연한 빨강까지 깔면 한 가지를
                      세 번 말하는 셈이고, 칸 안의 글씨도 그만큼 탁해집니다.
                      바탕은 고르든 안 고르든 흰색 그대로입니다.
                  */
                  className={`flex items-center justify-between gap-2 rounded-2xl border-2 bg-surface px-4 py-4 text-left transition active:scale-[0.98] ${
                    on ? "border-red-500" : "border-line"
                  }`}
                >
                  {/*
                    글씨는 고르든 안 고르든 진한 먹색입니다.
                    선관위 화면도 그렇습니다 — 빨강은 도장과 테두리가 맡고,
                    무엇을 고르는지(찬성·반대)는 늘 또렷하게 읽혀야 합니다.
                  */}
                  <span className="min-w-0 text-[15px] font-bold text-ink">{option}</span>

                  {/*
                    기표 도장. 안 고른 자리에도 흐리게 남겨 둡니다 —
                    "여기 찍으면 된다"는 자리가 미리 보여야 무엇을 하는
                    화면인지 한눈에 압니다. 선관위 화면과 같은 방식입니다.
                  */}
                  <VoteStampIcon
                    className={`h-[34px] w-[34px] shrink-0 ${
                      on ? "text-red-500" : "text-line"
                    }`}
                    strokeWidth={on ? 2.4 : 2}
                  />
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

/**
 * 의견 모으기 하나 — 익명으로 글을 받아 모아 보여줍니다.
 *
 * 투표와 짜임새는 같습니다(물음 네모 → 답하는 자리 → 만든 사람). 다른 점은
 * 정해진 답이 없다는 것, 그리고 **누가 썼는지 어디에도 남지 않는다**는 것입니다.
 */
function OpinionBoard({ poll, myUid }: { poll: PollDoc; myUid?: string }) {
  const { isAdmin } = useAuth();
  const { data: opinions } = usePollOpinions(poll.id);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = poll.createdBy === myUid || isAdmin;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;

    setSaving(true);
    setError(null);
    try {
      await addOpinion({ pollId: poll.id, text });
      setDraft("");
    } catch (caught) {
      setError(saveErrorMessage(caught, "의견을 남기지 못했어요."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOpinion(opinionId: string) {
    if (!window.confirm("이 의견을 지울까요?")) return;
    try {
      await deleteOpinion(poll.id, opinionId);
    } catch {
      setError("의견을 지우지 못했어요.");
    }
  }

  async function handleClose() {
    if (!window.confirm("의견 모으기를 닫을까요?\n모인 의견은 남지만 더는 못 받아요."))
      return;
    try {
      await closePoll(poll.id);
    } catch {
      setError("닫지 못했어요.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("이것을 지울까요?\n모인 의견도 함께 사라집니다.")) return;
    try {
      await deletePoll(poll.id);
    } catch {
      setError("지우지 못했어요.");
    }
  }

  return (
    <div className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold text-ink">의견 모으기</h2>
        <span className="shrink-0 text-[12px] font-medium text-ink-faint">
          {opinions.length}개
        </span>
      </div>

      {/*
        물음이 이 카드에서 가장 큰 글씨입니다 (19px — 카드 제목 "투표"보다도 큽니다).
        답하기 전에 읽어야 하는 단 하나가 이것이라, 제목이나 선택지에 눌리면
        안 됩니다. 선관위 화면도 물음만 크게 띄웁니다.
      */}
      <div className="rounded-2xl border border-line px-4 py-5 text-center">
        <p className="text-[19px] leading-relaxed font-bold whitespace-pre-wrap text-ink">
          {poll.question}
        </p>
      </div>

      {/*
        익명이라는 사실을 쓰기 전에 알려줍니다.
        이 안내가 없으면 이름이 붙는 줄 알고 하고 싶은 말을 못 합니다 —
        그 마음을 없애는 것이 이 기능의 전부입니다.
      */}
      <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-faint">
        익명으로 올라갑니다. 누가 썼는지는 운영진도 알 수 없어요.
      </p>

      <form onSubmit={handleSubmit} className="mt-2">
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value.slice(0, OPINION_MAX_LENGTH));
            setError(null);
          }}
          rows={3}
          placeholder="생각을 자유롭게 적어 주세요"
          className={`${inputClassName} resize-none`}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[12px] text-ink-faint tabular-nums">
            {draft.length}/{OPINION_MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!draft.trim() || saving}
            className="rounded-xl bg-brand-500 px-4 py-2 text-[14px]! font-bold text-white transition active:scale-95 disabled:bg-brand-200"
          >
            {saving ? "올리는 중…" : "의견 남기기"}
          </button>
        </div>
      </form>

      {opinions.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {opinions.map((opinion) => (
            <li
              key={opinion.id}
              className="flex items-start gap-2 rounded-2xl bg-canvas px-4 py-3"
            >
              <p className="min-w-0 flex-1 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">
                {opinion.text}
              </p>
              {/* 지우기는 모은 사람과 운영진만. 본인 것만 고를 길은 없습니다. */}
              {canManage ? (
                <button
                  type="button"
                  onClick={() => handleDeleteOpinion(opinion.id)}
                  aria-label="이 의견 지우기"
                  className="shrink-0 text-[12px]! font-bold text-ink-faint active:text-danger"
                >
                  지우기
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="min-w-0 truncate text-[12px] text-ink-faint">
          {poll.createdByName}님이 만듦
        </span>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-3">
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
          </div>
        ) : null}
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
            /* 고를 때와 같습니다 — 테두리와 도장만 빨갛고 바탕은 안 칠합니다. */
            className={`rounded-2xl border-2 px-4 py-3 ${
              on ? "border-red-500" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate text-[15px] font-bold text-ink">
                  {option}
                </span>
                {/* 내가 찍은 자리에만 도장이 남습니다. 고를 때와 같은 표시입니다. */}
                {on ? (
                  <VoteStampIcon
                    className="h-[20px] w-[20px] shrink-0 text-red-500"
                    strokeWidth={2.4}
                  />
                ) : null}
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
                className={`h-full rounded-full ${on ? "bg-red-500" : "bg-ink-faint"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 새로 여는 바텀시트 — 투표와 의견 모으기 둘 중 하나를 고릅니다. */
function PollCreateSheet({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  /** 새 투표가 올라갈 기수 — 지금 홈에 보이는 기수입니다. */
  const { cohort } = useViewCohort();
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);
  const [kind, setKind] = useState<"vote" | "opinion">("vote");
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

    // 고를 것은 투표에만 필요합니다. 의견 모으기는 정해진 답이 없습니다.
    const trimmedOptions =
      kind === "vote" ? options.map((option) => option.trim()).filter(Boolean) : [];

    if (kind === "vote") {
      if (trimmedOptions.length < POLL_MIN_OPTIONS) {
        setError(`고를 것을 ${POLL_MIN_OPTIONS}개 이상 적어 주세요.`);
        return;
      }
      if (new Set(trimmedOptions).size !== trimmedOptions.length) {
        setError("고를 것에 같은 말이 두 번 들어 있어요.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await createPoll({
        cohort,
        kind,
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
      {/*
        손잡이와 내용을 감싸는 바깥 상자. 원우 추가하기 시트와 같은 짜임새입니다 —
        손잡이는 스크롤 바깥에 두고 안쪽 <form>만 따로 스크롤합니다.
        손잡이까지 스크롤 안에 있으면 내용을 내렸을 때 손이 안 닿습니다.
      */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-canvas sm:rounded-[16px]"
        style={sheetStyle}
      >
        {/* 손잡이 바 — 끌어내려 닫을 수 있습니다. */}
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7"
        >
          <h2 className="mb-5 text-[19px] font-bold text-ink">새로 만들기</h2>

          {/*
            무엇을 만들지 먼저 고릅니다. 자료 탭·원우수첩의 서브탭과 같은
            둥근 상자 고르개라, 앱 안에서 "둘 중 하나 고르기"는 늘 같은 모양입니다.
          */}
          <div className="mb-5 flex rounded-xl bg-surface p-1 shadow-[var(--shadow-card)]">
            {(
              [
                { value: "vote", label: "투표" },
                { value: "opinion", label: "의견 모으기" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setKind(value);
                  setError(null);
                }}
                aria-pressed={kind === value}
                className={`flex-1 rounded-lg pt-1.5 pb-2.5 text-[14px]! font-bold transition ${
                  kind === value ? "bg-brand-500 text-white" : "text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <FieldLabel htmlFor="poll-question">무엇을 물어볼까요</FieldLabel>
            <input
              id="poll-question"
              value={question}
              onChange={(changed) => {
                setQuestion(changed.target.value.slice(0, POLL_QUESTION_MAX_LENGTH));
                setError(null);
              }}
              placeholder={
                kind === "vote"
                  ? "예) 수료식 날짜를 언제로 할까요?"
                  : "예) 남은 기간에 바라는 점이 있나요?"
              }
              className={inputClassName}
            />
          </div>

          {kind === "vote" ? (
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
                          setOptions((previous) =>
                            previous.filter((_, at) => at !== index),
                          )
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
          ) : (
            /*
              의견 모으기에는 고를 것이 없습니다. 대신 익명이라는 사실을
              만드는 사람에게 먼저 알려줍니다 — 모아 놓고 "누가 썼는지 보자"가
              안 되는 것을 나중에 알면 곤란합니다.
            */
            <div className="mb-5 rounded-2xl bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                고를 것 없이 원우들이 글로 답합니다.
                <br />
                <b className="font-bold text-ink">누가 썼는지는 아무 데도 남지 않습니다.</b>{" "}
                만든 사람도, 운영진도, 나중에 확인할 수 없어요.
              </p>
            </div>
          )}

          {error ? <FieldError>{error}</FieldError> : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              /*
                shrink-0과 whitespace-nowrap이 꼭 필요합니다.
                옆의 PrimaryButton이 w-full이라 자리를 통째로 요구해서, 이 단추가
                0에 가깝게 눌리며 "취소"가 세로로 접혔습니다.
              */
              className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
            >
              취소
            </button>
            {/* sm — 다른 단추와 한 줄에 서는 크기입니다 (ui.tsx의 size 설명 참고). */}
            <PrimaryButton type="submit" loading={saving} size="sm">
              만들기
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
