"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import {
  FieldError,
  FieldLabel,
  PrimaryButton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { requestPush } from "@/lib/push";
import { useViewCohort } from "@/lib/use-view-cohort";
import type { EventDoc } from "@/lib/types";

/**
 * 모임 일정 등록·수정 폼.
 * 등록은 원우 누구나, 수정은 그 일정을 올린 사람과 운영진만 이 폼을 봅니다.
 * (권한 확인은 이 폼이 아니라 Firestore 보안 규칙이 최종적으로 합니다.)
 */
export default function EventForm({
  event,
  initialDate = "",
  doneHref = "/events",
  onDone,
  className = "px-5 pb-10",
}: {
  event?: EventDoc;
  /** 새 일정의 날짜 칸을 미리 채울 값 — 홈 캘린더의 + 단추가 고른 날을 넘깁니다(2026-09-25). */
  initialDate?: string;
  /** 저장한 뒤 갈 곳. 홈 캘린더에서 왔으면 홈으로 돌아갑니다(2026-09-25). */
  doneHref?: string;
  /**
   * 시트(EventSheet) 안에서 쓸 때 — 저장하면 다른 화면으로 가는 대신 이걸 부르고(시트 닫기),
   * 아래 단추 줄에 "취소"를 함께 세웁니다(투표 만들기 시트와 같은 짜임, 2026-09-25).
   */
  onDone?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  /**
   * 새 일정이 올라갈 기수 — 원우는 자기 기수, 운영진은 홈·일정 화면에서 고른 기수입니다.
   * 수정할 때는 원래 기수를 건드리지 않습니다.
   */
  const { cohort } = useViewCohort();
  const editing = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? initialDate);
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  // 안내 내용 칸은 2026-09-25에 없앴지만, 고칠 때 예전 안내가 지워지지 않게 원래 값은 들고 있습니다.
  const [description] = useState(event?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "일정 제목을 입력해 주세요.";
    if (!date) next.date = "날짜를 골라 주세요.";
    if (startTime && endTime && endTime < startTime) {
      next.endTime = "종료 시간이 시작 시간보다 빨라요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!user || saving || !validate()) return;

    setSaving(true);
    setSaveError(null);

    const payload = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      location: location.trim(),
      description: description.trim(),
    };

    /*
     * 응답을 잠깐만 기다리고 넘어갑니다 — 이유는 lib/firestore-commit.ts에.
     *
     * 새 일정은 알림을 보내려면 id가 필요한데, addDoc의 결과를 기다리면
     * 또 멈춰 설 수 있습니다. addDoc은 문서 참조(id 포함)를
     * 보내기 전에 이미 만들어 두므로, id는 doc()으로 미리 뽑아 쓰고
     * setDoc으로 적습니다. 그러면 저장이 늦어도 곧바로 이동할 수 있습니다.
     * 저장한 뒤에는 모임 목록으로 돌아갑니다(모임 상세 화면은 2026-09-11에 없앴습니다).
     */
    try {
      const target = event
        ? doc(db, "events", event.id)
        : doc(collection(db, "events"));

      const result = await commitWrite(
        event
          ? updateDoc(target, payload)
          : setDoc(target, {
              ...payload,
              cohort,
              createdBy: user.uid,
              createdAt: serverTimestamp(),
            }),
      );

      /*
       * 새로 올린 일정만 원우들 폰에 알립니다. 수정할 때는 부르지 않습니다 —
       * 오탈자 하나 고칠 때마다 마흔 명 폰이 울리면 안 됩니다.
       *
       * "saved"일 때만 부르는 이유: "queued"는 아직 서버에 안 올라갔다는
       * 뜻이라, 서버가 그 일정을 찾지 못합니다. 그때는 알림만 건너뜁니다.
       */
      if (!event && result === "saved") {
        void requestPush("event", { eventId: target.id });
      }
      if (onDone) onDone();
      else router.replace(doneHref);
    } catch (caught) {
      setSaveError(
        saveErrorMessage(
          caught,
          editing
            ? "이 일정은 올린 사람과 운영진만 고칠 수 있어요."
            : "저장 권한이 없어요. 운영진에게 알려주세요. (Firestore 보안 규칙 게시 필요 · permission-denied)",
        ),
      );
      setSaving(false);
    }
  }

  /*
   * 이 폼의 입력칸 — 흰 화면 위 옅은 회색 상자, 그림자 없음, 높이 약 44px (2026-09-25 사용자 "박스 높이 줄이고,
   * 배경은 흰색, 박스는 회색"). 공용 inputClassName(흰 카드 + 그림자, 약 58px)은 다른 화면도 쓰므로 여기서만 덮어씁니다.
   * 바탕 흰색은 이 폼을 쓰는 등록·수정 화면(events/new · events/[id]/edit)이 깝니다.
   */
  const fieldClassName = `${inputClassName} bg-canvas! py-2.5! shadow-none!`;

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="mb-6">
        <FieldLabel htmlFor="event-title">제목</FieldLabel>
        <input
          id="event-title"
          value={title}
          onChange={(changed) => setTitle(changed.target.value)}
          placeholder="예) 10기 3회차 수업"
          className={fieldClassName}
        />
        {errors.title ? <FieldError>{errors.title}</FieldError> : null}
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="event-date">날짜</FieldLabel>
        <input
          id="event-date"
          type="date"
          value={date}
          onChange={(changed) => setDate(changed.target.value)}
          className={fieldClassName}
        />
        {errors.date ? <FieldError>{errors.date}</FieldError> : null}
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex-1">
          <FieldLabel htmlFor="event-start">시작 시간</FieldLabel>
          <input
            id="event-start"
            type="time"
            value={startTime}
            onChange={(changed) => setStartTime(changed.target.value)}
            className={fieldClassName}
          />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="event-end" hint="선택">
            종료 시간
          </FieldLabel>
          <input
            id="event-end"
            type="time"
            value={endTime}
            onChange={(changed) => setEndTime(changed.target.value)}
            className={fieldClassName}
          />
        </div>
      </div>
      {errors.endTime ? <FieldError>{errors.endTime}</FieldError> : null}

      <div className="mb-6">
        <FieldLabel htmlFor="event-location" hint="선택">
          장소
        </FieldLabel>
        <input
          id="event-location"
          value={location}
          onChange={(changed) => setLocation(changed.target.value)}
          placeholder="예) 도산아카데미 강의실"
          className={fieldClassName}
        />
      </div>

      {/*
        "안내 내용" 칸은 없앴습니다 (2026-09-25 사용자 요청). 예전에 적어 둔 안내는 저장할 때 그대로 남기고
        (description 상태는 원래 값으로 둠), 모임 목록 카드에도 그대로 보입니다. 되살리려면 git 기록의 textarea.
      */}
      <div className="mb-2" />

      {saveError ? (
        <p role="alert" className="mb-4 text-center text-[13px] font-medium text-danger">
          {saveError}
        </p>
      ) : null}

      {onDone ? (
        /* 시트에서는 투표 만들기 시트처럼 "취소 | 등록하기" 한 줄 (PollCard.tsx의 같은 자리 주석 참고). */
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
          >
            취소
          </button>
          <PrimaryButton type="submit" loading={saving} size="sm">
            {editing ? "수정 저장하기" : "일정 등록하기"}
          </PrimaryButton>
        </div>
      ) : (
        <PrimaryButton type="submit" loading={saving}>
          {editing ? "수정 저장하기" : "일정 등록하기"}
        </PrimaryButton>
      )}
    </form>
  );
}
