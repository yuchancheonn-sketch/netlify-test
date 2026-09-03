/** 날짜·시간을 한국어로 보기 좋게 바꾸는 함수 모음 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * "YYYY-MM-DD" 문자열을 현지 시간 기준 Date로 바꿉니다.
 * new Date("2026-09-06")은 UTC로 해석되어 시간대에 따라 하루가 밀릴 수 있어
 * 직접 잘라서 만듭니다.
 */
export function parseDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 오늘 날짜를 "YYYY-MM-DD" 문자열로 */
export function todayString(): string {
  return toDateString(new Date());
}

/** Date를 "YYYY-MM-DD" 문자열로 */
export function toDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-09-06" → "9월 6일 (일)" */
export function formatMonthDay(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

/** "2026-09-06" → "2026.09.06" */
export function formatDotDate(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

/** "15:00" → "오후 3:00" */
export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  const meridiem = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${displayHour}:${minute}`;
}

/**
 * 오늘로부터 며칠 남았는지. 오늘이면 0, 지났으면 음수.
 * 시각은 무시하고 날짜만 비교합니다.
 */
export function daysUntil(value: string): number | null {
  const target = parseDateString(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** D-day 배지에 쓸 문구. 예: "D-4", "D-DAY", "지난 일정" */
export function ddayLabel(value: string): string {
  const diff = daysUntil(value);
  if (diff === null) return "";
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return "지난 일정";
}

/** 생일 표시. 연도가 비공개면 월·일만 보여줍니다. */
export function formatBirthday(
  monthDay: string,
  year: number | null,
  yearPublic: boolean,
): string {
  const match = /^(\d{2})-(\d{2})$/.exec(monthDay);
  if (!match) return "생일 미입력";
  const label = `${Number(match[1])}월 ${Number(match[2])}일`;
  return year && yearPublic ? `${year}년 ${label}` : label;
}

/**
 * 휴대폰 번호를 보기 좋게. 예: "01012345678" → "010-1234-5678"
 * 숫자가 아닌 글자는 지우고, 알아보지 못하는 형태면 입력한 그대로 둡니다.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^01\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (/^01\d{7}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}

/**
 * 입력하는 동안 실시간으로 모양을 잡아줍니다.
 *
 * 숫자만 남긴 뒤 자리 수에 맞춰 붙임표를 넣습니다. 네 번째 숫자를 치면
 * 앞에 붙임표가 따라 들어오고, 지워서 세 자리가 되면 붙임표도 함께 사라집니다.
 * (붙임표를 따로 지울 필요가 없습니다.)
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 전화 걸기·문자 보내기 링크에 쓸 번호 (숫자만) */
export function phoneHref(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

/** 채팅 말풍선 옆 시각. 예: "오후 3:21" */
export function formatClockTime(date: Date): string {
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${displayHour}:${minute}`;
}

/** 채팅 날짜 구분선. 예: "2026년 8월 30일 (일)" */
export function formatDateDivider(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${
    WEEKDAYS[date.getDay()]
  })`;
}

/** 같은 날인지 비교 (채팅 날짜 구분선을 넣을 위치를 정할 때 사용) */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 시간대에 맞춘 인사말 */
export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "늦은 밤이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

export { WEEKDAYS };
