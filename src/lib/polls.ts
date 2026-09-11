"use client";

/**
 * 투표·의견 모으기를 열고, 표·의견을 넣고, 닫는 일.
 *
 * ★ 투표는 무기명입니다 (2026-09-11) — 누가 무엇을 골랐는지 어디에도 남지 않습니다.
 *     polls/{투표}/tally/counts   자리마다 표 수만 적힌 문서 하나 (원우 누구나 읽음)
 *     polls/{투표}/voters/{uid}   "이 사람은 이미 넣었다"는 표시만 — 무엇을 골랐는지는 없음 (본인만 읽음)
 *   표를 넣을 때는 이 둘을 한 트랜잭션으로 씁니다. 보안 규칙이 "voters 표시가 새로 생기는 그 쓰기에서만
 *   tally의 한 자리가 정확히 1 늘 수 있다"를 확인하므로, 한 사람이 두 표를 넣을 길이 없습니다.
 *   Firebase 콘솔을 열어도 사람과 고른 자리를 이을 방법이 없습니다.
 *
 *   대신 넣은 뒤에는 **바꿀 수 없습니다.** 어느 자리에서 1을 빼야 할지 서버도 모르기 때문입니다.
 *   그래서 화면이 넣기 전에 한 번 묻고, 내가 고른 자리는 내 폰에만 기억합니다(lib/use-vote-choice.ts).
 *
 *   예전에는 polls/{투표}/votes/{uid}에 고른 자리를 적고 원우 누구나 읽게 두었습니다.
 *   화면엔 이름이 안 보여도 데이터로는 누가 무엇을 골랐는지 드러나서 바꿨습니다.
 *   (덤으로 표를 사람 수만큼 읽던 것이 문서 하나로 줄었습니다.)
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { inCohort } from "@/lib/cohort";
import { db } from "@/lib/firebase";
import type { PollDoc, UserDoc } from "@/lib/types";

/**
 * 이 투표가 그 기수의 원우에게 보이는지 — 모든 기수에 올린 것("all")이거나 그 기수의 것.
 * 홈 투표 칸과 역대 투표 화면이 같은 기준을 씁니다.
 */
export function isPollForCohort(poll: PollDoc, cohort: string): boolean {
  return poll.audience === "all" || inCohort(poll, cohort);
}

/** 표 수 문서 자리 — 투표 하나에 하나 */
function tallyRef(pollId: string) {
  return doc(db, "polls", pollId, "tally", "counts");
}

/**
 * 투표를 엽니다. 문서 id를 먼저 뽑아 두는 것은 일정 등록과 같은 이유입니다 —
 * 저장이 늦어도 화면이 곧바로 그 투표를 가리킬 수 있습니다.
 *
 * 투표면 표 수 문서(모두 0)를 같은 묶음으로 함께 만듭니다. 보안 규칙이 "투표를 만든 사람이,
 * 고를 것 수만큼의 0으로" 만드는지 확인합니다. 의견 모으기에는 표 수 문서가 없습니다.
 */
export async function createPoll({
  cohort,
  audience,
  kind,
  question,
  options,
  author,
}: {
  /** 이 투표가 올라갈 기수의 홈 (audience가 "all"이면 만든 기수로만 적어 둡니다) */
  cohort: string;
  /** "cohort": 그 기수만, "all": 모든 기수 */
  audience: "cohort" | "all";
  kind: "vote" | "opinion";
  question: string;
  /** 의견 모으기면 빈 배열입니다. */
  options: string[];
  author: { uid: string; profile: UserDoc | null };
}): Promise<string> {
  const reference = doc(collection(db, "polls"));
  const batch = writeBatch(db);

  batch.set(reference, {
    cohort,
    audience,
    kind,
    question,
    options,
    createdBy: author.uid,
    createdByName: author.profile?.name || author.profile?.nickname || "원우",
    createdAt: serverTimestamp(),
    closed: false,
  });
  if (kind === "vote") {
    batch.set(tallyRef(reference.id), { counts: options.map(() => 0) });
  }

  await batch.commit();
  return reference.id;
}

/**
 * 익명 의견 한 줄을 남깁니다.
 *
 * ★ 누가 썼는지 **적지 않습니다.** 여기서 uid나 이름을 함께 보내면 익명이
 *   아니게 되고, 보안 규칙이 그 쓰기를 거절합니다(text·createdAt 외에는
 *   어떤 칸도 못 넣게 막아 두었습니다). 그래서 익명성이 약속이 아니라
 *   구조로 지켜집니다.
 *
 * 문서 id도 자동으로 만듭니다. uid를 id로 쓰면 목록만 훑어도
 * 누가 무엇을 썼는지 다 드러납니다.
 */
export async function addOpinion({
  pollId,
  text,
}: {
  pollId: string;
  text: string;
}): Promise<void> {
  await addDoc(collection(db, "polls", pollId, "opinions"), {
    text,
    createdAt: serverTimestamp(),
  });
}

/**
 * 의견 한 줄을 지웁니다. 모은 사람과 운영진만 할 수 있습니다.
 *
 * 내가 쓴 것만 골라 지우는 길은 없습니다 — 어느 것이 내 것인지 앱도 모르는
 * 것이 익명의 값이기 때문입니다.
 */
export async function deleteOpinion(pollId: string, opinionId: string): Promise<void> {
  await deleteDoc(doc(db, "polls", pollId, "opinions", opinionId));
}

/**
 * 무기명으로 한 표를 넣습니다. 이미 넣었으면 "already-voted" 오류를 던집니다.
 *
 * 트랜잭션 안에서 표 수를 읽어 한 자리만 1 늘리고, 같은 트랜잭션에서 "넣었다" 표시를 만듭니다.
 * 두 사람이 동시에 넣으면 Firestore가 한쪽을 다시 돌려 표가 사라지지 않습니다.
 * 트랜잭션은 서버에 닿아야 끝나므로, 신호가 없으면 오류로 돌아옵니다(대기열에 쌓이지 않음).
 */
export async function castVote({
  pollId,
  uid,
  optionIndex,
}: {
  pollId: string;
  uid: string;
  optionIndex: number;
}): Promise<void> {
  const counts = tallyRef(pollId);
  const voter = doc(db, "polls", pollId, "voters", uid);

  await runTransaction(db, async (transaction) => {
    const [tallySnap, voterSnap] = await Promise.all([
      transaction.get(counts),
      transaction.get(voter),
    ]);
    if (voterSnap.exists()) throw new Error("already-voted");
    if (!tallySnap.exists()) throw new Error("no-tally");

    const next = [...((tallySnap.get("counts") as number[] | undefined) ?? [])];
    if (optionIndex < 0 || optionIndex >= next.length) throw new Error("bad-option");
    next[optionIndex] += 1;

    transaction.update(counts, { counts: next });
    // 무엇을 골랐는지는 적지 않습니다 — 넣었다는 시각만.
    transaction.set(voter, { votedAt: serverTimestamp() });
  });
}

/** 투표를 닫습니다. 결과는 남고 더는 넣을 수 없습니다. */
export async function closePoll(pollId: string): Promise<void> {
  await updateDoc(doc(db, "polls", pollId), { closed: true });
}

/**
 * 투표를 통째로 지웁니다.
 *
 * ★ 표 수(tally)·넣었다 표시(voters)·의견(opinions)은 함께 지워지지 않습니다.
 *   Firestore는 문서를 지워도 그 아래 하위 컬렉션을 남겨 둡니다. 투표 문서가 없으면
 *   화면에는 아무것도 안 나오므로 실제로는 문제가 없고, 남은 것은 콘솔에서 한 번에 치울 수 있습니다.
 */
export async function deletePoll(pollId: string): Promise<void> {
  await deleteDoc(doc(db, "polls", pollId));
}

/** 전체 표 수 — 몇 명이 넣었는지와 같습니다. */
export function sumCounts(counts: number[]): number {
  return counts.reduce((sum, count) => sum + count, 0);
}

/** 전체 표 가운데 이 자리가 차지하는 비율(0~100). 표가 없으면 0. */
export function votePercent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
