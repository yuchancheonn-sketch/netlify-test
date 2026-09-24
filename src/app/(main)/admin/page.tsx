"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { CheckIcon, UsersIcon } from "@/components/icons";
import { EmptyState, ErrorState, SectionTitle, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cohortOf } from "@/lib/cohort";
import { db } from "@/lib/firebase";
import { commitWrite } from "@/lib/firestore-commit";
import { useAllUsers, useRoster, useWeeklyDrafts } from "@/lib/hooks";
import type { MemberType, RosterDoc, UserDoc, WeeklyDraftDoc } from "@/lib/types";

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반 원우",
  youth: "대학생 원우",
};

type Tab = "pending" | "roster" | "members" | "newsDraft";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  // 고르기 전에는 null. 막아둔 사람이 있으면 그 탭에서 시작합니다.
  const [tab, setTab] = useState<Tab | null>(null);
  const users = useAllUsers();
  const roster = useRoster();

  const pending = users.data.filter((user) => user.status === "pending");
  const approved = users.data.filter((user) => user.status === "approved");
  const activeTab: Tab = tab ?? (pending.length > 0 ? "pending" : "roster");

  /*
   * 로그인하면 기다림 없이 바로 입장하므로 보통 이 탭은 비어 있습니다.
   * 운영진이 누군가를 차단했을 때만 나타납니다.
   */
  const tabs: { value: Tab; label: string }[] = [
    ...(pending.length > 0
      ? [{ value: "pending" as Tab, label: `확인 대기 ${pending.length}` }]
      : []),
    { value: "roster", label: "원우 명단" },
    { value: "members", label: "권한 관리" },
    // 매주 월요일 저녁 서버가 이번주 원우 소식 링크로 적는 카톡 채널 발송 초안 (2026-09-24).
    { value: "newsDraft", label: "카톡 초안" },
  ];

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="운영진" back />
        <ErrorState message="운영진만 볼 수 있는 화면이에요." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="운영진" eyebrow="가입 승인과 명단 관리" back />

      {/*
        pt-4 — 제목 줄과 탭 알약 사이 16px (2026-09-15 사용자 "좀 아래로 내려줘", 예전엔 0이라 제목 줄에 붙어 보였습니다).
        홈·원우수첩·알림 화면의 첫 칸과 같은 간격입니다.
      */}
      <div className="px-4 pt-4 pb-8">
        <div className="flex rounded-full bg-surface p-1 shadow-[var(--shadow-card)]">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={activeTab === value}
              /* 위 7px + 아래 11px. 위보다 아래가 4px 넓어 글씨가 가운데에서 2px 위에 앉습니다(다른 서브탭과 같은 방식).
                 2026-09-15 사용자 요청으로 8px/12px에서 1px씩 줄여 알약 높이를 2px 낮췄습니다. */
              className={`flex-1 rounded-full pt-[7px] pb-[11px] text-[13px] font-bold transition ${
                activeTab === value ? "bg-brand-500 text-white" : "text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {activeTab === "newsDraft" ? (
            <NewsDraftSection />
          ) : users.error ? (
            <ErrorState message={users.error} />
          ) : users.loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 rounded-3xl" />
              <Skeleton className="h-20 rounded-3xl" />
            </div>
          ) : activeTab === "pending" && pending.length > 0 ? (
            // 마지막 한 명을 확인해주면 이 탭이 사라지므로 명단 탭으로 자연스럽게 넘어갑니다.
            <PendingSection pending={pending} roster={roster.data} />
          ) : activeTab === "members" ? (
            <MembersSection approved={approved} />
          ) : (
            <RosterSection roster={roster} approved={approved} />
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 승인 대기                                                            */
/* ------------------------------------------------------------------ */

function PendingSection({
  pending,
  roster,
}: {
  pending: UserDoc[];
  roster: RosterDoc[];
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(user: UserDoc) {
    setBusyUid(user.uid);
    setError(null);
    // 응답을 잠깐만 기다립니다 — 이유는 lib/firestore-commit.ts에.
    try {
      await commitWrite(updateDoc(doc(db, "users", user.uid), { status: "approved" }));

      /*
       * 미리 등록해 둔 명단에 같은 이름이 있으면 자동으로 이어 붙입니다.
       * 동명이인이 있을 수 있으니 "아직 연결 안 된 항목이 딱 하나"일 때만 연결하고,
       * 여러 개면 명단 탭에서 운영진이 직접 고르게 둡니다.
       */
      const matches = roster.filter(
        (entry) =>
          !entry.linkedUid &&
          cohortOf(entry.cohort) === cohortOf(user.cohort) &&
          entry.name.trim() === user.name.trim(),
      );
      if (matches.length === 1) {
        await commitWrite(
          updateDoc(doc(db, "roster", matches[0].id), { linkedUid: user.uid }),
        );
      }
    } catch {
      setError("승인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyUid(null);
    }
  }

  async function reject(user: UserDoc) {
    if (
      !window.confirm(
        `${user.name || user.email} 님의 계정을 완전히 지울까요?\n지우지 않아도 차단된 동안에는 아무것도 볼 수 없습니다.`,
      )
    ) {
      return;
    }
    setBusyUid(user.uid);
    setError(null);
    try {
      await commitWrite(deleteDoc(doc(db, "users", user.uid)));
    } catch {
      // 규칙에서 users 삭제를 막아두었으므로 안내만 합니다.
      setError(
        "계정 삭제는 보안 규칙에서 막혀 있어요. 그냥 두면 앱에 들어올 수 없고, 완전히 지우려면 Firebase 콘솔에서 해당 문서를 삭제해 주세요.",
      );
    } finally {
      setBusyUid(null);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<CheckIcon className="h-10 w-10" />}
          title="막아둔 계정이 없어요"
          description="로그인하면 바로 입장하기 때문에, 운영진이 차단한 계정만 여기에 표시됩니다."
        />
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {pending.map((user) => (
          <li
            key={user.uid}
            className="rounded-3xl bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={user.photoURL}
                name={user.name || user.email}
                seed={user.uid}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold text-ink">
                  {user.name || "이름 없음"}
                </p>
                <p className="truncate text-[13px] text-ink-faint">{user.email}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={() => approve(user)}
                disabled={busyUid === user.uid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-500 py-3 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {busyUid === user.uid ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <CheckIcon className="h-[18px] w-[18px]" />
                )}
                승인하기
              </button>
              <button
                type="button"
                onClick={() => reject(user)}
                disabled={busyUid === user.uid}
                className="rounded-2xl bg-fill px-5 py-3 text-[15px] font-bold text-ink-muted transition active:scale-[0.98] disabled:opacity-60"
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 원우 명단                                                            */
/* ------------------------------------------------------------------ */

function RosterSection({
  roster,
  approved,
}: {
  roster: { data: RosterDoc[]; loading: boolean; error: string | null };
  approved: UserDoc[];
}) {
  /*
   * ★ "명단에 원우 추가"(이름 붙여넣기 → 기수·구분 골라 roster에 한꺼번에 넣기) 폼은
   *   2026-09-15 사용자 요청으로 기능째 없앴습니다. 1~9기 공식 명단은 이미 Admin SDK로 다 넣었고,
   *   10기 원우 추가는 원우수첩의 "원우 추가하기"(MemberEditSheet)로 합니다.
   *   이 칸에는 등록된 명단 보기·지우기·가입 계정 연결만 남았습니다.
   *   되살리려면 git 기록에서 이 함수의 handleAdd와 추가 폼을 보세요.
   */
  const [error, setError] = useState<string | null>(null);

  const userByUid = useMemo(
    () => new Map(approved.map((member) => [member.uid, member])),
    [approved],
  );

  async function handleRemove(entry: RosterDoc) {
    if (!window.confirm(`명단에서 ${entry.name} 님을 지울까요?`)) return;
    try {
      await deleteDoc(doc(db, "roster", entry.id));
    } catch {
      setError("명단에서 지우지 못했어요.");
    }
  }

  async function handleLink(entry: RosterDoc, uid: string) {
    try {
      await updateDoc(doc(db, "roster", entry.id), { linkedUid: uid || null });
    } catch {
      setError("계정을 연결하지 못했어요.");
    }
  }

  /** 아직 명단의 어느 항목과도 이어지지 않은 가입자 (수동 연결 후보) */
  const linkedUids = new Set(roster.data.map((entry) => entry.linkedUid).filter(Boolean));
  const unlinkedUsers = approved.filter((member) => !linkedUids.has(member.uid));

  return (
    <div className="flex flex-col gap-8">
      {/*
        지우기·계정 연결이 실패했을 때의 알림. 예전엔 위 추가 폼 아래에 떴는데, 폼을 없애며(2026-09-15)
        목록 위로 옮겼습니다.
      */}
      {error ? (
        <p role="alert" className="text-center text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      {/* 명단 목록 */}
      <section>
        <SectionTitle>
          등록된 명단 {roster.data.length > 0 ? `${roster.data.length}명` : ""}
        </SectionTitle>

        {roster.loading ? (
          <Skeleton className="h-20 rounded-3xl" />
        ) : roster.error ? (
          <ErrorState message={roster.error} />
        ) : roster.data.length === 0 ? (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<UsersIcon className="h-10 w-10" />}
              title="아직 등록한 명단이 없어요"
              description="원우수첩의 '원우 추가하기'로 넣은 원우가 여기에 보입니다."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {roster.data.map((entry) => {
              const linked = entry.linkedUid ? userByUid.get(entry.linkedUid) : undefined;
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={linked?.photoURL}
                      name={entry.name}
                      seed={entry.id}
                      size={40}
                      className={linked ? "" : "opacity-45 grayscale"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink">{entry.name}</p>
                      <p className="text-[12px] text-ink-faint">
                        {cohortOf(entry.cohort)} · {MEMBER_TYPE_LABEL[entry.memberType]} ·{" "}
                        {linked ? `가입 완료 (${linked.name})` : "아직 가입 전"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-faint active:bg-fill"
                    >
                      삭제
                    </button>
                  </div>

                  {/*
                    이름이 달라 자동 연결되지 않았거나, 동명이인이라 일부러 잇지 않았을 때
                    직접 이어 붙입니다. 이미 이어진 칸도 바꿀 수 있습니다 — 동명이인이
                    먼저 가입해 남의 칸을 가져간 경우를 바로잡는 길입니다.
                  */}
                  {unlinkedUsers.length > 0 ? (
                    <select
                      aria-label={`${entry.name} 계정 연결`}
                      value=""
                      onChange={(changed) => handleLink(entry, changed.target.value)}
                      className="mt-3 w-full rounded-xl bg-fill px-3 py-2.5 text-[13px] text-ink-muted outline-none"
                    >
                      <option value="">
                        {linked ? "다른 계정으로 바꾸기…" : "가입한 계정과 연결하기…"}
                      </option>
                      {unlinkedUsers.map((member) => (
                        <option key={member.uid} value={member.uid}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 권한 관리                                                            */
/* ------------------------------------------------------------------ */

function MembersSection({ approved }: { approved: UserDoc[] }) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function toggleAdmin(member: UserDoc) {
    const makingAdmin = member.role !== "admin";
    const question = makingAdmin
      ? `${member.name} 님에게 운영진 권한을 줄까요?\n앨범 등록·명단 관리와, 남이 올린 일정 고치기·지우기를 할 수 있게 됩니다.`
      : `${member.name} 님의 운영진 권한을 뺄까요?`;
    if (!window.confirm(question)) return;

    setError(null);
    try {
      await updateDoc(doc(db, "users", member.uid), {
        role: makingAdmin ? "admin" : "member",
      });
    } catch {
      setError("권한을 바꾸지 못했어요.");
    }
  }

  /**
   * 계정 접근을 다시 막습니다.
   * 잘못 확인해준 사람이나 예전에 들어와 있던 계정을 정리하는
   * 마지막 안전장치입니다. status를 pending으로 되돌리면 그 순간부터
   * 원우 명단·채팅·사진 등 모든 데이터가 보이지 않습니다.
   */
  async function blockMember(member: UserDoc) {
    if (
      !window.confirm(
        `${member.name || member.email} 님의 접근을 막을까요?\n앱을 열면 "운영진 확인을 기다리고 있어요" 화면만 보이게 됩니다.\n나중에 다시 풀 수 있어요.`,
      )
    ) {
      return;
    }

    setError(null);
    try {
      await updateDoc(doc(db, "users", member.uid), { status: "pending" });
    } catch {
      setError("접근을 막지 못했어요.");
    }
  }

  if (approved.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState title="승인된 원우가 아직 없어요" />
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {approved.map((member) => {
          const isMe = member.uid === user?.uid;
          return (
            <li
              key={member.uid}
              className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]"
            >
              <Avatar
                src={member.photoURL}
                name={member.name}
                seed={member.uid}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-ink">
                  {member.name}
                  {isMe ? " (나)" : ""}
                </p>
                <p className="truncate text-[12px] text-ink-faint">{member.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleAdmin(member)}
                  // 스스로 운영진 권한을 빼면 아무도 관리할 수 없게 될 수 있어 막아둡니다.
                  disabled={isMe}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition disabled:opacity-45 ${
                    member.role === "admin"
                      ? "bg-brand-50 text-brand-500"
                      : "bg-fill text-ink-muted"
                  }`}
                >
                  {/*
                    운영진이 아닌 원우 옆에는 "운영진 지정" — 누르면 무엇이 되는지 적습니다(2026-09-15 사용자 요청, 예전엔 "원우").
                    이미 운영진인 사람은 "운영진" 그대로(주황). 누르면 확인창 뒤에 권한을 주거나 뺍니다(toggleAdmin).
                  */}
                  {member.role === "admin" ? "운영진" : "운영진 지정"}
                </button>
                {!isMe ? (
                  <button
                    type="button"
                    onClick={() => blockMember(member)}
                    aria-label={`${member.name} 접근 막기`}
                    className="rounded-full px-2.5 py-2 text-[13px] font-bold text-ink-faint transition active:bg-fill"
                  >
                    차단
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 카톡 초안 (2026-09-24)                                               */
/* ------------------------------------------------------------------ */

/**
 * 매주 월요일 18시 서버(/api/news/weekly-close)가 이번주 원우 소식 화면 링크로 적어 둔 초안.
 * 운영진이 "복사하기"로 문구를 복사해 카카오톡 채널 관리자센터 → 소식 글쓰기에 붙여넣습니다.
 * (카카오 비즈니스 메시지로 자동 발송하는 길은 건당 비용이 들어 쓰지 않습니다 — 2026-09-24 사용자 선택.)
 */
function NewsDraftSection() {
  const drafts = useWeeklyDrafts();

  if (drafts.error) return <ErrorState message={drafts.error} />;
  if (drafts.loading) return <Skeleton className="h-40 rounded-3xl" />;
  if (drafts.data.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<span className="text-[40px]">💬</span>}
          title="아직 초안이 없어요"
          description="매주 월요일 저녁 6시, 이번 주(화~월) 원우 소식 링크로 여기에 초안을 만들어 둡니다."
        />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {drafts.data.map((draft) => (
        <NewsDraftCard key={draft.id} draft={draft} />
      ))}
    </ul>
  );
}

function NewsDraftCard({ draft }: { draft: WeeklyDraftDoc }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft.draftText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래 문구를 길게 눌러 복사해 주세요.", draft.draftText);
    }
  }

  return (
    <li className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-ink">{draft.weekLabel}</p>
          <p className="text-[13px] text-ink-muted">게시물 {draft.postCount}개</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-[13px] font-bold text-white transition active:scale-95"
        >
          {copied ? "복사했어요" : "복사하기"}
        </button>
      </div>
      <p className="mt-3 rounded-2xl bg-fill px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line break-keep text-ink-soft">
        {draft.draftText}
      </p>
    </li>
  );
}
