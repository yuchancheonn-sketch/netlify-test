import { auth } from "@/lib/firebase";

/**
 * 홈 캘린더가 서버에 묻는 두 가지 (2026-09-23) — 브라우저 쪽.
 *  - 도산아카데미 새 글 일정 넣기(/api/calendar/sync) — 한 시간에 한 번만 실제로 돕니다.
 *  - 내 폰 캘린더 구독 주소(/api/calendar/token)
 * 서버 쪽 규칙은 lib/academy-calendar-server.ts, lib/calendar-feed-server.ts.
 */

async function post<T>(path: string): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  const response = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return (await response.json()) as T;
}

/**
 * 이 기기에서 폰 캘린더에 연결했는지 (2026-09-23 사용자 "연동을 시켰으면 그 다음에는 버튼 안 보이도록").
 *
 * 폰이 실제로 구독을 마쳤는지는 앱이 알 수 없습니다(캘린더 앱에서 일어나는 일이라). 그래서
 * "연결 단추를 눌러 캘린더 앱으로 넘어갔다"를 기준으로 이 기기에만 적어 둡니다(localStorage).
 * 기기마다 따로이고, 다시 보이게 하려면 브라우저 저장 자료를 지우면 됩니다.
 */
const LINKED_KEY = "calendar-linked";
const listeners = new Set<() => void>();

export function isCalendarLinked(): boolean {
  try {
    return localStorage.getItem(LINKED_KEY) === "yes";
  } catch {
    // 저장할 수 없는 곳(시크릿 모드 등)에서는 늘 단추를 보여 줍니다.
    return false;
  }
}

export function markCalendarLinked(): void {
  try {
    localStorage.setItem(LINKED_KEY, "yes");
  } catch {
    // 저장이 막힌 곳 — 단추가 계속 보일 뿐입니다.
  }
  for (const listener of listeners) listener();
}

export function subscribeCalendarLinked(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 도산아카데미 새 글을 훑어 일정을 넣게 합니다. 실패해도 조용히 넘어갑니다(다음에 다시). */
export function requestAcademySync(): void {
  void post("/api/calendar/sync").catch(() => {});
}

/** 내 구독 주소 두 가지 — 아이폰·맥 캘린더(webcal)와 구글 캘린더 추가 화면. */
export async function calendarSubscribeLinks(): Promise<{ webcal: string; google: string }> {
  const { token } = await post<{ token: string }>("/api/calendar/token");
  const https = `${window.location.origin}/api/calendar/feed/${token}.ics`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
