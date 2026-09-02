"use client";

import { useMemo, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Avatar from "@/components/Avatar";
import { CameraIcon } from "@/components/icons";
import {
  FieldError,
  FieldLabel,
  PrimaryButton,
  Spinner,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db, storage } from "@/lib/firebase";
import { cropToSquare } from "@/lib/image";
import {
  BIO_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  PROFILE_IMAGE_SIZE,
} from "@/lib/constants";
import type { MemberType } from "@/lib/types";

const MEMBER_TYPES: { value: MemberType; emoji: string; label: string }[] = [
  { value: "general", emoji: "🌿", label: "일반원우" },
  { value: "youth", emoji: "🌱", label: "청년원우" },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/** 그 달에 있는 날짜 수. 2월은 윤년을 고려해 29일까지 고를 수 있게 둡니다. */
function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

interface FormState {
  name: string;
  nickname: string;
  photoURL: string | null;
  month: string;
  day: string;
  birthdayYear: string;
  /** 체크박스는 "비공개로 하기"지만 저장은 공개 여부로 하므로 뒤집어 씁니다. */
  birthdayYearPublic: boolean;
  memberType: MemberType | "";
  bio: string;
}

export default function ProfileForm({
  /** onboarding: 최초 설정, edit: 내 프로필 수정 */
  mode,
  onSaved,
}: {
  mode: "onboarding" | "edit";
  onSaved?: () => void;
}) {
  const { profile, user } = useAuth();

  const initial = useMemo<FormState>(() => {
    const [month = "", day = ""] = (profile?.birthdayMonthDay ?? "").split("-");
    return {
      name: profile?.name || user?.displayName || "",
      nickname: profile?.nickname ?? "",
      photoURL: profile?.photoURL ?? user?.photoURL ?? null,
      month: month ? String(Number(month)) : "",
      day: day ? String(Number(day)) : "",
      birthdayYear: profile?.birthdayYear ? String(profile.birthdayYear) : "",
      birthdayYearPublic: profile?.birthdayYearPublic ?? false,
      // 최초 설정에서는 일부러 비워 두어 원우가 직접 고르게 합니다.
      memberType: profile?.profileCompleted ? profile.memberType : "",
      bio: profile?.bio ?? "",
    };
  }, [profile, user]);

  /*
   * 이 폼은 StageGate가 프로필 문서를 확인한 뒤에만 그려지므로
   * 처음 렌더에서 이미 값이 채워져 있습니다. 따라서 나중에 덮어쓸 필요가 없고,
   * 입력 중에 다른 곳의 변경이 들어와도 쓰던 내용이 날아가지 않습니다.
   */
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setSaveError(null);
  }

  /** 값이 하나라도 바뀌었는지 (저장 버튼 활성화 조건) */
  const dirty = useMemo(
    () => (Object.keys(initial) as (keyof FormState)[]).some((key) => form[key] !== initial[key]),
    [form, initial],
  );

  async function handlePickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 onChange가 뜨도록 값을 비웁니다.
    event.target.value = "";
    if (!file || !user) return;

    setUploading(true);
    setSaveError(null);
    try {
      // 업로드 전에 가운데를 정사각형으로 잘라내고 크기를 줄입니다.
      const cropped = await cropToSquare(file, PROFILE_IMAGE_SIZE);
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, cropped, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      update("photoURL", url);
    } catch {
      setSaveError("사진을 올리지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = "이름을 입력해 주세요.";
    else if (form.name.trim().length > 20) next.name = "이름은 20자까지 넣을 수 있어요.";

    const nickname = form.nickname.trim();
    if (nickname.length < NICKNAME_MIN_LENGTH) next.nickname = "별칭을 입력해 주세요.";
    else if (nickname.length > NICKNAME_MAX_LENGTH)
      next.nickname = `별칭은 ${NICKNAME_MAX_LENGTH}자까지 넣을 수 있어요.`;

    if (!form.month || !form.day) next.month = "생일의 월과 일을 골라 주세요.";

    if (form.birthdayYear) {
      const year = Number(form.birthdayYear);
      const thisYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1930 || year > thisYear) {
        next.birthdayYear = `연도는 1930~${thisYear} 사이로 넣어 주세요.`;
      }
    }

    if (!form.memberType) next.memberType = "구분을 선택해 주세요.";

    if (form.bio.length > BIO_MAX_LENGTH)
      next.bio = `한 줄 소개는 ${BIO_MAX_LENGTH}자까지 쓸 수 있어요.`;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving || uploading) return;
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        photoURL: form.photoURL,
        birthdayMonthDay: `${form.month.padStart(2, "0")}-${form.day.padStart(2, "0")}`,
        birthdayYear: form.birthdayYear ? Number(form.birthdayYear) : null,
        birthdayYearPublic: form.birthdayYear ? form.birthdayYearPublic : false,
        memberType: form.memberType,
        bio: form.bio.trim(),
        profileCompleted: true,
      });
      onSaved?.();
    } catch {
      setSaveError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = form.nickname.trim() || form.name.trim() || "나";
  const submitDisabled = mode === "edit" ? !dirty : false;

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-10">
      {/* 프로필 사진 */}
      <div className="flex flex-col items-center pt-2 pb-8">
        <div className="relative">
          <Avatar src={form.photoURL} name={displayName} seed={user?.uid} size={112} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="프로필 사진 바꾸기"
            className="absolute -right-1 bottom-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-white shadow-[var(--shadow-float)] ring-4 ring-canvas transition active:scale-95 disabled:opacity-70"
          >
            {uploading ? <Spinner className="h-5 w-5" /> : <CameraIcon className="h-5 w-5" />}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickPhoto}
          className="hidden"
        />
        <p className="mt-3 text-[12px] text-ink-faint">
          사진은 가운데를 기준으로 정사각형으로 잘려요
        </p>
      </div>

      {/* 이름 */}
      <div className="mb-6">
        <FieldLabel htmlFor="name">이름</FieldLabel>
        <input
          id="name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="예: 홍길동"
          className={inputClassName}
        />
        {errors.name ? <FieldError>{errors.name}</FieldError> : null}
      </div>

      {/* 별칭 */}
      <div className="mb-6">
        <FieldLabel htmlFor="nickname" hint={`${form.nickname.length}/${NICKNAME_MAX_LENGTH}`}>
          별칭
        </FieldLabel>
        <input
          id="nickname"
          value={form.nickname}
          onChange={(event) => update("nickname", event.target.value.slice(0, NICKNAME_MAX_LENGTH))}
          placeholder="앱에서 원우들에게 보여질 이름"
          className={inputClassName}
        />
        {errors.nickname ? <FieldError>{errors.nickname}</FieldError> : null}
      </div>

      {/* 생일 */}
      <div className="mb-6">
        <FieldLabel>생일</FieldLabel>
        <div className="flex gap-3">
          <select
            aria-label="생일 월"
            value={form.month}
            onChange={(event) => {
              update("month", event.target.value);
              // 31일을 고른 뒤 2월로 바꾸는 것처럼 없는 날짜가 남지 않게 정리합니다.
              const maxDay = daysInMonth(Number(event.target.value));
              if (Number(form.day) > maxDay) update("day", "");
            }}
            className={`${inputClassName} flex-1 appearance-none bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-11`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
            }}
          >
            <option value="">월</option>
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
          <select
            aria-label="생일 일"
            value={form.day}
            onChange={(event) => update("day", event.target.value)}
            disabled={!form.month}
            className={`${inputClassName} flex-1 appearance-none bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-11 disabled:text-ink-faint`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
            }}
          >
            <option value="">일</option>
            {Array.from({ length: daysInMonth(Number(form.month) || 1) }, (_, i) => i + 1).map(
              (day) => (
                <option key={day} value={day}>
                  {day}일
                </option>
              ),
            )}
          </select>
        </div>
        {errors.month ? <FieldError>{errors.month}</FieldError> : null}

        <div className="mt-3 flex gap-3">
          <input
            aria-label="태어난 연도 (선택)"
            value={form.birthdayYear}
            onChange={(event) =>
              update("birthdayYear", event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            placeholder="연도 (선택)"
            className={`${inputClassName} flex-1`}
          />
        </div>
        {errors.birthdayYear ? <FieldError>{errors.birthdayYear}</FieldError> : null}

        {form.birthdayYear ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-soft">
            <input
              type="checkbox"
              checked={!form.birthdayYearPublic}
              onChange={(event) => update("birthdayYearPublic", !event.target.checked)}
              className="h-5 w-5 shrink-0 rounded-md accent-brand-700"
            />
            연도는 비공개로 하기
          </label>
        ) : null}
      </div>

      {/* 구분 */}
      <div className="mb-6">
        <FieldLabel>구분</FieldLabel>
        <div className="flex gap-3" role="radiogroup" aria-label="원우 구분">
          {MEMBER_TYPES.map(({ value, emoji, label }) => {
            const selected = form.memberType === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("memberType", value)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition ${
                  selected
                    ? "border-brand-500 bg-brand-50"
                    : "border-transparent bg-white shadow-[var(--shadow-card)]"
                }`}
              >
                <span className="text-[22px]" aria-hidden="true">
                  {emoji}
                </span>
                <span
                  className={`text-[14px] font-bold ${
                    selected ? "text-brand-700" : "text-ink-soft"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {errors.memberType ? <FieldError>{errors.memberType}</FieldError> : null}
      </div>

      {/* 한 줄 소개 */}
      <div className="mb-8">
        <FieldLabel htmlFor="bio" hint={`${form.bio.length}/${BIO_MAX_LENGTH}`}>
          한 줄 소개
        </FieldLabel>
        <input
          id="bio"
          value={form.bio}
          onChange={(event) => update("bio", event.target.value.slice(0, BIO_MAX_LENGTH))}
          placeholder="예: 마케팅 일을 해요 / 서울 거주"
          className={inputClassName}
        />
        {errors.bio ? <FieldError>{errors.bio}</FieldError> : null}
      </div>

      {saveError ? (
        <p role="alert" className="mb-4 text-center text-[13px] font-medium text-red-600">
          {saveError}
        </p>
      ) : null}

      <PrimaryButton type="submit" disabled={submitDisabled} loading={saving}>
        {mode === "onboarding" ? "시작하기" : "저장하기"}
      </PrimaryButton>

      {mode === "edit" && !dirty ? (
        <p className="mt-3 text-center text-[12px] text-ink-faint">
          바뀐 내용이 있을 때 저장할 수 있어요
        </p>
      ) : null}
    </form>
  );
}
