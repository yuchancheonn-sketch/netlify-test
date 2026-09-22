"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ConfirmationResult } from "firebase/auth";
import { PrimaryButton, inputClassName } from "@/components/ui";
import { linkToExistingMember } from "@/lib/account-link";
import { formatPhoneInput } from "@/lib/format";
import {
  PHONE_RECAPTCHA_ID,
  phoneErrorMessage,
  resetVerifier,
  sendLinkPhoneCode,
  toE164Korean,
} from "@/lib/phone-login";

/**
 * "이미 가입된 계정이 있어요" 시트 — 계정 합치기의 휴대폰 인증 (2026-09-22).
 *
 * 카카오로 처음 들어온 원우가 첫 프로필에 이름·기수를 넣었는데, 같은 기수·이름의 원우 계정이 이미 있을 때 뜹니다.
 * 휴대폰 번호를 문자로 인증하면(이 카카오 계정에 번호가 이어짐) 서버가 그 번호와 기존 계정의 번호를 견주고,
 * 같으면 기존 계정으로 합칩니다. 왜 문자 인증까지 하는지는 lib/account-link-server.ts 맨 위.
 *
 * ★ 폼 안에서 쓰이지만 document.body에 붙입니다(createPortal) — 여기서 Enter를 눌러도
 *   바깥 프로필 폼("시작하기")이 제출되지 않게.
 */
export default function AccountMergeSheet({
  name,
  cohort,
  initialPhone,
  onClose,
  onSkip,
}: {
  name: string;
  cohort: string;
  initialPhone: string;
  onClose: () => void;
  onSkip: () => void;
}) {
  const [phone, setPhone] = useState(formatPhoneInput(initialPhone));
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 인증은 됐는데 기존 계정의 번호와 달랐을 때 */
  const [mismatch, setMismatch] = useState(false);

  // 시트를 닫으면 로봇 확인을 버립니다(lib/phone-login.ts의 resetVerifier).
  useEffect(() => () => resetVerifier(), []);

  async function sendCode() {
    const e164 = toE164Korean(phone);
    if (!e164) {
      setError("010으로 시작하는 휴대폰 번호를 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setConfirmation(await sendLinkPhoneCode(e164));
    } catch (caught) {
      setError(phoneErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (!confirmation) return;
    if (!/^\d{6}$/.test(code)) {
      setError("문자로 받은 6자리 숫자를 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmation.confirm(code);
      const match = await linkToExistingMember(name, cohort);
      // merged면 이미 기존 계정으로 바꿔 탔습니다 — StageGate가 홈으로 보내니 busy를 풀지 않습니다.
      if (match === "merged") return;
      if (match === "phone-mismatch") setMismatch(true);
      else onSkip();
    } catch (caught) {
      setError(phoneErrorMessage(caught));
    }
    setBusy(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="기존 계정과 합치기"
      onClick={busy ? undefined : onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="text-[20px] font-bold text-ink">이미 가입된 계정이 있어요</h2>
        <p className="mt-2 text-[14px] leading-relaxed break-keep text-ink-soft">
          {cohort} <b className="text-ink">{name}</b> 님의 계정이 이미 있어요. 본인이 맞으면 휴대폰 번호를 인증해
          주세요. 번호가 같으면 그 계정으로 합쳐지고, 다음부터 카카오로 들어와도 같은 계정을 써요.
        </p>

        {mismatch ? (
          <div className="mt-6">
            <p className="text-center text-[14px] font-medium break-keep text-danger">
              인증한 번호가 그 계정의 번호와 달라요. 새 계정으로 시작할까요?
            </p>
            <div className="mt-4">
              <PrimaryButton onClick={onSkip}>새 계정으로 시작</PrimaryButton>
            </div>
          </div>
        ) : confirmation ? (
          <div className="mt-6 flex flex-col gap-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(event) => event.key === "Enter" && void confirmCode()}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="인증번호 6자리"
              aria-label="인증번호"
              autoFocus
              className={`${inputClassName} text-center tracking-[0.3em]`}
            />
            <PrimaryButton onClick={confirmCode} loading={busy}>
              확인하고 합치기
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <input
              value={phone}
              onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
              onKeyDown={(event) => event.key === "Enter" && void sendCode()}
              inputMode="tel"
              autoComplete="tel"
              placeholder="010-1234-5678"
              aria-label="휴대폰 번호"
              className={`${inputClassName} text-center`}
            />
            <PrimaryButton onClick={sendCode} loading={busy}>
              인증번호 받기
            </PrimaryButton>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-center text-[13px] font-medium break-keep text-danger">
            {error}
          </p>
        ) : null}

        {!mismatch ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="mt-5 w-full text-center text-[13px]! font-bold text-ink-muted"
          >
            합치지 않고 새 계정으로 시작
          </button>
        ) : null}

        {/* 보이지 않는 로봇 확인(reCAPTCHA)이 붙는 자리 */}
        <div id={PHONE_RECAPTCHA_ID} />
      </div>
    </div>,
    document.body,
  );
}
