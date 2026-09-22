import "server-only";

import { randomBytes } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { ACADEMY_EVENTS } from "@/lib/academy-calendar-server";
import { cohortOf } from "@/lib/cohort";

/**
 * 원우 폰 캘린더 연동 — 구독 주소(.ics) (2026-09-23 사용자 요청 "원우의 개인폰의 캘린더와 연동").
 *
 * ★ 어떻게 이어지나
 *   아이폰 캘린더·구글 캘린더는 "구독 캘린더" 주소를 받아 몇 시간마다 스스로 다시 읽습니다.
 *   그래서 앱에 일정이 새로 생기거나 바뀌면 폰에도 저절로 따라 들어갑니다(원우가 할 일은 처음 한 번 구독뿐).
 *   거꾸로 폰에서 만든 일정이 앱으로 오지는 않습니다 — 구독 캘린더는 읽기 전용입니다.
 *   다시 읽는 간격은 폰이 정합니다(아이폰 설정 기본 약 1시간~, 구글은 반나절~하루).
 *
 * ★ 비공개 — 캘린더 앱은 로그인을 못 하므로 주소 안의 추측할 수 없는 열쇠(calendarTokens/{열쇠})로 원우를 알아봅니다.
 *   원우마다 열쇠가 따로이고, 막힌 원우의 주소는 빈 캘린더를 돌려줍니다. calendarTokens는 서버만 읽고 씁니다
 *   (firestore.rules에 적지 않음 = 앱에서 막힘). 원우수첩에서 누구나 읽는 users 문서에 열쇠를 두지 않은 이유입니다.
 *
 * 담는 일정: 그 원우 기수의 모임 일정(events) + 도산아카데미 일정(academyEvents). 오늘 기준 60일 전부터.
 */

export const CALENDAR_TOKENS = "calendarTokens";

/** 원우의 구독 열쇠 — 있으면 그것, 없으면 새로 만듭니다. */
export async function calendarTokenFor(db: Firestore, uid: string): Promise<string> {
  const existing = await db.collection(CALENDAR_TOKENS).where("uid", "==", uid).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;
  const token = randomBytes(24).toString("hex");
  await db.collection(CALENDAR_TOKENS).doc(token).set({ uid, createdAt: FieldValue.serverTimestamp() });
  return token;
}

interface FeedEvent {
  uid: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

/** iCalendar 글자 — 역슬래시·쉼표·쌍반점·줄바꿈을 막습니다. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** 한 줄은 75바이트까지 — 넘으면 줄을 접고 다음 줄을 빈칸으로 시작합니다(RFC 5545). 한글은 3바이트. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

const compactDate = (date: string) => date.replace(/-/g, "");
const compactTime = (time: string) => `${time.replace(":", "")}00`;

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

/** 끝 시각이 없으면 시작 두 시간 뒤로 둡니다. 자정을 넘기면 23:59. */
function defaultEnd(start: string): string {
  const [hour, minute] = start.split(":").map(Number);
  const end = Math.min(hour * 60 + minute + 120, 23 * 60 + 59);
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

function eventLines(event: FeedEvent, stamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${stamp}`];
  if (/^\d{2}:\d{2}$/.test(event.startTime)) {
    const end = /^\d{2}:\d{2}$/.test(event.endTime) && event.endTime > event.startTime
      ? event.endTime
      : defaultEnd(event.startTime);
    lines.push(
      `DTSTART;TZID=Asia/Seoul:${compactDate(event.date)}T${compactTime(event.startTime)}`,
      `DTEND;TZID=Asia/Seoul:${compactDate(event.date)}T${compactTime(end)}`,
    );
  } else {
    // 시각을 모르면 하루 종일 일정으로.
    lines.push(
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
    );
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push("END:VEVENT");
  return lines;
}

/** 열쇠에 맞는 원우의 캘린더(.ics 글자). 열쇠가 틀리면 null. */
export async function buildCalendarFeed(db: Firestore, token: string, host: string): Promise<string | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const tokenDoc = await db.collection(CALENDAR_TOKENS).doc(token).get();
  const uid = tokenDoc.get("uid");
  if (typeof uid !== "string") return null;

  const user = await db.collection("users").doc(uid).get();
  const approved = user.get("status") === "approved";
  const cohort = cohortOf(user.get("cohort") as string | undefined);

  const from = new Date(Date.now() + 9 * 3600_000 - 60 * 86_400_000).toISOString().slice(0, 10);
  const events: FeedEvent[] = [];
  if (approved) {
    const [cohortEvents, academyEvents] = await Promise.all([
      db.collection("events").where("date", ">=", from).get(),
      db.collection(ACADEMY_EVENTS).where("date", ">=", from).get(),
    ]);
    for (const doc of cohortEvents.docs) {
      // 기수 칸이 없는 옛 일정은 10기로 봅니다(lib/cohort.ts의 inCohort와 같은 규칙).
      if (cohortOf(doc.get("cohort") as string | undefined) !== cohort) continue;
      events.push({
        uid: `event-${doc.id}@${host}`,
        title: String(doc.get("title") ?? ""),
        date: String(doc.get("date") ?? ""),
        startTime: String(doc.get("startTime") ?? ""),
        endTime: String(doc.get("endTime") ?? ""),
        location: String(doc.get("location") ?? ""),
        description: String(doc.get("description") ?? ""),
      });
    }
    for (const doc of academyEvents.docs) {
      events.push({
        uid: `academy-${doc.id}@${host}`,
        title: `[도산아카데미] ${String(doc.get("title") ?? "")}`,
        date: String(doc.get("date") ?? ""),
        startTime: String(doc.get("startTime") ?? ""),
        endTime: String(doc.get("endTime") ?? ""),
        location: String(doc.get("location") ?? ""),
        description: String(doc.get("link") ?? ""),
      });
    }
  }

  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//aegiaeta//calendar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`애기애타 ${cohort}`)}`,
    "X-WR-TIMEZONE:Asia/Seoul",
    // 다시 읽기 간격 제안(한 시간). 따르는지는 캘린더 앱마다 다릅니다.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Seoul",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0900",
    "TZOFFSETTO:+0900",
    "TZNAME:KST",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events.filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date)).flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
