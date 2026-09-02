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
import { formatPhone } from "@/lib/format";
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
  onClose,
}: {
  /** null이면 새 이름 추가 */
  entry: DirectoryEntry | null;
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
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !profile) return;

    if (!name.trim()) {
      setNameError("이름을 입력해 주세요.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (phone.trim() && (digits.length < 9 || digits.length > 11)) {
      setError("휴대폰 번호를 다시 확인해 주세요.");
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
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={entry ? `${entry.name} 정보 수정` : "원우 추가하기"}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="text-[19px] font-bold text-ink">
          {entry ? `${entry.name} 님 정보` : "원우 추가하기"}
        </h2>
        <p className="mt-1 mb-6 text-[13px] leading-relaxed text-ink-faint">
          {!entry
            ? "아직 가입하지 않은 원우도 수첩에 올려둘 수 있어요. 본인이 가입하면 자동으로 이어집니다."
            : isMine
              ? "내 항목이에요. 사진·자기소개·소개 영상은 내 프로필에서 바꿀 수 있어요."
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
            placeholder="예: 홍길동"
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
                      ? "border-brand-500 bg-brand-50 text-brand-700"
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
            placeholder="예: (주)착한부자"
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
            placeholder="예: 대표 / 본부장"
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
            onChange={(event) => setPhone(event.target.value.slice(0, 20))}
            onBlur={(event) => setPhone(formatPhone(event.target.value))}
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

        <div className="mb-7">
          <FieldLabel htmlFor="edit-bio" hint="선택">
            한 줄 소개
          </FieldLabel>
          <input
            id="edit-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="예: 마케팅 일을 해요 / 서울 거주"
            className={inputClassName}
          />
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
