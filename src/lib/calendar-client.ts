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

/** 도산아카데미 새 글을 훑어 일정을 넣게 합니다. 실패해도 조용히 넘어갑니다(다음에 다시). */
export function requestAcademySync(): void {
  void post("/api/calendar/sync").catch(() => {});
}

/** 내 구독 주소 두 가지 — 아이폰·맥 캘린더(webcal)와 구글 캘린더 추가 화면. */
export async function calendarSubscribeLinks(): Promise<{ webcal: string; google: string; https: string }> {
  const { token } = await post<{ token: string }>("/api/calendar/token");
  const https = `${window.location.origin}/api/calendar/feed/${token}.ics`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
