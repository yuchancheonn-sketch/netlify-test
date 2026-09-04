"use client";

import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import {
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
            제목 글씨 둘레의 여백은 위 "오늘의 도산" 카드와 같게 맞췄습니다.
            왼쪽 24px, 위 16px, 아래 8px — 그쪽은 카드에 px-6 pt-4를 주고
            제목에 mb-2를 얹었고, 여기는 카드에 안쪽 여백이 없으니
            제목이 그 값을 그대로 들고 있습니다.
          */}
          <h2 className="px-6 pt-4 pb-2 text-[18px] font-bold text-ink">수업 기록</h2>

          <ul>
            {weeks.map((week, index) => {
              const session = sessionByWeek.get(week);
              const note = (notes[String(week)] ?? "").trim();
              return (
                <li key={week}>
                  {/*
                    줄 사이 구분선. 카드 폭을 다 채우지 않고 좌우 24px씩 들여
                    그어, 카드 테두리와 부딪히지 않고 안쪽에서 칸만 나눕니다.
                    (들여쓴 폭은 위 제목의 왼쪽 끝과 같습니다.)
                    맨 윗줄 위에는 긋지 않습니다 — 제목과 목록 사이는 여백이
                    이미 갈라주고 있어서, 선까지 있으면 줄이 두 겹으로 보입니다.
                  */}
                  {index > 0 ? <div className="mx-6 border-t border-line" /> : null}

                  <button
                    type="button"
                    onClick={() => setEditingWeek(week)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-canvas"
                  >
                    {/*
                      원 없이 숫자만 둡니다.
                      폭을 32px로 못 박아 두는 이유: 한 자리(1)와 두 자리(11)의
                      너비가 달라서, 그냥 두면 줄마다 제목 시작점이 어긋납니다.
                      tabular-nums는 숫자 폭을 서로 같게 맞춰줍니다.
                    */}
                    <span className="w-8 shrink-0 text-center text-[21px] font-bold text-brand-500 tabular-nums">
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
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);

    /*
     * 두 곳에 나눠 담습니다.
     *  - 주제·강사는 sessions/{주차}  — 모두가 함께 보는 칸
     *  - 느낀점은 sessionNotes/{내 uid} — 나만 보는 칸
     * 바뀐 쪽만 저장해서, 남이 적어둔 주제를 건드리지 않고 넘어갑니다.
     */
    const topicChanged =
      topic.trim() !== (session?.topic ?? "") ||
      instructor.trim() !== (session?.instructor ?? "");

    const writes: Promise<unknown>[] = [];

    if (topicChanged) {
      writes.push(
        setDoc(
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
        ),
      );
    }

    if (myNote !== note) {
      writes.push(
        setDoc(
          doc(db, "sessionNotes", user.uid),
          { notes: { [String(week)]: myNote.trim() } },
          { merge: true },
        ),
      );
    }

    /*
     * ★ 서버 응답을 기다리지 않고 곧바로 창을 닫습니다.
     *
     * setDoc이 주는 약속은 "기기에 적혔다"가 아니라 "서버에 닿았다"입니다.
     * 신호가 약하거나 무료 한도를 넘긴 동안에는 그 약속이 영영 풀리지 않아서,
     * 기다리게 만들면 저장 버튼이 계속 돌기만 하고 창이 안 닫힙니다.
     *
     * 기다리지 않아도 적은 내용은 사라지지 않습니다 — Firestore는 쓰기를 먼저
     * 기기 안(IndexedDB)에 적어두고 화면에도 바로 반영한 뒤, 연결되면 알아서
     * 올려보냅니다. 앱을 껐다 켜도 그 대기열은 남아 있습니다.
     */
    void Promise.all(writes).catch(() => {});
    onClose();
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

        <div className="mt-6 flex gap-3">
          {/*
            shrink-0과 whitespace-nowrap이 둘 다 필요합니다.
            옆의 저장하기가 폭을 다 가져가려 해서, 그냥 두면 취소 칸이 눌려
            "취/소"로 줄바꿈됩니다.
          */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl bg-stone-100 px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
          >
            취소
          </button>
          <PrimaryButton type="submit" size="sm" loading={saving}>
            저장하기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
