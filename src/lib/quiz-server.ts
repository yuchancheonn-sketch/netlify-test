import "server-only";

import { FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
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
 * ★ 등수 = 1 + (같은 기수에서 나보다 많이 맞힌 원우 수). 같은 수면 같은 등수이고, 화면에는 "공동" 없이
 *   그 등수만 적습니다(2026-09-15 사용자 요청 — 공동 1등도 "1등"). 10등 안일 때만 보냅니다(RANK_SHOWN_UP_TO).
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

/** users/{uid} 문서에서 지금 기수("10기" 등)를 꺼냅니다. 승인된 원우가 아니면 null. */
function cohortIn(snap: DocumentSnapshot): string | null {
  if (!snap.exists || snap.get("status") !== "approved") return null;
  return cohortOf(snap.get("cohort") as string | undefined);
}

/** 승인된 원우면 지금 기수, 아니면 null. 차단된 사람은 퀴즈를 풀거나 성적을 볼 수 없습니다. */
async function memberCohort(db: Firestore, uid: string): Promise<string | null> {
  return cohortIn(await db.collection("users").doc(uid).get());
}

/**
 * 내 성적과 기수 안 등수. 한 번도 안 풀었으면 null.
 * quizScores/{uid}는 부르는 쪽에서 다른 조회와 함께 미리 받아 넘깁니다(readQuizStatus 주석 참고).
 */
async function readStats(
  db: Firestore,
  uid: string,
  cohort: string,
  scoreSnap: DocumentSnapshot,
): Promise<QuizStats | null> {
  if (!scoreSnap.exists) return null;

  const correct = Number(scoreSnap.get("correct") ?? 0);
  const answered = Number(scoreSnap.get("answered") ?? 0);

  // 프로필에서 기수를 바꾼 원우는 새 기수의 등수에 들어가도록 맞춰 둡니다.
  // 이 쓰기가 끝나기를 기다릴 필요는 없습니다 — 아래 등수 계산은 새 기수로 질의하고,
  // 질의 결과에 내가 아직 없을 수 있는 것은 includesMe가 보정합니다. 그래서 같이 보냅니다.
  const syncCohort =
    cohortOf(scoreSnap.get("cohort") as string | undefined) !== cohort
      ? scoreSnap.ref.update({ cohort })
      : null;

  // select("correct") — 같은 기수 원우들의 맞힌 수만 받습니다(기수당 수십 건).
  const [peers] = await Promise.all([
    db.collection(SCORES).where("cohort", "==", cohort).select("correct").get(),
    syncCohort,
  ]);
  let higher = 0;
  for (const peer of peers.docs) {
    const peerCorrect = peer.id === uid ? correct : Number(peer.get("correct") ?? 0);
    if (peerCorrect > correct) higher += 1;
  }
  // 방금 기수를 맞춘 경우 질의 결과에 내가 아직 안 들어 있을 수 있어, 참여 수에 나를 꼭 넣습니다.
  const includesMe = peers.docs.some((peer) => peer.id === uid);

  // 10등 안일 때만 등수를 알려 줍니다(2026-09-15 사용자 요청). 11등부터는 앱에 등수 숫자 자체를 보내지 않습니다.
  const rank = higher + 1;
  const shown = rank <= RANK_SHOWN_UP_TO;
  return {
    correct,
    answered,
    cohort,
    rank: shown ? rank : null,
    participants: peers.size + (includesMe ? 0 : 1),
  };
}

/** 카드에 등수를 보여주는 마지막 등수 — 이보다 아래면 맞힌 문제 수만 보입니다(동점으로 공동 10등이면 보임). */
const RANK_SHOWN_UP_TO = 10;

/** 오늘 문제를 풀었는지(풀었으면 정답·해설까지)와 내 성적. 승인된 원우가 아니면 null. */
export async function readQuizStatus(db: Firestore, uid: string): Promise<QuizStatus | null> {
  const day = kstDayNumber();
  const date = kstDateString(day);
  const quiz = quizForDay(day);

  /*
   * 세 문서는 uid와 오늘 날짜만 있으면 되므로 서로를 기다릴 이유가 없습니다.
   * 예전에는 차례로 await 해서 왕복이 네 번(≈1초)이었는데, 한 번에 보내고 기수가 나와야만
   * 할 수 있는 등수 질의만 뒤에 두어 두 번(≈0.5초)으로 줄였습니다 (2026-09-22).
   */
  const [memberSnap, answerSnap, scoreSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection(ANSWERS).doc(answerDocId(uid, date)).get(),
    db.collection(SCORES).doc(uid).get(),
  ]);

  const cohort = cohortIn(memberSnap);
  if (!cohort) return null;

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

  return { quizId: quiz.id, date, today, stats: await readStats(db, uid, cohort, scoreSnap) };
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
  const day = kstDayNumber();
  // 여기도 두 조회가 서로 기대지 않아 한 번에 보냅니다 (2026-09-22).
  const [memberSnap, todaySnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection(ANSWERS).doc(answerDocId(uid, kstDateString(day))).get(),
  ]);
  if (!cohortIn(memberSnap)) return null;
  const answeredToday = todaySnap.exists;

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
