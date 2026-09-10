"use client";

/**
 * 수업 느낀점 댓글을 쓰고 지우는 일.
 *
 * 댓글은 sessions/{문서}/comments/{id} 에 담고, 그 주 문서의 commentCount를
 * 함께 올리고 내립니다. 홈의 수업 기록 줄이 "댓글 3"을 보여주려면 그 값이
 * 필요한데, 없으면 홈을 열 때마다 열 주치 댓글을 전부 세어야 합니다.
 *
 * 수업 기록은 기수마다 따로라 문서 id에 기수가 들어갑니다 (lib/cohort.ts의 sessionDocId).
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { sessionDocId } from "@/lib/cohort";
import { db } from "@/lib/firebase";
import type { SessionCommentDoc, SessionPeriod, UserDoc } from "@/lib/types";

/** 답글은 한 겹만 둡니다 — 답글에 단 답글도 같은 원 댓글에 매답니다. */
export function rootCommentId(
  comments: SessionCommentDoc[],
  target: SessionCommentDoc,
): string {
  if (!target.parentId) return target.id;
  // 원 댓글이 지워졌더라도 매달 곳은 있어야 하므로 parentId를 그대로 씁니다.
  return comments.some((comment) => comment.id === target.parentId)
    ? target.parentId
    : target.id;
}

/**
 * 댓글(또는 답글)을 남깁니다.
 *
 * commentCount는 increment로 올립니다. 지금 값을 읽어 1을 더해 쓰면, 두 사람이
 * 같은 순간에 달았을 때 하나가 묻힙니다. increment는 서버가 더해주므로 그럴
 * 일이 없습니다. merge로 쓰는 이유는 아직 그 주 문서가 없을 수도 있어서입니다
 * (주제를 아무도 안 적은 주에 댓글이 먼저 달릴 수 있습니다).
 */
export async function addSessionComment({
  cohort,
  week,
  period,
  author,
  text,
  parentId,
}: {
  cohort: string;
  week: number;
  period: SessionPeriod;
  author: { uid: string; profile: UserDoc | null };
  text: string;
  parentId: string | null;
}): Promise<void> {
  const sessionId = sessionDocId(cohort, week);

  await addDoc(collection(db, "sessions", sessionId, "comments"), {
    text,
    authorId: author.uid,
    authorName: author.profile?.name || author.profile?.nickname || "원우",
    parentId,
    period,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "sessions", sessionId),
    { week, commentCount: increment(1) },
    { merge: true },
  );
}

/**
 * 내 댓글을 지웁니다. 답글이 달려 있어도 그 답글은 남습니다 —
 * 화면에서 "지워진 댓글"로 자리만 지키고, 오간 답글은 읽을 수 있게 둡니다.
 */
export async function deleteSessionComment({
  cohort,
  week,
  commentId,
}: {
  cohort: string;
  week: number;
  commentId: string;
}): Promise<void> {
  const sessionId = sessionDocId(cohort, week);

  await deleteDoc(doc(db, "sessions", sessionId, "comments", commentId));
  await setDoc(
    doc(db, "sessions", sessionId),
    { week, commentCount: increment(-1) },
    { merge: true },
  );
}
