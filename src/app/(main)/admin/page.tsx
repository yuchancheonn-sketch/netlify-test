"use client";

import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { CheckIcon, PlusIcon, UsersIcon } from "@/components/icons";
import {
  Badge,
  EmptyState,
  ErrorState,
  FieldLabel,
  SectionTitle,
  Skeleton,
  Spinner,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useAllUsers, useRoster } from "@/lib/hooks";
import type { MemberType, RosterDoc, UserDoc } from "@/lib/types";

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반원우",
  youth: "청년원우",
};

const TABS = [
  { value: "pending", label: "승인 대기" },
  { value: "roster", label: "원우 명단" },
  { value: "members", label: "권한 관리" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const users = useAllUsers();
  const roster = useRoster();

  const pending = users.data.filter((user) => user.status === "pending");
  const approved = users.data.filter((user) => user.status === "approved");

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

      <div className="px-5 pb-8">
        <div className="flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`flex-1 rounded-full py-2.5 text-[13px] font-bold transition ${
                tab === value ? "bg-brand-700 text-white" : "text-ink-muted"
              }`}
            >
              {label}
              {value === "pending" && pending.length > 0 ? ` ${pending.length}` : ""}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {users.error ? (
            <ErrorState message={users.error} />
          ) : users.loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 rounded-3xl" />
              <Skeleton className="h-20 rounded-3xl" />
            </div>
          ) : tab === "pending" ? (
            <PendingSection pending={pending} roster={roster.data} />
          ) : tab === "roster" ? (
            <RosterSection roster={roster} approved={approved} />
          ) : (
            <MembersSection approved={approved} />
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
    try {
      await updateDoc(doc(db, "users", user.uid), { status: "approved" });

      /*
       * 미리 등록해 둔 명단에 같은 이름이 있으면 자동으로 이어 붙입니다.
       * 동명이인이 있을 수 있으니 "아직 연결 안 된 항목이 딱 하나"일 때만 연결하고,
       * 여러 개면 명단 탭에서 운영진이 직접 고르게 둡니다.
       */
      const matches = roster.filter(
        (entry) => !entry.linkedUid && entry.name.trim() === user.name.trim(),
      );
      if (matches.length === 1) {
        await updateDoc(doc(db, "roster", matches[0].id), { linkedUid: user.uid });
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
        `${user.name || user.email} 님의 가입 신청을 거절할까요?\n계정 문서가 삭제되고, 본인은 초대 코드부터 다시 시작하게 됩니다.`,
      )
    ) {
      return;
    }
    setBusyUid(user.uid);
    setError(null);
    try {
      await deleteDoc(doc(db, "users", user.uid));
    } catch {
      // 규칙에서 users 삭제를 막아두었으므로 안내만 합니다.
      setError(
        "거절(삭제)은 보안 규칙에서 막혀 있어요. Firebase 콘솔에서 해당 문서를 지워 주세요.",
      );
    } finally {
      setBusyUid(null);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<CheckIcon className="h-10 w-10" />}
          title="승인을 기다리는 신청이 없어요"
          description="새로 가입 신청이 들어오면 여기에 바로 표시됩니다."
        />
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {pending.map((user) => (
          <li
            key={user.uid}
            className="rounded-3xl bg-white p-4 shadow-[var(--shadow-card)]"
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
              <Badge tone="neutral">코드 {user.inviteCode}</Badge>
            </div>

            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={() => approve(user)}
                disabled={busyUid === user.uid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 py-3 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
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
                className="rounded-2xl bg-stone-100 px-5 py-3 text-[15px] font-bold text-ink-muted transition active:scale-[0.98] disabled:opacity-60"
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
  const { user } = useAuth();
  const [names, setNames] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  const userByUid = useMemo(
    () => new Map(approved.map((member) => [member.uid, member])),
    [approved],
  );

  /** 이름을 줄바꿈이나 쉼표로 구분해 여러 명을 한 번에 넣을 수 있게 합니다. */
  const parsedNames = useMemo(
    () =>
      names
        .split(/[\n,]/)
        .map((name) => name.trim())
        .filter(Boolean),
    [names],
  );

  const existingNames = useMemo(
    () => new Set(roster.data.map((entry) => entry.name)),
    [roster.data],
  );
  const newNames = parsedNames.filter((name) => !existingNames.has(name));

  async function handleAdd(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (!user || saving || newNames.length === 0) return;

    setSaving(true);
    setError(null);
    setAdded(null);
    try {
      if (newNames.length === 1) {
        await addDoc(collection(db, "roster"), {
          name: newNames[0],
          memberType,
          linkedUid: null,
          note: "",
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      } else {
        // 여러 명을 한 번에 넣을 때는 한 묶음으로 보내 중간에 끊기지 않게 합니다.
        const batch = writeBatch(db);
        for (const name of newNames) {
          batch.set(doc(collection(db, "roster")), {
            name,
            memberType,
            linkedUid: null,
            note: "",
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      setAdded(newNames.length);
      setNames("");
    } catch {
      setError("명단에 추가하지 못했어요. 운영진 권한인지 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

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
      {/* 추가 폼 */}
      <section className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)]">
        <form onSubmit={handleAdd}>
          <FieldLabel htmlFor="roster-names" hint="여러 명은 줄바꿈으로">
            명단에 원우 추가
          </FieldLabel>
          <textarea
            id="roster-names"
            value={names}
            onChange={(changed) => {
              setNames(changed.target.value);
              setAdded(null);
            }}
            rows={4}
            placeholder={"홍길동\n김철수\n이영희"}
            className={`${inputClassName} resize-none leading-relaxed`}
          />

          <div className="mt-3 flex gap-2">
            {(Object.keys(MEMBER_TYPE_LABEL) as MemberType[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMemberType(value)}
                aria-pressed={memberType === value}
                className={`flex-1 rounded-2xl py-2.5 text-[14px] font-bold transition ${
                  memberType === value
                    ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500"
                    : "bg-canvas text-ink-muted"
                }`}
              >
                {MEMBER_TYPE_LABEL[value]}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={newNames.length === 0 || saving}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-700 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99] disabled:bg-brand-200"
          >
            {saving ? <Spinner className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            {newNames.length > 1 ? `${newNames.length}명 한 번에 추가` : "명단에 추가"}
          </button>

          {parsedNames.length > newNames.length ? (
            <p className="mt-2 text-center text-[12px] text-ink-faint">
              이미 명단에 있는 {parsedNames.length - newNames.length}명은 건너뜁니다
            </p>
          ) : null}
          {added ? (
            <p role="status" className="mt-2 text-center text-[13px] font-bold text-brand-700">
              {added}명을 명단에 추가했어요
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-center text-[13px] font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </form>
      </section>

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
          <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<UsersIcon className="h-10 w-10" />}
              title="아직 등록한 명단이 없어요"
              description="위에 이름을 붙여넣으면 아직 가입하지 않은 원우도 원우 소개에 보입니다."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {roster.data.map((entry) => {
              const linked = entry.linkedUid ? userByUid.get(entry.linkedUid) : undefined;
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]"
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
                        {MEMBER_TYPE_LABEL[entry.memberType]} ·{" "}
                        {linked ? `가입 완료 (${linked.nickname || linked.name})` : "아직 가입 전"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-faint active:bg-stone-100"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 이름이 달라 자동 연결되지 않았을 때 직접 이어 붙입니다. */}
                  {!linked && unlinkedUsers.length > 0 ? (
                    <select
                      aria-label={`${entry.name} 계정 연결`}
                      value=""
                      onChange={(changed) => handleLink(entry, changed.target.value)}
                      className="mt-3 w-full rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-muted outline-none"
                    >
                      <option value="">가입한 계정과 연결하기…</option>
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
      ? `${member.name} 님에게 운영진 권한을 줄까요?\n일정 등록과 가입 승인을 할 수 있게 됩니다.`
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

  if (approved.length === 0) {
    return (
      <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
        <EmptyState title="승인된 원우가 아직 없어요" />
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {approved.map((member) => {
          const isMe = member.uid === user?.uid;
          return (
            <li
              key={member.uid}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <Avatar
                src={member.photoURL}
                name={member.nickname || member.name}
                seed={member.uid}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-ink">
                  {member.nickname || member.name}
                  {isMe ? " (나)" : ""}
                </p>
                <p className="truncate text-[12px] text-ink-faint">{member.email}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleAdmin(member)}
                // 스스로 운영진 권한을 빼면 아무도 승인할 수 없게 될 수 있어 막아둡니다.
                disabled={isMe}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition disabled:opacity-45 ${
                  member.role === "admin"
                    ? "bg-brand-50 text-brand-700"
                    : "bg-stone-100 text-ink-muted"
                }`}
              >
                {member.role === "admin" ? "운영진" : "원우"}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
