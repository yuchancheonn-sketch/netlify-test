"use client";

import { useMemo, useRef, useState } from "react";
import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
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
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { uploadImage } from "@/lib/cloudinary";
import { cropToSquare } from "@/lib/image";
import { COHORTS, cohortOf, hasYouthMembers } from "@/lib/cohort";
import { linkRosterEntry } from "@/lib/roster-link";
import { linkToExistingMember } from "@/lib/account-link";
import AccountMergeSheet from "@/components/AccountMergeSheet";
import {
  COMPANY_MAX_LENGTH,
  COUNCIL_ROLE_MAX_LENGTH,
  INTRODUCTION_MAX_LENGTH,
  POSITION_MAX_LENGTH,
  PROFILE_IMAGE_SIZE,
} from "@/lib/constants";
import { formatPhone, formatPhoneInput, isKoreanName } from "@/lib/format";
import { isSupportedVideoUrl, parseVideoLink, videoThumbnail } from "@/lib/video";
import type { MemberType } from "@/lib/types";

/* 구분 단추 — 이름만. 위에 얹던 풀 그림(🌿·🌱)은 2026-09-15 사용자 요청으로 없앴습니다. */
const MEMBER_TYPES: { value: MemberType; label: string }[] = [
  { value: "general", label: "일반 원우" },
  { value: "youth", label: "대학생 원우" },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/** 그 달에 있는 날짜 수. 2월은 윤년을 고려해 29일까지 고를 수 있게 둡니다. */
function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

interface FormState {
  name: string;
  /** "10기"처럼. 최초 설정에서는 비워 두어 원우가 꼭 직접 고르게 합니다. */
  cohort: string;
  photoURL: string | null;
  month: string;
  day: string;
  birthdayYear: string;
  memberType: MemberType | "";
  company: string;
  position: string;
  phone: string;
  councilRole: string;
  introduction: string;
  introVideoUrl: string;
}

/**
 * 이 폼의 한 줄 입력칸·선택 상자 모양 (2026-09-15 사용자 요청 — 자기소개만 빼고 박스 높이를 줄이고 글씨를 2px 올림).
 *
 * 공용 inputClassName(ui.tsx, 위아래 16px)은 다른 시트들도 쓰므로 건드리지 않고, 이 폼에서만 바꿔 씁니다.
 * - 높이: 위 11px + 아래 15px = 26px — 예전 16px + 16px(32px)보다 6px 낮습니다.
 *   (같은 날 10/14px로 8px 줄였다가 "2px 만큼 다 높여줘"로 1px씩 더했습니다.)
 * - 글씨 2px 위로: 입력칸(input·select)은 글씨만 따로 transform할 수 없어서(칸째 움직입니다)
 *   위 여백에서 2px을 빼 아래로 옮기는 식으로 올립니다. 그래서 위아래가 13px씩이 아니라 11/15px입니다.
 * - 자기소개(textarea)는 사용자가 "아무것도 수정하지마"라고 해서 공용 inputClassName을 그대로 씁니다.
 * - 이 문자열의 "pt-[11px] pb-[15px]"는 소스에 글자 그대로 있어야 Tailwind가 CSS를 만듭니다(replace로 넣어도 괜찮은 이유).
 */
const fieldClassName = inputClassName.replace("py-4", "pt-[11px] pb-[15px]");

/**
 * 내 프로필 수정 화면(mode="edit")의 칸 모양 (2026-09-23 사용자 요청).
 * 바탕을 흰색으로 바꾸면서, 흰 칸은 옅은 회색(fill)으로 두고 칸 둘레의 그림자(글로우)를 뺍니다.
 * 처음 가입(onboarding) 화면은 그대로입니다. 글자 그대로 "bg-fill"·"shadow-none"이 있어야 Tailwind가 CSS를 만듭니다.
 */
function flatBox(className: string): string {
  // bg-field — fill과 canvas의 중간 회색 (2026-09-26 사용자 "원우 정보 창 칸과 평균 색으로", 그 전엔 bg-fill).
  return className.replace("bg-surface", "bg-field").replace("shadow-[var(--shadow-card)]", "shadow-none");
}

/** 칸 이름 오른쪽 "선택" 글씨 색 — 옅은 회색(ink-faint)보다 한 단계 진하게 (2026-09-27 사용자 요청). */
const HINT_TONE = "text-ink-muted";

/** 선택 상자에 쓰는 화살표 배경 (생일·직위에서 함께 씁니다) */
const SELECT_ARROW_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
};

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
      // 구글 계정 이름이 영문이면 채워 두지 않습니다 — 이름은 한글로만 받습니다.
      name:
        profile?.name ||
        (user?.displayName && isKoreanName(user.displayName) ? user.displayName : ""),
      // 구분처럼 최초 설정에서는 비워 둡니다. 가입 직후 문서에 적힌 값을 그대로 믿지 않습니다.
      cohort: profile?.profileCompleted ? cohortOf(profile.cohort) : "",
      photoURL: profile?.photoURL ?? user?.photoURL ?? null,
      month: month ? String(Number(month)) : "",
      day: day ? String(Number(day)) : "",
      birthdayYear: profile?.birthdayYear ? String(profile.birthdayYear) : "",
      // 최초 설정에서는 일부러 비워 두어 원우가 직접 고르게 합니다.
      memberType: profile?.profileCompleted ? profile.memberType : "",
      company: profile?.company ?? "",
      position: profile?.position ?? "",
      phone: profile?.phone ?? "",
      councilRole: profile?.councilRole ?? "",
      // 한 줄 소개는 없앴습니다. 예전에 써 둔 한 줄 소개는 자기소개 칸으로 옮겨 보여줍니다.
      introduction: profile?.introduction || profile?.bio || "",
      introVideoUrl: profile?.introVideoUrl ?? "",
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
  /** 같은 원우 계정이 있어 휴대폰 인증을 묻는 시트(계정 합치기, 2026-09-22) */
  const [mergePrompt, setMergePrompt] = useState(false);
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
      /*
       * 사진은 가운데를 정사각형으로 잘라 줄인 뒤 Cloudinary(행사 사진과 같은 보관소)에 올리고,
       * 계정 문서에는 그 주소만 적습니다(2026-09-11).
       *
       * 예전엔 사진을 문자열(data URL)로 만들어 계정 문서 안에 통째로 넣었습니다. 그러면
       * 원우수첩·채팅이 원우들의 문서를 받을 때마다 사진까지 딸려 와, 무료 전송량을 가장 많이 썼습니다.
       * 이제 문서에는 짧은 주소만 남고, 사진은 Cloudinary의 CDN과 브라우저 캐시에서 받습니다.
       *
       * 올린 사진은 아래 "저장"을 눌러야 프로필에 반영됩니다(주소가 이 폼에만 들어갑니다).
       * 저장하지 않고 나가면 Cloudinary에 사진 한 장이 남지만, 서명 없는 업로드라 앱에서 지울 수는 없습니다.
       */
      const blob = await cropToSquare(file, PROFILE_IMAGE_SIZE);
      const uploaded = await uploadImage(blob, "profile.jpg");
      update("photoURL", uploaded.url);
    } catch (caught) {
      // 자르기·올리기 오류는 모두 우리말 문구로 던집니다(lib/image.ts, lib/cloudinary.ts).
      setSaveError(
        caught instanceof Error && caught.message
          ? caught.message
          : "사진을 올리지 못했어요. 다른 사진으로 다시 시도해 주세요.",
      );
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = "이름을 입력해 주세요.";
    else if (form.name.trim().length > 20) next.name = "이름은 20자까지 넣을 수 있어요.";
    else if (!isKoreanName(form.name)) next.name = "이름은 한글로만 적어 주세요.";

    /*
     * 휴대폰은 꼭 넣어야 합니다(2026-09-22 사용자 요청 — 선택에서 필수로). 전화를 걸 수 있는 번호여야 합니다.
     * 칸이 이름과 기수 사이에 있어서, 틀린 칸으로 올려 줄 때 순서가 맞도록 여기서 확인합니다.
     */
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) next.phone = "전화번호를 입력해 주세요.";
    else if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      next.phone = "전화번호를 다시 확인해 주세요.";
    }

    /*
     * 원우수첩이 기수마다 따로라, 기수를 모르면 어느 수첩에 넣을지 정할 수 없습니다.
     * 그래서 이름과 함께 기수만은 꼭 고르게 합니다.
     */
    if (!form.cohort) next.cohort = "기수를 골라 주세요.";

    /*
     * 이름·휴대폰·기수만 있으면 시작할 수 있습니다(휴대폰은 2026-09-22부터 필수 — 아래에서 확인).
     * 생일·구분·회사 같은 나머지는 나중에 프로필에서 채워도 되고,
     * 원우수첩에서 다른 원우가 대신 채워줄 수도 있습니다.
     * (별칭은 2026-09-15 사용자 요청으로 기능째 없앴습니다 — 앱 어디서나 본명만 씁니다.)
     */

    // 월만 고르고 일을 안 고르면 반쪽짜리 생일이 되므로 그때만 알려줍니다.
    if (Boolean(form.month) !== Boolean(form.day))
      next.month = "월과 일을 함께 골라 주세요. (생일은 비워두어도 괜찮아요)";

    if (form.birthdayYear) {
      const year = Number(form.birthdayYear);
      const thisYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1930 || year > thisYear) {
        next.birthdayYear = `연도는 1930~${thisYear} 사이로 넣어 주세요.`;
      }
    }


    if (form.company.length > COMPANY_MAX_LENGTH)
      next.company = `회사·소속은 ${COMPANY_MAX_LENGTH}자까지 넣을 수 있어요.`;

    if (form.position.length > POSITION_MAX_LENGTH)
      next.position = `직책은 ${POSITION_MAX_LENGTH}자까지 넣을 수 있어요.`;

    if (form.introduction.length > INTRODUCTION_MAX_LENGTH)
      next.introduction = `자기소개는 ${INTRODUCTION_MAX_LENGTH}자까지 쓸 수 있어요.`;

    // 비워두는 건 괜찮지만, 넣었다면 알아볼 수 있는 주소여야 합니다.
    if (form.introVideoUrl.trim() && !isSupportedVideoUrl(form.introVideoUrl)) {
      next.introVideoUrl = "유튜브나 비메오 영상 주소를 넣어 주세요.";
    }

    setErrors(next);

    /*
     * 저장 버튼은 맨 아래, 이름 칸은 맨 위라 빨간 안내가 화면 밖에 뜰 수 있습니다.
     * 처음 걸린 칸까지 올려 보여줍니다. (칸의 id를 FormState 이름과 맞춰 두었습니다)
     */
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      document
        .getElementById(firstInvalid)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(next).length === 0;
  }

  /**
   * 계정 합치기 확인 (2026-09-22 사용자 요청) — 첫 프로필 설정에서, 어느 로그인이든.
   * 2026-09-23부터 전화번호 하나로 판단합니다("등록한 전화번호가 같으면 무조건 같은 계정").
   * 같은 (인증된) 번호의 원우 계정이 있으면 그 계정으로 바꿔 타고 여기서 멈춥니다.
   * 휴대폰 인증이 필요하면 인증 시트를 띄웁니다. 확인에 실패하면 평소처럼 저장합니다.
   * 규칙은 lib/account-link-server.ts. 돌려주는 값: 저장을 계속해도 되면 true.
   */
  async function checkExistingAccount(name: string): Promise<boolean> {
    if (mode !== "onboarding" || !user) return true;
    try {
      const match = await linkToExistingMember(name, form.cohort, form.phone);
      if (match === "merged") return false;
      if (match === "needs-phone") {
        setMergePrompt(true);
        return false;
      }
    } catch {
      // 서버가 잠깐 안 되면 합치지 않고 저장합니다.
    }
    return true;
  }

  async function handleSubmit(event?: React.FormEvent, skipLinkCheck = false) {
    event?.preventDefault();
    if (!user || saving || uploading) return;
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);
    try {
      if (!skipLinkCheck && !(await checkExistingAccount(form.name.trim()))) return;

      const name = form.name.trim();

      /*
       * 운영진이 미리 넣어둔 명단에 같은 이름이 있으면 이 계정과 이어붙입니다.
       * 그래야 수첩에 "명단의 홍길동"과 "가입한 홍길동"이 따로 서지 않습니다.
       * 명단에 적혀 있던 회사·직책·휴대폰은 본인이 비워둔 칸에만 채워 넣습니다.
       * 명단을 읽지 못하더라도 프로필 저장은 그대로 진행되어야 합니다.
       */
      let carried = null;
      try {
        // 동명이인이면 확실할 때만 잇습니다 — 휴대폰 번호도 함께 넘겨 가려 봅니다.
        carried = await linkRosterEntry(user.uid, name, form.cohort, form.phone);
      } catch {
        carried = null;
      }

      // 응답을 잠깐만 기다리고 넘어갑니다 — 이유는 lib/firestore-commit.ts에.
      await commitWrite(
        updateDoc(doc(db, "users", user.uid), {
          name,
          cohort: form.cohort,
          photoURL: form.photoURL,
          // 생일을 안 골랐으면 빈 값으로 둡니다. 수첩에는 "생일 미입력"으로 보입니다.
          birthdayMonthDay:
            form.month && form.day
              ? `${form.month.padStart(2, "0")}-${form.day.padStart(2, "0")}`
              : "",
          birthdayYear: form.birthdayYear ? Number(form.birthdayYear) : null,
          // 구분을 안 골랐으면 일반원우로 두고, 나중에 본인이나 동료가 바꿉니다.
          // 1·2기엔 대학생 원우가 없어 고르개를 숨기고 늘 일반 원우로 적습니다(lib/cohort.ts).
          memberType: hasYouthMembers(form.cohort) ? form.memberType || "general" : "general",
          company: form.company.trim() || carried?.company || "",
          position: form.position.trim() || carried?.position || "",
          phone: form.phone.trim() ? formatPhone(form.phone) : (carried?.phone ?? ""),
          councilRole: form.councilRole.trim() || carried?.councilRole || "",
          // 예전 한 줄 소개는 위에서 자기소개로 옮겨 담았으니 지웁니다.
          bio: deleteField(),
          introduction: form.introduction.trim(),
          introVideoUrl: form.introVideoUrl.trim() || carried?.introVideoUrl || "",
          profileCompleted: true,
          // 다른 원우가 채워준 뒤 본인이 손보면, 수첩의 "○○ 님이 채워주셨어요"가 사라집니다.
          updatedBy: user.uid,
          updatedByName: name,
          updatedAt: serverTimestamp(),
        }),
      );
      onSaved?.();
    } catch (caught) {
      // permission-denied면 보안 규칙을 아직 콘솔에 올리지 않은 것입니다.
      setSaveError(
        saveErrorMessage(
          caught,
          "저장 권한이 없어요. 운영진에게 알려주세요. (Firestore 보안 규칙 게시 필요 · permission-denied)",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  /** 입력한 영상 주소를 바로 알아봤는지 보여주기 위한 미리보기 */
  const videoPreview = useMemo(() => {
    const link = parseVideoLink(form.introVideoUrl);
    if (!link || !link.id) return null;
    return { thumbnail: videoThumbnail(link) };
  }, [form.introVideoUrl]);

  const displayName = form.name.trim() || "나";
  const submitDisabled = mode === "edit" ? !dirty : false;

  /*
   * 칸 모양 — 회색 칸·그림자 없음 (위 flatBox). 처음엔 수정 화면만이었는데, 2026-09-27 사용자 요청
   * ("다른 창들과 일관성 있게, 흰색 배경에 회색 박스")으로 처음 가입 화면도 똑같이 그립니다.
   * 예전 가입 화면 모양(흰 칸·그림자, fieldClassName)은 이제 쓰지 않지만 기록으로 남겨 둡니다.
   */
  const flat = true;
  /*
   * 수정 화면의 한 줄 칸 높이는 원우 정보 창(MemberEditSheet)과 같은 약 44px(위아래 10px) — 2026-09-26 사용자
   * "회색 박스 높이를 원우 정보 창과 똑같게"(그 전엔 위 11px·아래 15px로 약 50px). 처음 가입 화면은 그대로.
   */
  /*
   * 글씨 1px 위로(2026-09-26 사용자 요청) — 입력칸은 글씨만 옮길 수 없어 위 9px·아래 11px로 나눕니다(높이 44px 그대로).
   * ★ 끝에 띄어쓰기를 둡니다 — 아래 선택 상자들이 `${field}appearance-none …`처럼 바로 이어 붙여 씁니다.
   *   띄어쓰기가 없으면 마지막 단어와 붙어 둘 다 깨졌습니다(기수 칸 화살표가 둘로 보이고 높이가 안 맞던 까닭).
   */
  const field = flat ? `${flatBox(inputClassName)} pt-[9px]! pb-[11px]! ` : `${fieldClassName} `;
  const textareaClassName = flat ? flatBox(inputClassName) : inputClassName;
  const cardClassName = flat
    ? flatBox("bg-surface shadow-[var(--shadow-card)]")
    : "bg-surface shadow-[var(--shadow-card)]";

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
            // 수정 화면은 바탕이 흰색(surface)이라 오려내는 테두리도 surface, 그림자는 뺍니다 (2026-09-23 사용자 요청).
            className={`absolute -right-1 bottom-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white ring-4 transition active:scale-95 disabled:opacity-70 ${
              flat ? "ring-surface" : "shadow-[var(--shadow-float)] ring-canvas"
            }`}
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
          placeholder="예) 홍길동"
          className={field}
        />
        {errors.name ? <FieldError>{errors.name}</FieldError> : null}
      </div>

      {/*
        휴대폰 — 원우수첩 상세에서 원우들이 눌러 바로 연락합니다.
        2026-09-22 사용자 요청으로 선택 → 필수로 바꾸고, 이름과 기수 사이로 옮겼습니다(예전엔 직책 아래).
      */}
      <div className="mb-6">
        {/* 칸 이름 "휴대폰" → "전화번호" (2026-09-22 사용자 요청). */}
        <FieldLabel htmlFor="phone">전화번호</FieldLabel>
        <input
          id="phone"
          value={form.phone}
          onChange={(event) => update("phone", formatPhoneInput(event.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-1234-5678"
          className={field}
        />
        {/* 아래 안내 문구("원우들에게만 보이고, 눌러서 바로 전화·문자할 수 있어요.")는 2026-09-27 사용자 요청으로 지웠습니다. */}
        {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
      </div>

      {/* 기수 — 원우수첩이 기수마다 따로라, 이름과 함께 꼭 골라야 합니다. */}
      <div className="mb-6">
        <FieldLabel htmlFor="cohort">기수</FieldLabel>
        <select
          id="cohort"
          value={form.cohort}
          onChange={(event) => update("cohort", event.target.value)}
          className={`${field}appearance-none bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-11`}
          style={SELECT_ARROW_STYLE}
        >
          <option value="" disabled>
            기수를 골라 주세요
          </option>
          {COHORTS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {errors.cohort ? <FieldError>{errors.cohort}</FieldError> : null}
      </div>

      {/* 생일 */}
      <div className="mb-6">
        <FieldLabel hintClassName={HINT_TONE} hint="선택">생일</FieldLabel>
        {/*
          연도 → 월 → 일, 세 칸을 한 줄에 (2026-09-15 사용자 요청 — 예전엔 월·일 한 줄 + 아래 연도 한 줄).
          태어난 해를 먼저 적고 월·일을 고르는 순서가 말로 생일을 부르는 순서와 같습니다.

          ★ 폭이 좁아서 세 가지를 맞췄습니다.
            - 폭 비율 연도 1.3 : 월 1 : 일 1 (grid-cols-[1.3fr_1fr_1fr], gap-2) — 2026-09-15 사용자 "연도박스가 제일 크게".
              flex-1로 똑같이 나눴을 때는 선택 상자가 제 기본 폭을 고집해 오히려 연도 칸이 가장 좁았습니다.
              grid의 fr은 그런 기본 폭과 상관없이 비율대로 나눕니다. 칸마다 min-w-0은 그래도 남겨 넘치지 않게 합니다.
              390px 폰에서 연도 약 128px, 월·일 약 103px씩입니다.
            - 좌우 여백을 공용 px-5(20px) 대신 16px(pl-4!·px-4!)로, 선택 상자는 화살표 자리 pr-9!(36px) +
              화살표를 끝에서 12px(bg-[right_0.75rem_center])로 당겼습니다. ! 는 fieldClassName 안의 px-5를
              확실히 이기려는 것입니다(같은 속성이면 적은 순서가 아니라 Tailwind CSS 순서로 이기므로).
            - 그래도 360px 폰에서 칸 속 글자 자리가 약 49px이라 "12월"·"31일"(약 36px)이 들어갑니다.
          높이·글씨 2px 올림은 fieldClassName 그대로입니다.
        */}
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
          <input
            id="birthdayYear"
            aria-label="태어난 연도 (선택)"
            value={form.birthdayYear}
            onChange={(event) =>
              update("birthdayYear", event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            placeholder="연도"
            className={`${field}min-w-0 px-4!`}
          />
          <select
            id="month"
            aria-label="생일 월"
            value={form.month}
            onChange={(event) => {
              update("month", event.target.value);
              // 31일을 고른 뒤 2월로 바꾸는 것처럼 없는 날짜가 남지 않게 정리합니다.
              const maxDay = daysInMonth(Number(event.target.value));
              if (Number(form.day) > maxDay) update("day", "");
            }}
            className={`${field}min-w-0 appearance-none bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-9! pl-4!`}
            style={SELECT_ARROW_STYLE}
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
            className={`${field}min-w-0 appearance-none bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-9! pl-4! disabled:text-ink-faint`}
            style={SELECT_ARROW_STYLE}
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
        {errors.birthdayYear ? <FieldError>{errors.birthdayYear}</FieldError> : null}
        {errors.month ? <FieldError>{errors.month}</FieldError> : null}
        {/*
          "연도는 비공개로 하기" 체크박스는 2026-09-15 사용자 요청으로 기능째 없앴습니다.
          연도를 넣으면 원우수첩에 늘 함께 보입니다(lib/format.ts의 formatBirthday).
          숨기고 싶은 원우는 연도 칸을 비워 두면 됩니다 — 연도는 원래 선택 칸입니다.
        */}
      </div>

      {/* 구분 */}
      {/* 구분 — 1·2기엔 대학생 원우가 없어 고르개를 보이지 않습니다(lib/cohort.ts의 hasYouthMembers). */}
      {hasYouthMembers(form.cohort) ? (
      <div className="mb-6">
        <FieldLabel hintClassName={HINT_TONE} hint="선택">구분</FieldLabel>
        <div className="flex gap-3" role="radiogroup" aria-label="원우 구분">
          {MEMBER_TYPES.map(({ value, label }) => {
            const selected = form.memberType === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("memberType", value)}
                /*
                  py-[13px] — 위아래 13px (2026-09-15 사용자 요청으로 py-4 16px → 12px로 줄였다가 1px씩 되올림).
                  이름은 2px 위로(-translate-y-[2px]) — 단추가 flex라 span이 flex 칸이 되어 transform이 먹습니다.
                  ★ 이름 위의 풀 그림 글자(🌿 일반 원우 · 🌱 대학생 원우)는 2026-09-15 사용자 요청으로 없앴습니다.
                    그래서 칸이 그 줄(약 33px + 사이 6px)만큼 낮아졌고, 이름 한 줄만 가운데 섭니다.
                */
                // 수정 화면은 py-[9.5px] — 테두리 2px씩 + 글줄 21px + 위아래 9.5px = 44px, 다른 칸들과 같은 높이
                // (2026-09-26 사용자 "높이 똑같게" 11.5px → 9.5px).
                className={`flex flex-1 items-center justify-center rounded-2xl border-2 transition ${
                  flat ? "py-[9.5px]" : "py-[13px]"
                } ${
                  selected
                    ? "border-brand-500 bg-brand-50"
                    : `border-transparent ${cardClassName}`
                }`}
              >
                {/* 수정 화면은 2px 위로 — 같은 날 "1px 위로"(3px)에서 "1px 아래로"로 되돌림(2026-09-26 사용자 요청). */}
                <span
                  className={`-translate-y-[2px] text-[14px] font-bold ${
                    selected ? "text-brand-500" : "text-ink-soft"
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
      ) : null}

      {/* 회사·직책 — 원우수첩 카드에 이름 아래로 보입니다. */}
      <div className="mb-6">
        <FieldLabel htmlFor="company" hintClassName={HINT_TONE} hint="선택">
          회사·소속
        </FieldLabel>
        <input
          id="company"
          value={form.company}
          onChange={(event) =>
            update("company", event.target.value.slice(0, COMPANY_MAX_LENGTH))
          }
          placeholder="예) (주)착한부자"
          className={field}
        />
        {errors.company ? <FieldError>{errors.company}</FieldError> : null}
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="position" hintClassName={HINT_TONE} hint="선택">
          직책
        </FieldLabel>
        <input
          id="position"
          value={form.position}
          onChange={(event) =>
            update("position", event.target.value.slice(0, POSITION_MAX_LENGTH))
          }
          placeholder="예) 대표 / 본부장"
          className={field}
        />
        {errors.position ? <FieldError>{errors.position}</FieldError> : null}
      </div>

      {/*
        원우회 직위 — 적으면 원우수첩 이름 옆에 배지로 붙습니다.
        기수마다 부르는 이름이 달라 목록에서 고르지 않고 직접 적습니다.
      */}
      <div className="mb-6">
        <FieldLabel htmlFor="councilRole" hintClassName={HINT_TONE} hint="선택">
          원우회 직위
        </FieldLabel>
        <input
          id="councilRole"
          value={form.councilRole}
          onChange={(event) =>
            update("councilRole", event.target.value.slice(0, COUNCIL_ROLE_MAX_LENGTH))
          }
          placeholder="예) 회장 / 총무 / 문화위원장"
          className={field}
        />
      </div>

      {/* 자기소개 — 원우 소개 상세에서 전문이 보입니다. */}
      <div className="mb-6">
        <FieldLabel
          htmlFor="introduction"
          hintClassName={HINT_TONE}
          hint={
            <span className="tabular-nums">
              선택 · {form.introduction.length}/{INTRODUCTION_MAX_LENGTH}자
            </span>
          }
        >
          자기소개
        </FieldLabel>
        <textarea
          id="introduction"
          value={form.introduction}
          onChange={(event) =>
            update("introduction", event.target.value.slice(0, INTRODUCTION_MAX_LENGTH))
          }
          rows={5}
          placeholder="하는 일, 관심사, 원우들에게 하고 싶은 말을 자유롭게 적어 주세요."
          className={`${textareaClassName} resize-none leading-relaxed`}
        />
        {errors.introduction ? <FieldError>{errors.introduction}</FieldError> : null}
      </div>

      {/* 소개 영상 */}
      <div className="mb-8">
        <FieldLabel htmlFor="introVideoUrl" hintClassName={HINT_TONE} hint="선택">
          소개 영상 링크
        </FieldLabel>
        <input
          id="introVideoUrl"
          value={form.introVideoUrl}
          onChange={(event) => update("introVideoUrl", event.target.value)}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://youtu.be/..."
          className={field}
        />
        {errors.introVideoUrl ? <FieldError>{errors.introVideoUrl}</FieldError> : null}

        {videoPreview ? (
          <div className={`mt-3 flex items-center gap-3 rounded-2xl p-3 ${cardClassName}`}>
            {videoPreview.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={videoPreview.thumbnail}
                alt=""
                className="h-14 w-24 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span
                className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[22px]"
                aria-hidden="true"
              >
                🎬
              </span>
            )}
            <p className="text-[13px] font-bold text-ink-soft">
              영상을 찾았어요
              <span className="mt-0.5 block text-[12px] font-medium text-ink-faint">
                원우 소개에서 눌러 볼 수 있어요
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
            유튜브에 올릴 때는 &lsquo;일부 공개(목록에 없음)&rsquo;로 올리시면
            링크를 아는 원우만 볼 수 있어요.
          </p>
        )}
      </div>

      {saveError ? (
        <p role="alert" className="mb-4 text-center text-[13px] font-medium text-danger">
          {saveError}
        </p>
      ) : null}

      {/*
        size="field" — 위아래 13px로 입력칸들과 비슷한 높이(약 50px) (2026-09-15, md 16px에서 줄임 — 12px였다가 2px 되올림).
        글씨는 2px 위로 — PrimaryButton이 flex라 span에 건 transform이 먹습니다.
      */}
      <PrimaryButton type="submit" disabled={submitDisabled} loading={saving} size="field">
        <span className="-translate-y-[2px]">{mode === "onboarding" ? "시작하기" : "저장하기"}</span>
      </PrimaryButton>

      {mode === "edit" && !dirty ? (
        <p className="mt-3 text-center text-[12px] text-ink-faint">
          바뀐 내용이 있을 때 저장할 수 있어요
        </p>
      ) : null}

      {mergePrompt ? (
        <AccountMergeSheet
          name={form.name.trim()}
          cohort={form.cohort}
          initialPhone={form.phone}
          onClose={() => setMergePrompt(false)}
          // 합치지 않고 따로 시작 — 확인을 건너뛰고 평소처럼 저장합니다.
          onSkip={() => {
            setMergePrompt(false);
            void handleSubmit(undefined, true);
          }}
        />
      ) : null}
    </form>
  );
}
