import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { cohortOf } from "@/lib/cohort";
import {
  kstDateString,
  kstDayNumber,
  pastQuizzes,
  quizForDay,
  type OxAnswer,
} from "@/lib/dosan-quiz";
import { answerFor } from "@/lib/dosan-quiz-answers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { QuizHistoryItem, QuizStats, QuizStatus } from "@/lib/quiz-types";

/**
 * 오늘의 OX 퀴즈 채점·성적·등수 — 서버 전용 (2026-09-15).
 *
 * ★ 왜 서버에서 하나
 *   맞힌 개수로 기수 안 등수를 매기므로, 앱이 스스로 "맞았다"고 적게 두면 누구든 점수를 꾸밀 수 있습니다.
 *   그래서 정답은 서버에만 두고(dosan-quiz-answers.ts), 앱은 고른 답만 보내며, 서버가 채점해 적습니다.
 *
 * ★ 저장하는 곳 — 둘 다 **서버(Admin SDK)만** 읽고 씁니다.
 *   firestore.rules에 칸을 열지 않았으므로 앱에서는 읽기·쓰기 모두 막혀 있습니다(규칙 콘솔 게시 필요 없음).
 *   - quizAnswers/{uid}_{YYYY-MM-DD}: { uid, date, quizId, answer, correct, cohort, answeredAt }
 *     문서 id에 날짜가 있어 **한 계정 하루 한 번**입니다. 이미 있으면 다시 적지 않습니다(다른 폰에서도).
 *   - quizScores/{uid}: { uid, cohort, correct, answered, lastDate, updatedAt }
 *     답을 적을 때 같은 트랜잭션에서 맞힌 수·푼 수를 1씩 올립니다.
 *
 * ★ 등수 = 1 + (같은 기수에서 나보다 많이 맞힌 원우 수). 같은 수면 같은 등수(공동).
 *   "참여 원우"는 quizScores가 있는(한 번이라도 푼) 같은 기수 원우입니다.
 *   기수는 원우가 프로필에서 바꿀 수 있어, 성적을 읽을 때마다 지금 기수로 맞춰 둡니다.
 *
 * 2026-09-15 전에는 답을 폰(localStorage)에만 적어 두어 서버로 옮길 기록이 없습니다 — 모두 이날부터 0개로 셉니다.
 */

const ANSWERS = "quizAnswers";
const SCORES = "quizScores";

function answerDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

type Authorized = { uid: string; db: Firestore } | { response: Response };

/** 요청을 보낸 원우가 누구인지 로그인 토큰으로 확인합니다. 실패하면 그대로 돌려줄 응답을 줍니다. */
export async function authorizeQuizRequest(request: Request): Promise<Authorized> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return { response: Response.json({ ok: false, reason: "not-configured" }, { status: 503 }) };
  }
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    return { uid: (await auth.verifyIdToken(idToken)).uid, db };
  } catch {
    return { response: Response.json({ ok: false, reason: "unauthorized" }, { status: 401 }) };
  }
}

/** 승인된 원우면 지금 기수("10기" 등), 아니면 null. 차단된 사람은 퀴즈를 풀거나 성적을 볼 수 없습니다. */
async function memberCohort(db: Firestore, uid: string): Promise<string | null> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists || snap.get("status") !== "approved") return null;
  return cohortOf(snap.get("cohort") as string | undefined);
}

/** 내 성적과 기수 안 등수. 한 번도 안 풀었으면 null. */
async function readStats(db: Firestore, uid: string, cohort: string): Promise<QuizStats | null> {
  const scoreRef = db.collection(SCORES).doc(uid);
  const scoreSnap = await scoreRef.get();
  if (!scoreSnap.exists) return null;

  // 프로필에서 기수를 바꾼 원우는 새 기수의 등수에 들어가도록 맞춰 둡니다.
  if (cohortOf(scoreSnap.get("cohort") as string | undefined) !== cohort) {
    await scoreRef.update({ cohort });
  }

  const correct = Number(scoreSnap.get("correct") ?? 0);
  const answered = Number(scoreSnap.get("answered") ?? 0);

  // select("correct") — 같은 기수 원우들의 맞힌 수만 받습니다(기수당 수십 건).
  const peers = await db.collection(SCORES).where("cohort", "==", cohort).select("correct").get();
  let higher = 0;
  let same = 0;
  for (const peer of peers.docs) {
    const peerCorrect = peer.id === uid ? correct : Number(peer.get("correct") ?? 0);
    if (peerCorrect > correct) higher += 1;
    else if (peerCorrect === correct) same += 1;
  }
  // 방금 기수를 맞춘 경우 질의 결과에 내가 아직 안 들어 있을 수 있어, 참여 수에 나를 꼭 넣습니다.
  const includesMe = peers.docs.some((peer) => peer.id === uid);

  return {
    correct,
    answered,
    cohort,
    rank: higher + 1,
    tied: (includesMe ? same : same + 1) > 1,
    participants: peers.size + (includesMe ? 0 : 1),
  };
}

/** 오늘 문제를 풀었는지(풀었으면 정답·해설까지)와 내 성적. 승인된 원우가 아니면 null. */
export async function readQuizStatus(db: Firestore, uid: string): Promise<QuizStatus | null> {
  const cohort = await memberCohort(db, uid);
  if (!cohort) return null;

  const day = kstDayNumber();
  const date = kstDateString(day);
  const quiz = quizForDay(day);

  const answerSnap = await db.collection(ANSWERS).doc(answerDocId(uid, date)).get();
  let today: QuizStatus["today"] = null;
  if (answerSnap.exists) {
    const key = answerFor(String(answerSnap.get("quizId") ?? quiz.id));
    const myAnswer = answerSnap.get("answer") as OxAnswer;
    if (key) {
      today = {
        myAnswer,
        answer: key.answer,
        correct: myAnswer === key.answer,
        explanation: key.explanation,
      };
    }
  }

  return { quizId: quiz.id, date, today, stats: await readStats(db, uid, cohort) };
}

export type SubmitOutcome =
  | { ok: true; status: QuizStatus }
  | { ok: false; reason: "not-member" | "stale-quiz" };

/**
 * 오늘 문제에 답을 적고 채점합니다.
 *
 * - quizId는 앱 화면에 떠 있던 문제입니다. 자정을 넘겨 서버의 오늘 문제와 다르면 적지 않고 stale-quiz를 돌려줍니다
 *   (어제 문제에 고른 답을 오늘 문제 답으로 채점하지 않으려고).
 * - 이미 오늘 답이 있으면 새 답은 버리고 처음 답 그대로 돌려줍니다 — 한 계정 하루 한 번.
 */
export async function submitQuizAnswer(
  db: Firestore,
  uid: string,
  quizId: string,
  answer: OxAnswer,
): Promise<SubmitOutcome> {
  const cohort = await memberCohort(db, uid);
  if (!cohort) return { ok: false, reason: "not-member" };

  const day = kstDayNumber();
  const date = kstDateString(day);
  const quiz = quizForDay(day);
  if (quizId !== quiz.id) return { ok: false, reason: "stale-quiz" };

  const key = answerFor(quiz.id);
  if (!key) throw new Error(`정답이 없는 문제입니다: ${quiz.id}`);
  const correct = answer === key.answer;

  const answerRef = db.collection(ANSWERS).doc(answerDocId(uid, date));
  const scoreRef = db.collection(SCORES).doc(uid);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(answerRef);
    if (existing.exists) return;
    transaction.create(answerRef, {
      uid,
      date,
      quizId: quiz.id,
      answer,
      correct,
      cohort,
      answeredAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      scoreRef,
      {
        uid,
        cohort,
        correct: FieldValue.increment(correct ? 1 : 0),
        answered: FieldValue.increment(1),
        lastDate: date,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const status = await readQuizStatus(db, uid);
  return status ? { ok: true, status } : { ok: false, reason: "not-member" };
}

/**
 * 역대 퀴즈 — 지나간 문제의 정답·해설. 오늘 문제는 이 계정이 오늘 풀었을 때만 넣습니다(정답이 새지 않게).
 * 승인된 원우가 아니면 null.
 */
export async function readQuizHistory(
  db: Firestore,
  uid: string,
): Promise<QuizHistoryItem[] | null> {
  const cohort = await memberCohort(db, uid);
  if (!cohort) return null;

  const day = kstDayNumber();
  const answeredToday = (
    await db.collection(ANSWERS).doc(answerDocId(uid, kstDateString(day))).get()
  ).exists;

  return pastQuizzes(day, answeredToday).flatMap(({ day: quizDay, quiz }) => {
    const key = answerFor(quiz.id);
    if (!key) return [];
    return [
      {
        date: kstDateString(quizDay),
        quizId: quiz.id,
        question: quiz.question,
        answer: key.answer,
        explanation: key.explanation,
      },
    ];
  });
}
