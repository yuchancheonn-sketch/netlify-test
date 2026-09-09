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
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PollDoc, UserDoc } from "@/lib/types";

/**
 * 투표를 엽니다. 문서 id를 먼저 뽑아 두는 것은 일정 등록과 같은 이유입니다 —
 * 저장이 늦어도 화면이 곧바로 그 투표를 가리킬 수 있습니다.
 */
export async function createPoll({
  question,
  options,
  author,
}: {
  question: string;
  options: string[];
  author: { uid: string; profile: UserDoc | null };
}): Promise<string> {
  const reference = doc(collection(db, "polls"));

  await setDoc(reference, {
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
