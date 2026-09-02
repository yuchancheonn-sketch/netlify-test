/**
 * 원우수첩 한 권을 만드는 곳.
 *
 * 수첩에는 두 종류의 사람이 섞여 있습니다.
 *  - 앱에 가입해 계정(users 문서)이 있는 원우
 *  - 아직 가입하지 않아 이름만 올라와 있는 원우(roster 문서)
 *
 * 화면에서는 둘을 구분하지 않고 이름 가나다순 한 목록으로 보여주기 때문에,
 * 여기서 같은 모양(DirectoryEntry)으로 맞춰 둡니다.
 */

import type { MemberType, RosterDoc, UserDoc } from "@/lib/types";

export interface DirectoryEntry {
  key: string;
  /** joined: 계정이 있는 원우, waiting: 아직 가입 전 */
  kind: "joined" | "waiting";
  member: UserDoc | null;
  roster: RosterDoc | null;
  name: string;
  nickname: string;
  memberType: MemberType;
  company: string;
  position: string;
  phone: string;
  councilRole: string;
  bio: string;
  photoURL: string | null;
  introduction: string;
  introVideoUrl: string;
  /** 이 항목을 마지막으로 정리한 사람 (본인이면 비어 있는 것과 같게 다룹니다) */
  updatedBy: string;
  updatedByName: string;
}

/** 이름 비교용. 공백 차이 때문에 같은 사람이 둘로 보이지 않게 합니다. */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, "");
}

/** 가입한 원우 문서를 수첩 항목으로 */
function fromMember(member: UserDoc, matched: RosterDoc | null): DirectoryEntry {
  /*
   * 본인이 채운 값이 언제나 우선입니다.
   * 가입 전에 다른 원우가 명단에 적어둔 회사·직책은 본인 칸이 비어 있을 때만 씁니다.
   */
  return {
    key: `user:${member.uid}`,
    kind: "joined",
    member,
    roster: matched,
    name: member.name || member.nickname,
    nickname: member.nickname ?? "",
    memberType: member.memberType,
    company: member.company || matched?.company || "",
    position: member.position || matched?.position || "",
    phone: member.phone || matched?.phone || "",
    councilRole: member.councilRole || matched?.councilRole || "",
    bio: member.bio || matched?.bio || "",
    photoURL: member.photoURL ?? null,
    introduction: member.introduction ?? "",
    introVideoUrl: member.introVideoUrl ?? "",
    updatedBy: member.updatedBy ?? "",
    updatedByName: member.updatedByName ?? "",
  };
}

/** 아직 가입 전인 이름을 수첩 항목으로 */
function fromRoster(entry: RosterDoc): DirectoryEntry {
  return {
    key: `roster:${entry.id}`,
    kind: "waiting",
    member: null,
    roster: entry,
    name: entry.name,
    nickname: "",
    memberType: entry.memberType,
    company: entry.company ?? "",
    position: entry.position ?? "",
    phone: entry.phone ?? "",
    councilRole: entry.councilRole ?? "",
    bio: entry.bio ?? "",
    photoURL: null,
    introduction: "",
    introVideoUrl: "",
    updatedBy: entry.updatedBy ?? "",
    updatedByName: entry.updatedByName ?? "",
  };
}

/**
 * 가입한 원우 + 아직 가입 전인 이름을 이름 가나다순 한 권으로 묶습니다.
 *
 * 운영진이 계정을 연결(linkedUid)해 두지 않았더라도 이름이 같으면 같은 사람으로 보고
 * 한 줄로 합칩니다. 그래야 본인이 가입한 뒤에도 수첩에 두 번 나오지 않습니다.
 */
export function buildDirectory(
  members: UserDoc[],
  roster: RosterDoc[],
): DirectoryEntry[] {
  const rosterByUid = new Map<string, RosterDoc>();
  const rosterByName = new Map<string, RosterDoc>();
  for (const entry of roster) {
    if (entry.linkedUid) rosterByUid.set(entry.linkedUid, entry);
    else rosterByName.set(normalizeName(entry.name), entry);
  }

  const usedRosterIds = new Set<string>();
  const entries: DirectoryEntry[] = members.map((member) => {
    const matched =
      rosterByUid.get(member.uid) ?? rosterByName.get(normalizeName(member.name)) ?? null;
    if (matched) usedRosterIds.add(matched.id);
    return fromMember(member, matched);
  });

  for (const entry of roster) {
    if (entry.linkedUid || usedRosterIds.has(entry.id)) continue;
    entries.push(fromRoster(entry));
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 검색어가 이 항목에 걸리는지 (이름·별칭·회사·직책·직위) */
export function entryMatches(entry: DirectoryEntry, needle: string): boolean {
  if (!needle) return true;
  return [entry.name, entry.nickname, entry.company, entry.position, entry.councilRole]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(needle));
}

/** 카드에 한 줄로 보여줄 "회사 · 직책" */
export function affiliationLine(entry: DirectoryEntry): string {
  return [entry.company, entry.position].filter(Boolean).join(" · ");
}
