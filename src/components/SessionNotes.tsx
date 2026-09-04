"use client";

import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import {
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useMySessionNotes, useSessions } from "@/lib/hooks";
import {
  COURSE_TOTAL_SESSIONS,
  SESSION_INSTRUCTOR_MAX_LENGTH,
  SESSION_NOTE_MAX_LENGTH,
  SESSION_TOPIC_MAX_LENGTH,
} from "@/lib/constants";
import type { SessionDoc } from "@/lib/types";

/**
 * 수업 기록 — 1주차부터 마지막 주차까지 한 줄씩.
 *
 * 한 줄을 누르면 그 주의 주제·강사·느낀점을 적는 창이 열립니다.
 * 주제와 강사는 원우 모두가 함께 채우는 공용 기록이고,
 * 느낀점은 본인만 보는 개인 기록입니다.
 */
export default function SessionNotes() {
  const { user } = useAuth();
  const uid = user?.uid;
  const sessions = useSessions();
  const { notes } = useMySessionNotes(uid);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const sessionByWeek = useMemo(() => {
    const map = new Map<number, SessionDoc>();
    for (const session of sessions.data) map.set(session.week, session);
    return map;
  }, [sessions.data]);

  const weeks = useMemo(
    () => Array.from({ length: COURSE_TOTAL_SESSIONS }, (_, index) => index + 1),
    [],
  );

  return (
    <section>
      {sessions.loading ? (
        <Skeleton className="h-[320px] rounded-3xl" />
      ) : (
        /*
          제목과 열한 줄을 카드 한 장에 담습니다.
          칸마다 카드를 띄우면 화면이 너무 길어지고, 제목을 카드 밖에 두면
          제목과 목록이 따로 노는 두 덩어리로 보입니다.
        */
        <div className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)]">
          {/*
            제목이 카드 모서리에서 떨어진 거리는 위 "오늘의 도산" 카드와 같게 맞췄습니다.
            그쪽은 카드에 px-6 pt-5를 주고 제목에 mb-4를 얹었습니다 —
            여기는 카드에 안쪽 여백이 없으니 제목이 그 값을 그대로 들고 있습니다.
          */}
          <h2 className="px-6 pt-5 pb-4 text-[18px] font-bold text-ink">수업 기록</h2>

          {/* 줄 사이 선은 흰색 — 자리는 그대로 두되 눈에는 보이지 않게 합니다. */}
          <ul className="divide-y divide-white">
            {weeks.map((week) => {
              const session = sessionByWeek.get(week);
              const note = (notes[String(week)] ?? "").trim();
              return (
                <li key={week}>
                  <button
                    type="button"
                    onClick={() => setEditingWeek(week)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-canvas"
                  >
                    {/* 속은 흰색, 테두리와 숫자는 주황. 카드가 희어서 테두리가 원을 잡아줍니다. */}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-white text-[14px] font-bold text-brand-500 tabular-nums">
                      {week}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-ink">
                        {session?.topic || `${week}주차`}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
                        {[
                          session?.instructor ? `${session.instructor} 강사님` : null,
                          note ? note : "아직 느낀점을 안 남겼어요",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>

                    {note ? (
                      <CheckIcon className="h-5 w-5 shrink-0 text-brand-500" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editingWeek !== null ? (
        <SessionEditSheet
          week={editingWeek}
          session={sessionByWeek.get(editingWeek)}
          note={notes[String(editingWeek)] ?? ""}
          onClose={() => setEditingWeek(null)}
        />
      ) : null}
    </section>
  );
}

/** 한 주차의 주제·강사·느낀점을 적는 바텀시트 */
function SessionEditSheet({
  week,
  session,
  note,
  onClose,
}: {
  week: number;
  session?: SessionDoc;
  note: string;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [topic, setTopic] = useState(session?.topic ?? "");
  const [instructor, setInstructor] = useState(session?.instructor ?? "");
  const [myNote, setMyNote] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    setError(null);
    try {
      /*
       * 두 곳에 나눠 담습니다.
       *  - 주제·강사는 sessions/{주차}  — 모두가 함께 보는 칸
       *  - 느낀점은 sessionNotes/{내 uid} — 나만 보는 칸
       * 바뀐 쪽만 저장해서, 남이 적어둔 주제를 건드리지 않고 넘어갑니다.
       */
      const topicChanged =
        topic.trim() !== (session?.topic ?? "") ||
        instructor.trim() !== (session?.instructor ?? "");

      if (topicChanged) {
        await setDoc(
          doc(db, "sessions", String(week)),
          {
            week,
            topic: topic.trim(),
            instructor: instructor.trim(),
            updatedBy: user.uid,
            updatedByName: profile?.name || profile?.nickname || "원우",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      if (myNote !== note) {
        await setDoc(
          doc(db, "sessionNotes", user.uid),
          { notes: { [String(week)]: myNote.trim() } },
          { merge: true },
        );
      }

      onClose();
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${week}주차 수업 기록`}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="text-[19px] font-bold text-ink">{week}주차 수업</h2>
        <p className="mt-1 mb-6 text-[13px] leading-relaxed text-ink-muted">
          주제와 강사는 원우 모두에게 보이고, 느낀점은 나만 봅니다.
        </p>

        <div className="mb-5">
          <FieldLabel htmlFor="session-topic">수업 주제</FieldLabel>
          <input
            id="session-topic"
            value={topic}
            onChange={(changed) => setTopic(changed.target.value)}
            placeholder="예) 애기애타의 뜻과 오늘의 리더십"
            maxLength={SESSION_TOPIC_MAX_LENGTH}
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="session-instructor">강사</FieldLabel>
          <input
            id="session-instructor"
            value={instructor}
            onChange={(changed) => setInstructor(changed.target.value)}
            placeholder="예) 홍길동"
            maxLength={SESSION_INSTRUCTOR_MAX_LENGTH}
            className={inputClassName}
          />
        </div>

        <div className="mb-6">
          <FieldLabel
            htmlFor="session-note"
            hint={`${myNote.length} / ${SESSION_NOTE_MAX_LENGTH}`}
          >
            느낀점 (나만 봅니다)
          </FieldLabel>
          <textarea
            id="session-note"
            value={myNote}
            onChange={(changed) => setMyNote(changed.target.value)}
            placeholder="수업에서 마음에 남은 것을 적어보세요."
            maxLength={SESSION_NOTE_MAX_LENGTH}
            rows={6}
            className={`${inputClassName} resize-none leading-relaxed`}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-stone-100 px-6 py-4 text-[15px] font-bold text-ink-muted"
          >
            취소
          </button>
          <PrimaryButton type="submit" loading={saving}>
            저장하기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
