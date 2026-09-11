"use client";

/**
 * 투표를 열고, 표를 넣고, 닫는 일.
 *
 * 표는 polls/{투표}/votes/{uid} 에 한 사람당 한 문서로 담습니다.
 * 개수를 투표 문서에 세어 두지 않는 이유는, 그 숫자를 브라우저가 올리게 하면
 * 아무나 늘릴 수 있기 때문입니다. 규칙으로는 "1만큼 늘었는지"까지 검사할 수 없고,
 * 원우가 쉰 명 남짓이라 표 문서를 그대로 세는 편이 정확하고 충분히 쌉니다.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
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

/**
 * 투표를 엽니다. 문서 id를 먼저 뽑아 두는 것은 일정 등록과 같은 이유입니다 —
 * 저장이 늦어도 화면이 곧바로 그 투표를 가리킬 수 있습니다.
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

  await setDoc(reference, {
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
 * 문서 id도 자동으로 만듭니다. 표(votes)처럼 uid를 id로 쓰면 목록만 훑어도
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
 * 표를 넣습니다. 이미 넣었으면 그 표를 바꿉니다.
 *
 * 문서 id가 uid라서 따로 "이미 넣었나"를 찾아보지 않아도 됩니다 —
 * setDoc이 있으면 덮고 없으면 만듭니다. 표가 두 개로 늘어날 길이 없습니다.
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
  await setDoc(doc(db, "polls", pollId, "votes", uid), {
    uid,
    optionIndex,
    votedAt: serverTimestamp(),
  });
}

/** 투표를 닫습니다. 결과는 남고 더는 고칠 수 없습니다. */
export async function closePoll(pollId: string): Promise<void> {
  await updateDoc(doc(db, "polls", pollId), { closed: true });
}

/**
 * 투표를 통째로 지웁니다.
 *
 * ★ 표(votes)는 함께 지워지지 않습니다.
 *   Firestore는 문서를 지워도 그 아래 하위 컬렉션을 남겨 둡니다. 브라우저에서
 *   표를 모두 지우려면 사람 수만큼 쓰기가 나가고, 중간에 끊기면 반만 지워집니다.
 *   투표 문서가 없으면 화면에는 아무것도 안 나오므로 실제로는 문제가 없고,
 *   남은 표는 콘솔에서 한 번에 치울 수 있습니다.
 */
export async function deletePoll(pollId: string): Promise<void> {
  await deleteDoc(doc(db, "polls", pollId));
}

/** 표를 세어 자리마다 몇 표인지. 배열 길이는 options와 같습니다. */
export function countVotes(
  poll: PollDoc,
  votes: { optionIndex: number }[],
): number[] {
  const counts = poll.options.map(() => 0);
  for (const vote of votes) {
    // 투표를 만든 뒤 고를 것이 줄었을 수도 있어 범위를 확인합니다.
    if (vote.optionIndex >= 0 && vote.optionIndex < counts.length) {
      counts[vote.optionIndex] += 1;
    }
  }
  return counts;
}

/** 전체 표 가운데 이 자리가 차지하는 비율(0~100). 표가 없으면 0. */
export function votePercent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
