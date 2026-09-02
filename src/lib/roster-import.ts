/**
 * 명단을 통째로 붙여넣어 수첩에 올릴 때 쓰는 해석기.
 *
 * 기수 명단은 보통 표(엑셀·한글 문서)로 돌아다니는데, 그걸 그대로 복사해
 * 붙여넣으면 한 사람이 한 줄로 들어옵니다. 줄마다 이름·소속·연락처를 찾아냅니다.
 *
 * 구분 기호는 문서마다 달라서(쉼표, 탭, 여러 칸 띄어쓰기) 셋 다 받아들이고,
 * 줄 앞에 붙은 번호("1.", "12 ")는 버립니다.
 */

export interface ParsedMember {
  name: string;
  /** 회사·소속 (직책까지 한 줄로 들어오는 경우가 많아 나누지 않습니다) */
  company: string;
  /** "010-1234-5678" 형태로 정리한 번호. 없으면 빈 문자열 */
  phone: string;
}

/** 줄 어디에 있든 휴대폰 번호를 찾아냅니다. */
const PHONE_PATTERN = /(01[016-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/;

export function parseRosterText(text: string): ParsedMember[] {
  const seen = new Set<string>();
  const parsed: ParsedMember[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    // 줄 앞 번호와 가운뎃점·괄호 같은 장식을 떼어냅니다.
    let line = rawLine.trim().replace(/^\d{1,3}\s*[.)\]]?\s+/, "");
    if (!line) continue;

    const phoneMatch = PHONE_PATTERN.exec(line);
    const phone = phoneMatch
      ? `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`
      : "";
    if (phoneMatch) line = line.replace(phoneMatch[0], " ");

    /*
     * 이름과 소속을 가릅니다.
     * 쉼표나 탭이 있으면 그걸 경계로 보고, 없으면 첫 낱말을 이름으로 봅니다.
     * (성함 칸이 "홍길동"처럼 붙어 있는 표를 그대로 복사한 경우입니다)
     */
    const columns = line
      .split(/\t|(?<!\()\s*,\s*(?![^(]*\))/)
      .map((part) => part.trim())
      .filter(Boolean);

    let name: string;
    let company: string;

    if (columns.length >= 2) {
      name = columns[0];
      company = columns.slice(1).join(", ");
    } else {
      const spaced = /^(\S+)\s+([\s\S]+)$/.exec(line.trim());
      name = spaced ? spaced[1] : line.trim();
      company = spaced ? spaced[2] : "";
    }

    name = name.replace(/\s+/g, " ").trim();
    company = company.replace(/\s{2,}/g, " ").trim();

    // 이름이 아니라 표의 머리글("구분 성함 소속 연락처")인 줄은 건너뜁니다.
    if (!name || name.length > 20) continue;
    if (/^(구분|성함|이름|소속|연락처|번호|전화)$/.test(name)) continue;

    const key = name.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);

    parsed.push({ name, company, phone });
  }

  return parsed;
}
