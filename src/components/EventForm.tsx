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
import type { EventDoc } from "@/lib/types";

/**
 * 모임 일정 등록·수정 폼. 운영진만 볼 수 있는 화면에서 씁니다.
 * (권한 확인은 이 폼이 아니라 Firestore 보안 규칙이 최종적으로 합니다.)
 */
export default function EventForm({ event }: { event?: EventDoc }) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
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
     * 새 일정은 addDoc의 결과에서 id를 받아야 그 일정 화면으로 갈 수 있는데,
     * 서버를 기다리면 또 멈춰 설 수 있습니다. addDoc은 문서 참조(id 포함)를
     * 보내기 전에 이미 만들어 두므로, id는 doc()으로 미리 뽑아 쓰고
     * setDoc으로 적습니다. 그러면 저장이 늦어도 곧바로 이동할 수 있습니다.
     */
    try {
      const target = event
        ? doc(db, "events", event.id)
        : doc(collection(db, "events"));

      await commitWrite(
        event
          ? updateDoc(target, payload)
          : setDoc(target, {
              ...payload,
              createdBy: user.uid,
              createdAt: serverTimestamp(),
            }),
      );
      router.replace(`/events/${target.id}`);
    } catch (caught) {
      setSaveError(saveErrorMessage(caught, "일정 등록은 운영진만 할 수 있어요."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-10">
      <div className="mb-6">
        <FieldLabel htmlFor="event-title">제목</FieldLabel>
        <input
          id="event-title"
          value={title}
          onChange={(changed) => setTitle(changed.target.value)}
          placeholder="예) 10기 3회차 수업"
          className={inputClassName}
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
          className={inputClassName}
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
            className={inputClassName}
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
            className={inputClassName}
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
          className={inputClassName}
        />
      </div>

      <div className="mb-8">
        <FieldLabel htmlFor="event-description" hint="선택">
          안내 내용
        </FieldLabel>
        <textarea
          id="event-description"
          value={description}
          onChange={(changed) => setDescription(changed.target.value)}
          rows={5}
          placeholder="준비물, 오시는 길 등 원우들에게 알릴 내용을 적어 주세요."
          className={`${inputClassName} resize-none leading-relaxed`}
        />
      </div>

      {saveError ? (
        <p role="alert" className="mb-4 text-center text-[13px] font-medium text-red-600">
          {saveError}
        </p>
      ) : null}

      <PrimaryButton type="submit" loading={saving}>
        {editing ? "수정 저장하기" : "일정 등록하기"}
      </PrimaryButton>
    </form>
  );
}
