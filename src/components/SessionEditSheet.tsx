"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  FieldError,
  FieldLabel,
  PrimaryButton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { sessionDocId } from "@/lib/cohort";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useViewCohort } from "@/lib/use-view-cohort";
import { isSupportedVideoUrl, parseVideoLink, videoThumbnail } from "@/lib/video";
import {
  SESSION_INSTRUCTOR_MAX_LENGTH,
  SESSION_TOPIC_MAX_LENGTH,
} from "@/lib/constants";
import type { SessionDoc } from "@/lib/types";

/**
 * 한 주차의 주제·강사·수업 영상을 적는 창.
 *
 * 셋 다 원우 모두가 함께 채우는 공용 기록입니다. 누가 적어도 같은 내용이
 * 모두에게 보이고, 마지막으로 손댄 사람 이름이 남습니다. (원우수첩과 같은 방식)
 */
export default function SessionEditSheet({
  week,
  session,
  onClose,
}: {
  week: number;
  session?: SessionDoc | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const { cohort } = useViewCohort();
  const [topic, setTopic] = useState(session?.topic ?? "");
  const [instructor, setInstructor] = useState(session?.instructor ?? "");
  /* 교시마다 영상이 하나씩입니다. 1교시가 videoUrl, 2교시가 videoUrl2입니다. */
  const [videoUrl, setVideoUrl] = useState(session?.videoUrl ?? "");
  const [videoUrl2, setVideoUrl2] = useState(session?.videoUrl2 ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);

  /*
   * 주소가 잘못됐으면 저장 자체를 막습니다.
   * 두 칸 중 하나라도 걸리면 안 되므로 함께 봅니다.
   */
  const videoProblem =
    (videoUrl.trim() && !isSupportedVideoUrl(videoUrl)) ||
    (videoUrl2.trim() && !isSupportedVideoUrl(videoUrl2));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving || videoProblem) return;
    setSaving(true);
    setError(null);

    try {
      await commitWrite(
        setDoc(
          doc(db, "sessions", sessionDocId(cohort, week)),
          {
            week,
            topic: topic.trim(),
            instructor: instructor.trim(),
            videoUrl: videoUrl.trim(),
            videoUrl2: videoUrl2.trim(),
            updatedBy: user.uid,
            updatedByName: profile?.name || profile?.nickname || "원우",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${week}주차 수업 정보 수정`}
      onClick={onClose}
    >
      {/* 손잡이를 스크롤 밖에 따로 두는 이유는 MemberEditSheet의 같은 자리 설명을 참고하세요. */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-canvas sm:rounded-[16px]"
        style={sheetStyle}
      >
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7"
        >
          <h2 className="mb-6 text-[19px] font-bold text-ink">{week}주차 수업</h2>

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

          {/*
            수업이 1·2교시로 나뉘어 있어 영상 칸도 둘입니다.
            느낀점도 교시마다 따로 달리므로, 2교시 주소를 여기 넣어야
            수업 화면의 2교시 칸이 열립니다.
          */}
          <div className="mb-5">
            <VideoField
              id="session-video"
              label="1교시 영상 주소"
              value={videoUrl}
              onChange={setVideoUrl}
            />
          </div>

          <div className="mb-6">
            <VideoField
              id="session-video-2"
              label="2교시 영상 주소"
              value={videoUrl2}
              onChange={setVideoUrl2}
            />
          </div>

          {error ? <FieldError>{error}</FieldError> : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
            >
              취소
            </button>
            <PrimaryButton type="submit" size="sm" loading={saving}>
              저장하기
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 영상 주소 한 칸. 1교시와 2교시가 이걸 한 벌씩 씁니다.
 *
 * 주소를 붙여넣는 즉시 썸네일을 보여줍니다 — 맞는 영상인지 눈으로 확인되고,
 * 유튜브 목록에서 엉뚱한 주를 집어온 것도 그 자리에서 알아챕니다.
 */
function VideoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const link = parseVideoLink(value);
  const preview = link?.id ? videoThumbnail(link) : null;
  const problem =
    value.trim() && !isSupportedVideoUrl(value)
      ? "유튜브나 비메오 주소를 넣어주세요."
      : null;

  return (
    <>
      <FieldLabel htmlFor={id} hint="선택">
        {label}
      </FieldLabel>
      <input
        id={id}
        type="url"
        inputMode="url"
        value={value}
        onChange={(changed) => onChange(changed.target.value)}
        placeholder="https://youtu.be/..."
        className={inputClassName}
      />
      {problem ? <FieldError>{problem}</FieldError> : null}

      {/* 붙여넣은 주소의 썸네일. 상자가 16:9여야 검은 띠가 안 남습니다(lib/video.ts) */}
      {preview ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="aspect-video w-full object-cover" />
        </div>
      ) : null}
    </>
  );
}
