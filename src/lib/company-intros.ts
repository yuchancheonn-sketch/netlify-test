import type { CompanyIntroDoc } from "@/lib/types";

/**
 * 홈 "원우 회사" 카드 — 오늘 어느 회사부터 보여줄지.
 *
 * 올라온 회사들을 uid 순으로 세워 두고 한국 날짜(kstDayNumber)로 하루에 한 칸씩 돌립니다.
 * 같은 날엔 모두가 같은 회사를 먼저 보고, n곳이 올라와 있으면 n일에 한 번씩 모두 맨 앞에 섭니다.
 * 새로 올라오면 차례가 한 칸씩 밀리지만, 서로 알리는 자리라 차례가 조금 바뀌어도 괜찮습니다.
 * 카드의 ‹ › 단추는 이 순서를 따라 넘깁니다.
 */
export function orderForDay(entries: CompanyIntroDoc[], day: number): CompanyIntroDoc[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const start = ((day % sorted.length) + sorted.length) % sorted.length;
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}

/**
 * 적은 홈페이지 주소를 저장할 모양으로 바꿉니다.
 * "abc.co.kr"처럼 앞을 빼고 적어도 https://를 붙입니다. 비었으면 "", 주소로 읽을 수 없으면 null.
 *
 * ★ http(s)가 아닌 주소는 받지 않습니다. 누르면 새 창으로 여는 링크라 javascript: 같은 주소가
 *   들어가면 안 됩니다. 앱을 거치지 않은 쓰기는 보안 규칙(url.matches)이 한 번 더 막습니다.
 */
export function normalizeCompanyUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** 카드에 보일 주소 — 앞의 https://·www.와 끝의 /를 뗍니다. */
export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}
