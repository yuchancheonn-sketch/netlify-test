/**
 * 도산아카데미 게시물에서 일정(날짜·시간·장소)을 읽어 냅니다 (2026-09-23 사용자 요청 —
 * "도산 아카데미에서 올라오는 새 게시물들의 일정들을 파악해서 스스로 캘린더에 일정 추가").
 *
 * 읽는 곳은 글 페이지의 <meta name="description"> — 아임웹이 본문 앞부분을 글자만으로 담아 둡니다.
 * 행사 안내 글은 모두 "일시"·"장소" 줄이 있습니다. 2026-09 기준 모양 셋:
 *   LBT            ▶일시 : 9월 19일(토) 오후 2시 ~ 4시 30분▶장소 : 흥사단 본부 강당(3층)(종로구 대학로 122)▶참가비 …
 *   리더십 포럼     *일시: 2026년 10월 21일(수), 아침 7시*장소: 몬드리안 서울 이태원 …*주제: …
 *   스마트포럼      ▶일시: 2026. 10. 2(금), 저녁 6시 30분 (저녁 6시 간식 제공)▶장소: 시스원 마곡사옥 …
 * "일시" 줄이 없는 글(공모·보고서·과정 모집 안내)은 일정이 아니라고 보고 건너뜁니다.
 * 모양이 바뀌어 못 읽으면 조용히 건너뜁니다 — 틀린 일정을 넣느니 빠뜨리는 편이 낫습니다.
 */

export interface DosanSchedule {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm", 모르면 "" */
  startTime: string;
  /** "HH:mm", 모르면 "" */
  endTime: string;
  location: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 줄 머리표 — 다음 항목이 시작되는 자리. 여기서 "일시"·"장소" 값이 끝납니다. */
const ITEM_BREAK = /[▶*※●■◆♤♠&]|\s-\s|주제\s*:|발표\s*:|특강\s*:|참가비\s*:/;

/** "일시 : …" 처럼 이름 뒤 값을 다음 머리표 앞까지 꺼냅니다. */
function field(text: string, name: string): string {
  const match = new RegExp(`${name}\\s*[:：]\\s*([^]*)`).exec(text);
  if (!match) return "";
  const rest = match[1];
  const end = rest.search(ITEM_BREAK);
  return (end >= 0 ? rest.slice(0, end) : rest).replace(/\s+/g, " ").trim();
}

/** "오후 2시", "저녁 6시 30분", "아침 7시", "18:30" → 분. 앞의 때(오전/오후)가 없으면 fallbackPm을 따릅니다. */
function parseClock(raw: string, fallbackPm: boolean | null): { minutes: number; pm: boolean } | null {
  const colon = /(\d{1,2}):(\d{2})/.exec(raw);
  if (colon) {
    const hour = Number(colon[1]);
    return { minutes: hour * 60 + Number(colon[2]), pm: hour >= 12 };
  }
  const match = /(오전|오후|아침|저녁|밤|낮|새벽)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/.exec(raw);
  if (!match) return null;
  let hour = Number(match[2]);
  const minute = match[3] ? Number(match[3]) : match[4] ? 30 : 0;
  const period = match[1];
  const pm =
    period === "오후" || period === "저녁" || period === "밤"
      ? true
      : period === "낮"
        ? hour < 7
        : period
          ? false
          : (fallbackPm ?? hour < 8); // 때가 안 적힌 "2시"는 낮으로 봅니다.
  if (pm && hour < 12) hour += 12;
  if (!pm && hour === 12) hour = 0;
  return { minutes: hour * 60 + minute, pm };
}

const toHHmm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

/**
 * @param description 글의 meta description (엔티티를 푼 글자)
 * @param publishedDate 글을 올린 날 "YYYY-MM-DD" — "9월 19일"처럼 해가 빠진 날짜의 해를 정합니다.
 */
export function parseDosanSchedule(description: string, publishedDate: string): DosanSchedule | null {
  const when = field(description, "일시");
  if (!when) return null;

  // 날짜 — "2026년 10월 21일" / "2026. 10. 2" / "9월 19일"
  let year = 0;
  let month = 0;
  let day = 0;
  const full = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(when);
  const dotted = /(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})/.exec(when);
  const short = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(when);
  const dateMatch = full ?? dotted ?? short;
  if (full) [year, month, day] = [Number(full[1]), Number(full[2]), Number(full[3])];
  else if (dotted) [year, month, day] = [Number(dotted[1]), Number(dotted[2]), Number(dotted[3])];
  else if (short) {
    month = Number(short[1]);
    day = Number(short[2]);
    const [pubYear, pubMonth] = publishedDate.split("-").map(Number);
    if (!pubYear) return null;
    // 12월에 올린 "1월 ○일" 안내는 다음 해입니다.
    year = pubMonth && month < pubMonth - 6 ? pubYear + 1 : pubYear;
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // 시간 — 날짜 바로 뒤에서. "~"가 있으면 끝 시각도.
  const afterDate = dateMatch ? when.slice(dateMatch.index + dateMatch[0].length) : "";
  const [startRaw, endRaw = ""] = afterDate.split(/[~〜]/);
  const start = parseClock(startRaw, null);
  const end = start && endRaw ? parseClock(endRaw, start.pm) : null;

  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    startTime: start ? toHHmm(start.minutes) : "",
    endTime: start && end && end.minutes > start.minutes ? toHHmm(end.minutes) : "",
    location: field(description, "장소").replace(/https?:\/\/\S+/g, "").trim().slice(0, 120),
  };
}
