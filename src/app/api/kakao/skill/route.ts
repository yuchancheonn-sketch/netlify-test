import { timingSafeEqual } from "node:crypto";
import { COHORT } from "@/lib/constants";
import { inCohort } from "@/lib/cohort";
import { kstDateString, kstDayNumber, quizForDay } from "@/lib/dosan-quiz";
import { getAdminDb } from "@/lib/firebase-admin";
import { getVideoList } from "@/lib/video-list";

/**
 * 카카오톡 "애기애타" 채널 챗봇의 스킬 서버 (2026-09-22).
 *
 * 카카오 i 오픈빌더의 블록이 이 주소를 부르면(POST), 원우가 보낸 말을 보고 앱의 정보를 답합니다.
 *   "일정"  → 다가오는 모임 3개(제목·날짜·시간)
 *   "퀴즈"  → 오늘의 OX 퀴즈 문제 + 앱에서 풀기 단추
 *   "영상"  → 최신 복습 영상 3편
 *   "앱"    → 앱 주소 · 홈 화면에 추가하는 법
 *   그 밖   → 무엇을 물을 수 있는지 안내 + 바로가기 단추
 * 챗봇은 원우가 먼저 말을 걸 때만 답하므로 카카오 요금이 붙지 않습니다.
 *
 * ★ 이 주소는 누구나 두드릴 수 있어서 두 가지를 지킵니다.
 *   1. 머리글 x-skill-token이 KAKAO_SKILL_TOKEN(Secret Manager)과 같아야 답합니다.
 *      오픈빌더 스킬 설정의 "헤더"에 같은 값을 넣어 둡니다.
 *   2. 채널은 공개라 원우가 아닌 사람도 챗봇에 말을 걸 수 있습니다. 그래서 **공개해도 되는 것만** 답합니다 —
 *      일정은 제목·날짜·시간만(장소·설명은 빼고 "자세한 건 앱에서"), 퀴즈는 문제만(정답·해설은 앱에서 푼 뒤).
 *
 * ★ 카카오는 5초 안에 답이 없으면 실패로 봅니다. 느린 일(유튜브·Firestore)은 3.5초에서 끊고 짧게 답합니다.
 * 응답 모양: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = "https://aegiaeta.web.app";
const SLOW_LIMIT_MS = 3500;

type Output = Record<string, unknown>;
type QuickReply = { label: string; action: "message"; messageText: string };

const MENU: QuickReply[] = ["일정", "퀴즈", "영상", "앱"].map((label) => ({
  label,
  action: "message",
  messageText: label,
}));

function reply(outputs: Output[]) {
  return Response.json(
    { version: "2.0", template: { outputs, quickReplies: MENU } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const text = (value: string): Output => ({ simpleText: { text: value } });

/** 글 + 링크 단추 하나. */
function card(description: string, label: string, url: string, title?: string): Output {
  return {
    textCard: {
      ...(title ? { title } : {}),
      description,
      buttons: [{ action: "webLink", label, webLinkUrl: url }],
    },
  };
}

function withinLimit<T>(work: Promise<T>): Promise<T | null> {
  return Promise.race([
    work.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SLOW_LIMIT_MS)),
  ]);
}

function authorized(request: Request): boolean {
  const expected = process.env.KAKAO_SKILL_TOKEN ?? "";
  const given = request.headers.get("x-skill-token") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09-25" → "9월 25일(금)" */
function koreanDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일(${weekday})`;
}

async function upcomingEvents(): Promise<Output[]> {
  const db = getAdminDb();
  if (!db) return [text("일정을 불러올 수 없어요. 앱에서 확인해 주세요."), card("모임 일정", "앱에서 보기", `${APP_URL}/events`)];

  const today = kstDateString(kstDayNumber());
  const snapshot = await withinLimit(
    db.collection("events").where("date", ">=", today).orderBy("date").limit(20).get(),
  );
  if (!snapshot) return [card("일정을 불러오는 데 시간이 걸려요. 앱에서 확인해 주세요.", "앱에서 보기", `${APP_URL}/events`)];

  const events = snapshot.docs
    .map((doc) => doc.data() as { title?: string; date?: string; startTime?: string; cohort?: string })
    .filter((event) => event.title && event.date && inCohort(event, COHORT))
    .slice(0, 3);
  if (events.length === 0) {
    return [card(`${COHORT}의 다가오는 모임이 아직 없어요.`, "일정 보기", `${APP_URL}/events`)];
  }

  const lines = events.map(
    (event) => `• ${koreanDate(event.date!)}${event.startTime ? ` ${event.startTime}` : ""}\n  ${event.title}`,
  );
  return [
    card(`${lines.join("\n")}\n\n장소와 자세한 내용은 앱에서 볼 수 있어요.`, "앱에서 자세히", `${APP_URL}/events`, "다가오는 모임"),
  ];
}

function todayQuiz(): Output[] {
  const quiz = quizForDay(kstDayNumber());
  return [
    card(`Q. ${quiz.question}\n\n그렇다(O)일까요, 아니다(X)일까요?\n정답과 해설은 앱에서 풀면 바로 보여요.`, "앱에서 풀기", `${APP_URL}/home`, "오늘의 OX 퀴즈"),
  ];
}

async function latestVideos(): Promise<Output[]> {
  const list = await withinLimit(getVideoList());
  const items = list?.items.slice(0, 3) ?? [];
  if (items.length === 0) {
    return [card("영상 목록을 지금 불러오지 못했어요.", "앱에서 보기", `${APP_URL}/news`)];
  }
  return [
    {
      listCard: {
        header: { title: "최신 복습 영상" },
        items: items.map((video) => ({
          title: video.title,
          description: video.date,
          link: { web: `https://www.youtube.com/watch?v=${video.id}` },
        })),
        buttons: [{ action: "webLink", label: "앱에서 더 보기", webLinkUrl: `${APP_URL}/news` }],
      },
    },
  ];
}

function appGuide(): Output[] {
  return [
    card(
      "애기애타 10기 원우 전용 앱이에요.\n\n" +
        "📱 홈 화면에 추가하면 앱처럼 쓰고 알림도 받을 수 있어요.\n" +
        "• 아이폰: 사파리로 열기 → 공유 → 홈 화면에 추가\n" +
        "• 안드로이드: 크롬 → ⋮ → 홈 화면에 추가\n\n" +
        "카카오톡 안에서 열면 '카톡으로 시작하기'로 바로 들어올 수 있어요.",
      "앱 열기",
      APP_URL,
      "애기애타 앱",
    ),
  ];
}

function help(): Output[] {
  return [text("무엇이 궁금하세요? 아래에서 골라 주세요.\n\n일정 · 퀴즈 · 영상 · 앱"), card("바로 들어가기", "앱 열기", APP_URL)];
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    userRequest?: { utterance?: string };
  } | null;
  const said = (payload?.userRequest?.utterance ?? "").replace(/\s+/g, "");

  if (/일정|모임|스케줄|언제/.test(said)) return reply(await upcomingEvents());
  if (/퀴즈|문제|OX|ox/.test(said)) return reply(todayQuiz());
  if (/영상|복습|유튜브|강의/.test(said)) return reply(await latestVideos());
  if (/앱|설치|주소|링크|홈화면/.test(said)) return reply(appGuide());
  return reply(help());
}
