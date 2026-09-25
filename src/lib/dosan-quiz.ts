/**
 * 홈 "오늘의 OX 퀴즈" — 도산 안창호 선생에 관한 문제(문제 글과 날짜 계산만).
 *
 * 오늘의 도산(quotes.ts)처럼 날짜만으로 오늘 문제를 고릅니다. 같은 날에는 모든
 * 원우가 같은 문제를 보고, **한국 시간 새벽 12시**에 다음 문제로 넘어갑니다
 * (앱을 켜 둔 채여도 그 순간 바뀝니다 — use-kst-day.ts).
 *
 * ★ 정답과 해설은 이 파일에 없습니다 (2026-09-15부터).
 *   이 파일은 앱(브라우저)에도 실려 가서, 정답을 여기 두면 누구나 오늘 정답을 미리 볼 수 있습니다.
 *   맞힌 개수와 기수 안 등수를 매기면서 정답·해설은 서버 전용 lib/dosan-quiz-answers.ts로 옮기고,
 *   채점도 서버(/api/quiz, lib/quiz-server.ts)가 합니다. 앱은 제출한 뒤에야 정답·해설을 받습니다.
 *
 * ★ 문제와 해설은 연도·단체 이름처럼 널리 기록된 사실만 골랐습니다.
 *   말씀을 묻는 문제는 quotes.ts에 옮겨 둔 흥사단 "도산의 말씀" 자료를 따릅니다.
 *
 * O·X가 한쪽으로 몰리지 않게 섞어 두었고, 목록 순서대로 하루 하나씩 돕니다.
 * 문제를 더하거나 고치려면 이 파일과 dosan-quiz-answers.ts를 **함께** 손보세요(id로 짝을 맞춥니다).
 * id는 한 번 정하면 바꾸지 마세요 — 서버에 적힌 답(quizAnswers)이 id로 그 날 문제와 짝을 맞춥니다.
 */

export type OxAnswer = "O" | "X";

export interface DosanQuiz {
  /** 바꾸지 않는 이름표. 서버의 정답(dosan-quiz-answers.ts)·적힌 답과 짝을 맞출 때 씁니다. */
  id: string;
  question: string;
}

/*
 * 따옴표는 둥근 것(‘ ’ “ ”)이 아니라 곧은 것(' ")을 씁니다 (2026-09-25 사용자 "따옴표 모양들이 다 각지게").
 * 새 문제·해설(dosan-quiz-answers.ts)을 적을 때도 같습니다.
 */
export const DOSAN_QUIZZES: DosanQuiz[] = [
  { id: "ho", question: "'도산'은 안창호 선생의 본명이다." },
  { id: "birthplace", question: "안창호 선생은 평안남도에서 태어났다." },
  { id: "daesung", question: "안창호 선생은 평양에 대성학교를 세웠다." },
  { id: "sinminhoe", question: "신민회는 누구나 이름을 걸고 드나들던 공개 단체였다." },
  { id: "heungsadan-founded", question: "흥사단은 미국 샌프란시스코에서 창립되었다." },
  { id: "liberation", question: "안창호 선생은 1945년 광복을 직접 맞이했다." },
  { id: "four-spirits", question: "흥사단의 4대 정신은 무실·역행·충의·용감이다." },
  { id: "osan", question: "평안북도 정주의 오산학교도 안창호 선생이 세운 학교다." },
  {
    id: "kwaejaejeong",
    question: "안창호 선생은 젊은 시절 평양 쾌재정에서 한 연설로 이름을 널리 알렸다.",
  },
  { id: "provisional-president", question: "안창호 선생은 대한민국 임시정부의 초대 대통령이었다." },
  {
    id: "quote-nakmang",
    question: "'낙망은 청년의 죽음이요, 청년이 죽으면 민족이 죽는다'는 도산의 말씀이다.",
  },
  {
    id: "to-america",
    question: "안창호 선생이 처음 미국으로 건너간 것은 3·1 운동이 일어난 뒤였다.",
  },
  { id: "gongnip", question: "공립협회는 안창호 선생이 미국에서 한인들과 함께 만든 단체다." },
  { id: "medal-alive", question: "안창호 선생은 살아 계실 때 건국훈장 대한민국장을 받았다." },
  { id: "dosan-park", question: "선생의 묘소가 있는 도산공원은 서울 강남구에 있다." },
  {
    id: "quote-eolleong",
    question: "'얼렁얼렁이 우리나라를 망하게 했다'는 대성학교 학생들에게 한 훈유다.",
  },
  {
    id: "arrest-1932",
    question: "안창호 선생은 1932년 윤봉길 의거 뒤 상하이에서 일본 경찰에 붙잡혔다.",
  },
  { id: "heungsadan-today", question: "흥사단은 광복 뒤 해체되어 지금은 남아 있지 않다." },
  {
    id: "quote-sarang",
    question: "'서로 사랑하면 살고, 서로 싸우면 죽는다'는 도산이 흥사단우에게 한 말씀이다.",
  },
  {
    id: "cheongnyeon-hakuhoe",
    question: "청년학우회는 안창호 선생이 청년들의 인격 수양을 위해 만든 단체다.",
  },
];

/** 한국 시간 = UTC+9. 서머타임이 없어 늘 9시간입니다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/**
 * 한국 시간으로 "며칠째"인지. 한국 시간 새벽 12시(자정)에 1씩 늘어납니다.
 *
 * 폰의 시간대 설정은 보지 않습니다. 해외에 나가 있는 원우도 한국 날짜로 같은 날
 * 같은 문제를 보고, 한국 자정에 함께 다음 문제로 넘어갑니다. 서버(UTC)에서 불러도 같은 값입니다.
 */
export function kstDayNumber(now: number = Date.now()): number {
  return Math.floor((now + KST_OFFSET_MS) / DAY_MS);
}

/** 다음 한국 자정까지 남은 시간(ms). 켜 둔 화면을 자정에 바꾸는 타이머가 씁니다. */
export function msUntilNextKstMidnight(now: number = Date.now()): number {
  return (kstDayNumber(now) + 1) * DAY_MS - KST_OFFSET_MS - now;
}

/** 그 날의 한국 날짜 "YYYY-MM-DD" — 서버에 적는 답의 날짜 이름표로도 씁니다. */
export function kstDateString(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * 그 날(kstDayNumber)의 문제. 같은 날 접속한 원우들은 모두 같은 문제를 봅니다.
 *
 * ★ day - 1인 이유: 처음에는 폰 시간대의 자정을 UTC 기준 일수로 세었는데, 한국 폰에서
 *   그 값은 한국 날짜보다 하루 작았습니다. 한국 시간으로 바꾸면서(2026-09-11) 순서를
 *   그대로 이어 가려고 1을 뺍니다 — 이미 오늘 문제를 푼 원우가 새 문제를 받지 않도록.
 */
export function quizForDay(day: number): DosanQuiz {
  const count = DOSAN_QUIZZES.length;
  const index = day - 1;
  return DOSAN_QUIZZES[((index % count) + count) % count];
}

/** 오늘의 OX 퀴즈를 처음 낸 날(한국 날짜). 역대 퀴즈는 이 날부터 셉니다. */
export const QUIZ_START_DATE = "2026-09-11";

/**
 * 역대 퀴즈 — 처음 낸 날부터 지금까지 실제로 나왔던 문제를 최근 날부터 (2026-09-11).
 *
 *  - 앞으로 나올 문제는 넣지 않습니다. 넣으면 내일 문제의 정답을 미리 보게 됩니다.
 *  - 오늘 문제는 includeToday일 때만(이 계정이 오늘 문제를 푼 뒤) 넣습니다 — 안 푼 원우에게 정답이 새지 않게.
 *  - 문제는 20개가 돌아가며 나오므로, 같은 문제는 가장 최근에 나온 날 하나만 남깁니다(최대 20개).
 * 정답·해설을 붙이는 일은 서버(lib/quiz-server.ts의 readQuizHistory)가 합니다.
 */
export function pastQuizzes(
  today: number,
  includeToday: boolean,
): { day: number; quiz: DosanQuiz }[] {
  const startDay = Math.floor(Date.parse(`${QUIZ_START_DATE}T00:00:00Z`) / DAY_MS);
  const seen = new Set<string>();
  const items: { day: number; quiz: DosanQuiz }[] = [];
  for (let day = includeToday ? today : today - 1; day >= startDay; day--) {
    const quiz = quizForDay(day);
    if (seen.has(quiz.id)) continue;
    seen.add(quiz.id);
    items.push({ day, quiz });
    if (seen.size === DOSAN_QUIZZES.length) break;
  }
  return items;
}
