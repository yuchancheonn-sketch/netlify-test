"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  FieldError,
  FieldLabel,
  PrimaryButton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  BIO_MAX_LENGTH,
  COMPANY_MAX_LENGTH,
  COUNCIL_ROLES,
  POSITION_MAX_LENGTH,
} from "@/lib/constants";
import type { DirectoryEntry } from "@/lib/directory";
import { formatPhone, formatPhoneInput } from "@/lib/format";
import { isSupportedVideoUrl, parseVideoLink, videoThumbnail } from "@/lib/video";
import type { MemberType } from "@/lib/types";

const MEMBER_TYPES: { value: MemberType; label: string }[] = [
  { value: "general", label: "일반원우" },
  { value: "youth", label: "대학생 원우" },
];

const SELECT_ARROW_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
};

/**
 * 수첩 항목을 채우는 시트.
 *
 * 원우수첩은 서로 채워주는 수첩이라, 내 항목이든 다른 원우 항목이든
 * 같은 화면에서 고칩니다. 고친 사람의 이름은 항목에 함께 남습니다.
 * entry가 null이면 "명단에 없는 원우 새로 올리기"입니다.
 */
export default function MemberEditSheet({
  entry,
  existingNames,
  onClose,
}: {
  /** null이면 새 이름 추가 */
  entry: DirectoryEntry | null;
  /** 이미 수첩에 있는 이름들. 같은 사람을 두 번 올리지 않도록 막는 데 씁니다. */
  existingNames: string[];
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const isMine = entry?.member?.uid === profile?.uid && !!entry?.member;

  const [name, setName] = useState(entry?.name ?? "");
  const [memberType, setMemberType] = useState<MemberType>(entry?.memberType ?? "general");
  const [company, setCompany] = useState(entry?.company ?? "");
  const [position, setPosition] = useState(entry?.position ?? "");
  const [phone, setPhone] = useState(entry?.phone ?? "");
  const [councilRole, setCouncilRole] = useState(entry?.councilRole ?? "");
  const [bio, setBio] = useState(entry?.bio ?? "");
  const [introVideoUrl, setIntroVideoUrl] = useState(entry?.introVideoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** 붙여넣은 주소를 알아봤는지 바로 보여주는 미리보기 */
  const videoThumb = (() => {
    const link = parseVideoLink(introVideoUrl);
    return link?.id ? videoThumbnail(link) : null;
  })();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !profile) return;

    if (!name.trim()) {
      setNameError("이름을 입력해 주세요.");
      return;
    }

    /*
     * 새로 올릴 때만 확인합니다.
     * 운영진이 명단을 미리 넣어두었기 때문에, 같은 이름을 또 올리면
     * 수첩에 한 사람이 두 칸으로 서게 됩니다.
     */
    if (!entry) {
      const already = new Set(existingNames.map((value) => value.replace(/\s+/g, "")));
      if (already.has(name.replace(/\s+/g, ""))) {
        setNameError("이미 수첩에 있는 이름이에요. 그 칸의 수정을 눌러 채워주세요.");
        return;
      }
    }

    const digits = phone.replace(/\D/g, "");
    if (phone.trim() && (digits.length < 9 || digits.length > 11)) {
      setError("휴대폰 번호를 다시 확인해 주세요.");
      return;
    }

    // 비워두는 건 괜찮지만, 넣었다면 알아볼 수 있는 주소여야 합니다.
    if (introVideoUrl.trim() && !isSupportedVideoUrl(introVideoUrl)) {
      setVideoError("유튜브나 비메오 영상 주소를 넣어 주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    // 누가 정리했는지 남겨야 규칙에서도 통과합니다.
    const stamp = {
      updatedBy: profile.uid,
      updatedByName: profile.name || profile.nickname,
      updatedAt: serverTimestamp(),
    };
    const fields = {
      name: name.trim(),
      memberType,
      company: company.trim(),
      position: position.trim(),
      phone: phone.trim() ? formatPhone(phone) : "",
      councilRole,
      bio: bio.trim(),
      introVideoUrl: introVideoUrl.trim(),
    };

    try {
      if (!entry) {
        await addDoc(collection(db, "roster"), {
          ...fields,
          ...stamp,
          linkedUid: null,
          note: "",
          createdBy: profile.uid,
          createdAt: serverTimestamp(),
        });
      } else if (entry.member) {
        await updateDoc(doc(db, "users", entry.member.uid), { ...fields, ...stamp });
      } else if (entry.roster) {
        await updateDoc(doc(db, "roster", entry.roster.id), { ...fields, ...stamp });
      }
      onClose();
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={entry ? `${entry.name} 정보 수정` : "원우 추가하기"}
      onClick={onClose}
    >
      {/*
        입력칸이 많아 화면보다 길어지므로 시트 안에서 스크롤합니다.
        바깥(회색 배경)에 스크롤을 걸면 시트 윗부분이 화면 위로 밀려
        이름·구분 칸에 손이 닿지 않습니다.
      */}
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="text-[19px] font-bold text-ink">
          {entry ? `${entry.name} 님 정보` : "원우 추가하기"}
        </h2>
        <p className="mt-1 mb-6 text-[13px] leading-relaxed text-ink-faint">
          {!entry
            ? "수첩에 원우를 추가합니다. 본인이 같은 이름으로 가입하면 자동으로 이어집니다."
            : isMine
              ? "내 항목이에요. 사진과 긴 자기소개는 내 프로필에서 바꿀 수 있어요."
              : "원우들이 함께 채우는 수첩이에요. 고친 사람 이름이 항목에 남습니다."}
        </p>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-name">이름</FieldLabel>
          <input
            id="edit-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value.slice(0, 20));
              setNameError(null);
            }}
            placeholder="예) 홍길동"
            className={inputClassName}
          />
          {nameError ? <FieldError>{nameError}</FieldError> : null}
        </div>

        <div className="mb-5">
          <FieldLabel>구분</FieldLabel>
          <div className="flex gap-3" role="radiogroup" aria-label="원우 구분">
            {MEMBER_TYPES.map(({ value, label }) => {
              const selected = memberType === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMemberType(value)}
                  className={`flex-1 rounded-2xl border-2 py-3 text-[14px] font-bold transition ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-500"
                      : "border-transparent bg-white text-ink-soft shadow-[var(--shadow-card)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-company" hint="선택">
            회사·소속
          </FieldLabel>
          <input
            id="edit-company"
            value={company}
            onChange={(event) => setCompany(event.target.value.slice(0, COMPANY_MAX_LENGTH))}
            placeholder="예) (주)착한부자"
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-position" hint="선택">
            직책
          </FieldLabel>
          <input
            id="edit-position"
            value={position}
            onChange={(event) => setPosition(event.target.value.slice(0, POSITION_MAX_LENGTH))}
            placeholder="예) 대표 / 본부장"
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-phone" hint="선택">
            휴대폰
          </FieldLabel>
          <input
            id="edit-phone"
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            inputMode="tel"
            placeholder="010-1234-5678"
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-council" hint="선택">
            원우회 직위
          </FieldLabel>
          <select
            id="edit-council"
            value={councilRole}
            onChange={(event) => setCouncilRole(event.target.value)}
            className={`${inputClassName} appearance-none bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-11`}
            style={SELECT_ARROW_STYLE}
          >
            <option value="">직위 없음</option>
            {COUNCIL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="edit-bio" hint="선택">
            한 줄 소개
          </FieldLabel>
          <input
            id="edit-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="예) 마케팅 일을 해요 / 서울 거주"
            className={inputClassName}
          />
        </div>

        {/* 소개 영상 — 카드 왼쪽 썸네일이 이 영상으로 바뀝니다. */}
        <div className="mb-7">
          <FieldLabel htmlFor="edit-video" hint="선택">
            소개 영상 링크
          </FieldLabel>
          <input
            id="edit-video"
            value={introVideoUrl}
            onChange={(event) => {
              setIntroVideoUrl(event.target.value);
              setVideoError(null);
            }}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://youtu.be/..."
            className={inputClassName}
          />
          {videoError ? (
            <FieldError>{videoError}</FieldError>
          ) : videoThumb ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={videoThumb}
                alt=""
                className="h-14 w-24 shrink-0 rounded-xl object-cover"
              />
              <p className="text-[13px] font-bold text-ink-soft">
                영상을 찾았어요
                <span className="mt-0.5 block text-[12px] font-medium text-ink-faint">
                  수첩 카드에 이 장면이 보입니다
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
              입학식 자기소개 영상 주소를 붙여넣으면 카드 사진이 영상 썸네일로 바뀝니다.
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="mb-4 text-center text-[13px] font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <PrimaryButton type="submit" loading={saving}>
          {entry ? "저장하기" : "수첩에 추가하기"}
        </PrimaryButton>

        {isMine ? (
          <Link
            href="/profile"
            className="mt-3 flex w-full items-center justify-center rounded-2xl bg-white py-4 text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
          >
            사진·자기소개까지 고치기
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl py-3 text-[15px] font-bold text-ink-faint"
        >
          닫기
        </button>
      </form>
    </div>
  );
}
