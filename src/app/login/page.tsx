"use client";

import { useEffect, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import StageGate from "@/components/StageGate";
import { GoogleIcon, KakaoIcon, LockIcon, PhoneIcon } from "@/components/icons";
import { inputClassName, PrimaryButton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatPhoneInput } from "@/lib/format";
import { isKakaoConfigured, startKakaoLogin } from "@/lib/kakao-login";
import {
  PHONE_RECAPTCHA_ID,
  phoneErrorMessage,
  resetVerifier,
  sendPhoneCode,
  toE164Korean,
} from "@/lib/phone-login";
import {
  APP_DEFINITION_BODY,
  APP_NAME,
  COHORT,
  COURSE_FULL_NAME,
} from "@/lib/constants";

export default function LoginPage() {
  return (
    <StageGate allow={["signedOut"]}>
      <LoginScreen />
    </StageGate>
  );
}

/**
 * 첫 화면의 아래쪽 단추 자리가 지금 무엇을 보여 주는지 (2026-09-22 사용자 요청).
 *   start  "로그인하기" / "회원가입하기" 두 단추
 *   signup 가입 방법 셋 — 구글 / 카톡 / 휴대폰 번호 ("…으로 시작하기")
 *   login  같은 셋을 "…으로 로그인"으로
 *   phone  휴대폰 번호 → 인증번호
 *
 * ★ 로그인과 가입은 속으로는 같은 일입니다. 어느 쪽으로 들어가든 처음 보는 계정이면 가입(join)으로,
 *   이미 있는 계정이면 홈으로 갑니다(StageGate). 단추 글씨만 다르게 보여 줍니다.
 * ★ 같은 사람이라도 구글·카톡·휴대폰은 서로 **다른 계정**입니다(이어 붙이기 없음, 2026-09-22 사용자 결정).
 *   그래서 로그인 목록 아래에 "가입할 때 쓴 방법으로" 안내를 붙입니다.
 */
type Step = "start" | "signup" | "login" | "phone";

/**
 * 주황(PrimaryButton) 옆에 서는 흰 단추 — "회원가입하기", 구글, 휴대폰.
 * 테두리 1px + 위아래 15px = PrimaryButton(md, 테두리 없이 16px)과 같은 높이라 줄지어 서도 들쭉날쭉하지 않습니다.
 */
const secondaryButtonClassName =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 py-[15px] text-[16px] font-bold text-ink transition active:scale-[0.99] disabled:opacity-60";

function LoginScreen() {
  const { signIn, authError, clearAuthError } = useAuth();
  const [step, setStep] = useState<Step>("start");
  /** 휴대폰 단계로 들어오기 전 어느 목록에 있었는지 — 뒤로 갈 곳과 글씨("시작하기"/"로그인")를 정합니다. */
  const [purpose, setPurpose] = useState<"signup" | "login">("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goTo(next: Step) {
    if (next === "signup" || next === "login") setPurpose(next);
    setError(null);
    clearAuthError();
    setStep(next);
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKakao() {
    clearAuthError();
    if (!isKakaoConfigured) {
      setError("카카오 로그인이 아직 준비되지 않았어요. 운영진에게 알려주세요.");
      return;
    }
    setSubmitting(true);
    startKakaoLogin(); // 화면이 카카오로 넘어갑니다.
  }

  /*
    카카오로 넘어갔다가 브라우저의 "뒤로"로 돌아오면, 페이지가 떠날 때 모습 그대로(bfcache) 되살아나
    단추가 도는 채로 멈춰 있습니다. 되살아난 순간 풀어 줍니다.
  */
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setSubmitting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const verb = purpose === "signup" ? "시작하기" : "로그인";
  const shownError = error ?? authError;

  return (
    // 배경 사진을 본문과 같은 폭 안에 가두어, 넓은 화면에서 얼굴만 크게
    // 확대되지 않고 휴대폰에서 보는 것과 같은 비율로 보이게 합니다.
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-canvas">
      {/*
        배경: 도산 안창호 선생 사진 (public/brand/dosan.jpg).
        파일이 없으면 아무것도 그려지지 않고 아래 막만 남으므로 화면이 깨지지 않습니다.

        사진 위에 글자를 얹기 때문에 위아래로 농도가 다른 막을 덮습니다.
        위쪽(밝은 하늘)은 얇게 덮어 사진이 보이게 하고,
        아래쪽(어두운 양복)은 짙게 덮어 버튼 글씨가 또렷하게 보이도록 했습니다.
      */}
      {/*
        사진의 시작 위치만 옮겨, 얼굴이 제목에 가리지 않고 그 아래에 놓이게 합니다(지금 값은 바로 아래 주석).
        사진을 키워서 옮기는 방법도 있지만 원본이 640px이라 흐려집니다.
        시작 위치만 내리면 화질을 그대로 두고 배치만 바꿀 수 있습니다.

        위쪽 가장자리가 선처럼 보이지 않도록 마스크로 서서히 나타나게 합니다.
      */}
      {/*
        ★ 2026-09-22 사용자 요청 — 얼굴을 "애기애타" 제목 밑으로 당기고, 제목과 사이는 조금 띄웁니다.
          예전 top-[28%]는 화면 높이에 따라 움직여 제목과의 거리가 폰마다 달랐고, 앱 아이콘을 뺀 뒤로는
          제목 아래가 크게 비었습니다. 제목은 화면 위에서 고정 거리(pt-14 + 두 줄 ≈ 125px)라
          사진도 고정 거리(top 90px)에서 시작합니다 → 머리 윗부분이 제목보다 35px쯤 아래에 옵니다(110px은 57px로 너무 멀어 20px 올림)
          (머리는 사진 위끝에서 약 85px 아래 — 2026-09-22 캡처로 잼, 그 위는 아래 마스크로 희미하게 사라지는 하늘).
          높이는 예전과 같은 72%로 둡니다 — bottom-0으로 늘리면 bg-cover가 사진을 키워 얼굴이 커집니다.
          사진 아래쪽은 어차피 짙은 막(84%부터 불투명)에 덮입니다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[90px] h-[72%] bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/brand/dosan.jpg)",
          backgroundPosition: "50% 0%",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 14%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 14%)",
        }}
      />
      {/* 아래로 갈수록 짙어지는 막 — 얼굴은 드러내고 버튼 쪽은 또렷하게 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          /*
            막의 바탕색은 globals.css의 --scrim 입니다. 값을 박아두면 어두운
            화면에서 크림색 막 위에 흰 글씨가 올라가 아무것도 안 보입니다.
          */
          background:
            "linear-gradient(to bottom, rgb(var(--scrim) / 0.5) 0%, rgb(var(--scrim) / 0.28) 38%, rgb(var(--scrim) / 0.68) 60%, rgb(var(--scrim) / 0.95) 74%, rgb(var(--scrim)) 84%)",
        }}
      />

      {/*
        아래 여백은 버튼이 사파리 하단 주소창이나 홈 인디케이터에 가리지 않을
        만큼만 남깁니다. 여백이 작을수록 문구와 버튼이 아래로 내려갑니다.
      */}
      <div
        className="login-screen relative flex min-h-dvh w-full flex-col px-7 pt-14"
        style={{ paddingBottom: "calc(36px + env(safe-area-inset-bottom))" }}
      >
        {/*
          과정 이름 + 앱 이름. 위에 있던 앱 아이콘(愛己愛他 주황 네모)은 2026-09-22 사용자 요청으로 뺐습니다.
        */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[13px] font-bold text-brand-500">{COURSE_FULL_NAME}</p>
          <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">{APP_NAME}</h1>
        </div>

        {/* 사진이 보이는 여백 */}
        <div className="flex-1" />

        {/*
          애기애타의 뜻. 상자 없이 사진 위에 바로 얹어 화면이 트여 보이게 했습니다.
          서예 로고와 결을 맞춰 명조체로 씁니다.
        */}
        <p className="text-center font-serif text-[19px] leading-relaxed font-semibold text-ink">
          {APP_DEFINITION_BODY}
        </p>

        <div className="mt-5">
          {step === "start" ? (
            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={() => goTo("login")}>로그인하기</PrimaryButton>
              <button
                type="button"
                onClick={() => goTo("signup")}
                className={secondaryButtonClassName}
              >
                회원가입하기
              </button>
            </div>
          ) : step === "phone" ? (
            <PhoneSignIn verb={verb} onBack={() => goTo(purpose)} />
          ) : (
            <div className="flex flex-col gap-3">
              {/* 구글 — 흰 단추에 구글 네 색 로고 */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className={secondaryButtonClassName}
              >
                {submitting ? <Spinner className="h-5 w-5" /> : <GoogleIcon className="h-5 w-5" />}
                구글 계정으로 {verb}
              </button>
              {/* 카카오 — 카카오 안내대로 노란 바탕(#FEE500)에 검정 말풍선·글씨. 다크 모드에서도 그대로. */}
              <button
                type="button"
                onClick={handleKakao}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-5 py-4 text-[16px] font-bold text-black/85 transition active:scale-[0.99] disabled:opacity-60"
              >
                <KakaoIcon className="h-5 w-5" />
                카톡으로 {verb}
              </button>
              <button
                type="button"
                onClick={() => goTo("phone")}
                disabled={submitting}
                className={secondaryButtonClassName}
              >
                <PhoneIcon className="h-5 w-5" />
                휴대폰 번호로 {verb}
              </button>

              <button
                type="button"
                onClick={() => goTo("start")}
                className="mt-1 self-center text-[13px]! font-bold text-ink-muted"
              >
                처음으로
              </button>
            </div>
          )}

          {shownError ? (
            <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
              {shownError}
            </p>
          ) : null}

          {step === "login" ? (
            <p className="mt-3 text-center text-[12px] text-ink-muted">
              가입할 때 쓴 방법으로 로그인해 주세요. 다른 방법으로 들어오면 새 계정이 만들어져요.
            </p>
          ) : null}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium text-ink-muted">
            <LockIcon className="h-4 w-4" />
            {COHORT} 원우들을 위한 공간이에요
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 휴대폰 번호로 시작하기 / 로그인 (2026-09-22).
 * 번호를 넣고 "인증번호 받기" → 문자로 온 6자리를 넣고 "확인". 로그인되면 StageGate가 다음 화면으로 보냅니다.
 */
function PhoneSignIn({ verb, onBack }: { verb: string; onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이 화면을 떠나면 로봇 확인을 버립니다(이유는 lib/phone-login.ts의 resetVerifier).
  useEffect(() => () => resetVerifier(), []);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const e164 = toE164Korean(phone);
    if (!e164) {
      setError("010으로 시작하는 휴대폰 번호를 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setConfirmation(await sendPhoneCode(e164));
    } catch (caught) {
      setError(phoneErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmation) return;
    if (!/^\d{6}$/.test(code)) {
      setError("문자로 받은 6자리 숫자를 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmation.confirm(code);
      // 성공하면 로그인 상태가 바뀌면서 StageGate가 다음 화면으로 보냅니다. busy는 그대로 둡니다.
    } catch (caught) {
      setError(phoneErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <div>
      {confirmation ? (
        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
          <p className="text-center text-[14px] font-medium text-ink-soft">
            {phone}로 보낸 인증번호 6자리를 넣어 주세요.
          </p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="인증번호 6자리"
            aria-label="인증번호"
            autoFocus
            className={`${inputClassName} text-center tracking-[0.3em]`}
          />
          <PrimaryButton type="submit" loading={busy}>
            확인
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null);
              setCode("");
              setError(null);
              resetVerifier();
            }}
            className="mt-1 self-center text-[13px]! font-bold text-ink-muted"
          >
            번호 다시 넣기
          </button>
        </form>
      ) : (
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <input
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-1234-5678"
            aria-label="휴대폰 번호"
            autoFocus
            className={`${inputClassName} text-center`}
          />
          <PrimaryButton type="submit" loading={busy}>
            {busy ? null : <PhoneIcon className="h-5 w-5" />}
            인증번호 받기
          </PrimaryButton>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 self-center text-[13px]! font-bold text-ink-muted"
          >
            다른 방법으로 {verb}
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      {/* 보이지 않는 로봇 확인(reCAPTCHA)이 붙는 자리. 의심스러울 때만 여기서 창이 뜹니다. */}
      <div id={PHONE_RECAPTCHA_ID} />
    </div>
  );
}
