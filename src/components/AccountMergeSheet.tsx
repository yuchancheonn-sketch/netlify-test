"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ConfirmationResult } from "firebase/auth";
import { PrimaryButton, inputClassName } from "@/components/ui";
import { adoptIntoPhoneAccount, linkToExistingMember } from "@/lib/account-link";
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
 * 카카오·구글로 처음 들어온 원우가 첫 프로필에 적은 전화번호로 된 원우 계정이 이미 있을 때 뜹니다
 * (2026-09-23부터 전화번호 하나로 판단 — 예전엔 같은 기수·이름일 때).
 * 휴대폰 번호를 문자로 인증하면(이 계정에 번호가 이어짐) 서버가 그 번호로 된 계정을 찾아 합칩니다.
 * 그 번호가 이미 휴대폰 로그인 계정이면 이어 붙이기가 막히는데, 그때는 그 계정으로 합칩니다(adoptIntoPhoneAccount).
 * 왜 문자 인증까지 하는지는 lib/account-link-server.ts 맨 위.
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
      try {
        await confirmation.confirm(code);
      } catch (caught) {
        /*
         * 이 번호가 이미 휴대폰 로그인 계정이면 이어 붙이기가 막힙니다. 문자 확인은 끝났으니
         * 그 계정으로 합칩니다 (2026-09-23 "전화번호가 같으면 무조건 하나로").
         */
        if ((caught as { code?: string })?.code === "auth/credential-already-in-use") {
          if (await adoptIntoPhoneAccount(caught)) return;
        }
        throw caught;
      }
      const match = await linkToExistingMember(name, cohort, phone);
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
        {/* 문장마다 줄을 바꿉니다 (2026-09-23 사용자 요청) */}
        <p className="mt-2 text-[14px] leading-relaxed break-keep text-ink-soft">
          {/* 2026-09-23부터 전화번호 하나로 판단해서, 이름·기수 대신 번호를 말합니다. */}
          이 전화번호로 가입된 계정이 이미 있어요.
          <br />
          본인이 맞으면 휴대폰 번호를 인증해 주세요.
          <br />
          인증되면 그 계정으로 합쳐지고, 다음부터 어떤 방법으로 들어와도 같은 계정을 써요.
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
            <CodeBoxes value={code} onChange={setCode} onEnter={() => void confirmCode()} />
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

        {/* "합치지 않고 새 계정으로 시작" 버튼은 없앴습니다 (2026-09-23 사용자 요청). 닫으려면 바깥을 누릅니다. */}

        {/* 보이지 않는 로봇 확인(reCAPTCHA)이 붙는 자리 */}
        <div id={PHONE_RECAPTCHA_ID} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * 인증번호 6칸 (2026-09-23 사용자 요청 — 한 줄 입력칸에서 네모 6개로).
 *
 * ★ 칸마다 input을 두지 않고, 보이지 않는 input 하나를 6칸 위에 덮습니다.
 *   그래야 문자로 온 번호 자동 채우기(one-time-code)·붙여넣기·지우기가 한 번에 됩니다.
 */
function CodeBoxes({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (code: string) => void;
  onEnter: () => void;
}) {
  const [focused, setFocused] = useState(true);
  // 다음에 채울 칸(다 찼으면 마지막 칸)을 강조합니다.
  const active = Math.min(value.length, 5);

  return (
    <div className="relative">
      <div className="flex justify-between gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={`flex aspect-square flex-1 items-center justify-center rounded-xl border bg-surface text-[22px] font-bold text-ink shadow-[var(--shadow-card)] transition ${
              focused && index === active
                ? "border-brand-300 ring-4 ring-brand-100"
                : "border-transparent"
            }`}
          >
            {value[index] ?? ""}
          </div>
        ))}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(event) => event.key === "Enter" && onEnter()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-label="인증번호 6자리"
        autoFocus
        // 16px — 아이폰이 16px보다 작은 입력칸을 누르면 화면을 확대해 버립니다.
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none"
      />
    </div>
  );
}
