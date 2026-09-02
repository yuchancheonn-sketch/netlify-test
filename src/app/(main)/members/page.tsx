"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { SearchIcon, UsersIcon } from "@/components/icons";
import { Badge, EmptyState, ErrorState, Skeleton, inputClassName } from "@/components/ui";
import { formatBirthday } from "@/lib/format";
import { useApprovedMembers, useRoster } from "@/lib/hooks";
import type { MemberType, UserDoc } from "@/lib/types";

type Filter = "all" | MemberType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "general", label: "일반원우" },
  { value: "youth", label: "청년원우" },
];

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반원우",
  youth: "청년원우",
};

export default function MembersPage() {
  const { data: members, loading, error } = useApprovedMembers();
  const roster = useRoster();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<UserDoc | null>(null);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return members.filter((member) => {
      if (filter !== "all" && member.memberType !== filter) return false;
      if (!needle) return true;
      return (
        member.nickname.toLowerCase().includes(needle) ||
        member.name.toLowerCase().includes(needle)
      );
    });
  }, [members, keyword, filter]);

  /**
   * 운영진이 명단에 올려뒀지만 아직 가입하지 않은 원우들.
   * 이름만 흐리게 보여주어 "우리 기수 전체"가 한눈에 들어오게 합니다.
   */
  const notJoinedYet = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return roster.data.filter((entry) => {
      if (entry.linkedUid) return false;
      if (filter !== "all" && entry.memberType !== filter) return false;
      if (!needle) return true;
      return entry.name.toLowerCase().includes(needle);
    });
  }, [roster.data, keyword, filter]);

  return (
    <>
      <PageHeader title="원우 소개" right={<ProfileAvatarButton />} />

      <div className="px-5">
        {/* 검색 */}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름이나 별칭으로 찾기"
            aria-label="원우 검색"
            className={`${inputClassName} pl-12`}
          />
        </div>

        {/* 필터 칩 */}
        <div className="mt-3 flex gap-2">
          {FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-white text-ink-muted shadow-[var(--shadow-card)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 목록 */}
        <div className="mt-5 pb-6">
          {loading ? (
            <ul className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((key) => (
                <li key={key}>
                  <Skeleton className="h-[86px] rounded-3xl" />
                </li>
              ))}
            </ul>
          ) : error ? (
            <ErrorState message={error} />
          ) : visible.length === 0 && notJoinedYet.length === 0 ? (
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title={
                  members.length === 0
                    ? "아직 등록된 원우가 없어요"
                    : "조건에 맞는 원우가 없어요"
                }
                description={
                  members.length === 0
                    ? "원우들이 가입하고 프로필을 채우면 여기에 보입니다."
                    : "검색어나 필터를 바꿔보세요."
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((member) => (
                <li key={member.uid}>
                  <button
                    type="button"
                    onClick={() => setSelected(member)}
                    className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99]"
                  >
                    <Avatar
                      src={member.photoURL}
                      name={member.nickname || member.name}
                      seed={member.uid}
                      size={54}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-bold text-ink">
                          {member.nickname || member.name}
                        </span>
                        <Badge tone={member.memberType === "youth" ? "brand" : "neutral"}>
                          {MEMBER_TYPE_LABEL[member.memberType]}
                        </Badge>
                      </div>
                      <p className="truncate text-[13px] text-ink-faint">{member.name}</p>
                      {member.bio ? (
                        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                          {member.bio}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 명단에는 있지만 아직 가입하지 않은 원우 */}
          {!loading && notJoinedYet.length > 0 ? (
            <section className="mt-8">
              <p className="mb-3 text-[13px] font-bold text-ink-faint">
                아직 가입 전 {notJoinedYet.length}명
              </p>
              <ul className="flex flex-col gap-2.5">
                {notJoinedYet.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-4 rounded-3xl bg-white/70 p-4"
                  >
                    <Avatar
                      name={entry.name}
                      seed={entry.id}
                      size={44}
                      className="opacity-40 grayscale"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink-muted">
                        {entry.name}
                      </p>
                      <p className="text-[12px] text-ink-faint">
                        {MEMBER_TYPE_LABEL[entry.memberType]} · 초대 코드로 가입하면 이어집니다
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {selected ? (
        <MemberDetailSheet member={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

/** 원우 카드를 눌렀을 때 아래에서 올라오는 상세 시트 */
function MemberDetailSheet({
  member,
  onClose,
}: {
  member: UserDoc;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${member.nickname || member.name} 상세 정보`}
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[28px] bg-white px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={member.photoURL}
            name={member.nickname || member.name}
            seed={member.uid}
            size={104}
          />
          <p className="mt-4 text-[22px] font-bold text-ink">
            {member.nickname || member.name}
          </p>
          <p className="text-[15px] text-ink-muted">{member.name}</p>
          <div className="mt-3">
            <Badge tone={member.memberType === "youth" ? "brand" : "neutral"}>
              {MEMBER_TYPE_LABEL[member.memberType]}
            </Badge>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-3 rounded-2xl bg-canvas p-5">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[14px] text-ink-faint">생일</dt>
            <dd className="text-[15px] font-bold text-ink">
              {formatBirthday(
                member.birthdayMonthDay,
                member.birthdayYear,
                member.birthdayYearPublic,
              )}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-[14px] text-ink-faint">한 줄 소개</dt>
            <dd className="text-right text-[15px] leading-relaxed text-ink">
              {member.bio || "아직 소개가 없어요"}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-stone-100 py-4 text-[15px] font-bold text-ink-soft"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
