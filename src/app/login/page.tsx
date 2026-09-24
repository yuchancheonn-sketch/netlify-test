"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ConfirmationResult } from "firebase/auth";
import StageGate from "@/components/StageGate";
import {
  ChevronLeftIcon,
  GoogleIcon,
  KakaoIcon,
  PhoneIcon,
  XMarkIcon,
} from "@/components/icons";
import { PrimaryButton, Spinner } from "@/components/ui";
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
 * ★ 구글·카톡·휴대폰은 처음엔 다른 계정이지만, 처음 온 원우는 첫 프로필에서 인증된 번호가 같은
 *   기존 계정에 합쳐집니다(2026-09-22 사용자 요청, 2026-09-23부터 번호 하나로 판단 — lib/account-link-server.ts).
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

  // 휴대폰 번호 단계는 사진 화면 대신 화면 하나를 통째로 씁니다(2026-09-22 사용자 요청 — 아래 PhoneSignIn).
  if (step === "phone") return <PhoneSignIn onBack={() => goTo(purpose)} />;

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
          사진도 고정 거리에서 시작합니다. 110px(사이 57px) → 90px(사이 35px) → 55px(머리가 제목 바로 밑)
          → -15px("70px 위로" — 머리가 "애기애타" 글자 뒤로 올라가 겹침) → 다시 55px("70px 내려줘") → 155px(같은 날 "100px 내려줘" — 제목과 머리 사이가 넉넉히 뜸)
          (머리는 사진 위끝에서 약 85px 아래 — 2026-09-22 캡처로 잼, 그 위는 아래 마스크로 희미하게 사라지는 하늘).
          높이는 예전과 같은 72%로 둡니다 — bottom-0으로 늘리면 bg-cover가 사진을 키워 얼굴이 커집니다.
          ★ 사진을 위로 올리면 사진 아래 끝이 문구("나를 사랑하고…") 바로 밑, 막이 아직 덜 짙은 곳에 와서
            가로줄처럼 드러납니다. 그래서 마스크로 아래 끝도 위 끝처럼 서서히 사라지게 합니다(80%→100%).
      */}
      <div
        aria-hidden="true"
        // 173px — 제목 글씨를 키우며(2026-09-22) 155px에서 18px 내림. 위 주석의 155px 이야기는 그 전 기록입니다.
        className="pointer-events-none absolute inset-x-0 top-[173px] h-[72%] bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/brand/dosan.jpg)",
          backgroundPosition: "50% 0%",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 80%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 80%, transparent 100%)",
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

            ★ 얼굴 자리(화면 약 30~60%)는 막을 옅게 (2026-09-25 사용자 "얼굴이 조금 더 선명하게").
              예전 값: 0.5 0% · 0.28 38% · 0.68 60% · 0.95 74% · 1 84% — 38%→60% 사이에서 막이 짙어져 턱·입이 뿌옇게 덮였습니다.
              이제 30%~54%를 0.12로 두고, 문구("나를 사랑하고…", 약 70%) 앞에서 빠르게 짙어집니다. 74% 뒤(문구·단추)는 그대로입니다.
          */
          background:
            "linear-gradient(to bottom, rgb(var(--scrim) / 0.5) 0%, rgb(var(--scrim) / 0.12) 30%, rgb(var(--scrim) / 0.12) 54%, rgb(var(--scrim) / 0.7) 66%, rgb(var(--scrim) / 0.95) 74%, rgb(var(--scrim)) 84%)",
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
        {/*
          글씨 크기 — 2026-09-22 사용자 요청 "훨씬 키워줘": 과정 이름 13 → 18px, 앱 이름 30 → 44px.
          제목이 약 18px 길어진 만큼 아래 사진 시작점(top-[155px])도 173px로 함께 내렸습니다 — 제목과 머리 사이 간격을 그대로 두려고.
        */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[18px] font-bold text-brand-500">{COURSE_FULL_NAME}</p>
          <h1 className="mt-1 text-[44px] leading-tight font-bold tracking-tight text-ink">{APP_NAME}</h1>
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
            /*
              두 단추 높이 56px → 50px (2026-09-22 사용자 요청 "조금씩 줄여줘").
              로그인하기는 PrimaryButton field(위아래 13px), 회원가입하기는 테두리 1px + 위아래 12px로 같은 50px.
              가입 방법 목록(구글·카톡·휴대폰) 단추는 그대로 56px입니다.
            */
            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={() => goTo("login")} size="field">
                로그인하기
              </PrimaryButton>
              <button
                type="button"
                onClick={() => goTo("signup")}
                className={`${secondaryButtonClassName} py-[12px]!`}
              >
                회원가입하기
              </button>
            </div>
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
              이미 가입했다면 다른 방법으로 들어와도 휴대폰 번호가 같으면 원래 계정으로 합쳐져요.
            </p>
          ) : null}

          {/*
            로그인 없이 둘러보기 (2026-09-24 사용자 요청 "보는 것만큼 로그인 없이") — 홈으로. 올리기·수정할 때 다시 로그인을 안내합니다.
          */}
          <Link
            href="/home"
            className="mt-5 block text-center text-[14px] font-bold text-ink-muted underline underline-offset-4"
          >
            로그인 없이 둘러보기
          </Link>

          {/* 맨 아래 "🔒 10기 원우들을 위한 공간이에요" 줄은 2026-09-22 사용자 요청으로 지웠습니다. */}
        </div>
      </div>
    </div>
  );
}

/** 화면에서 지금 보이는 부분(자판을 뺀 곳)이 바뀔 때 알려 줍니다. */
function subscribeViewport(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  viewport?.addEventListener("scroll", onChange);
  return () => {
    viewport?.removeEventListener("resize", onChange);
    viewport?.removeEventListener("scroll", onChange);
  };
}

/**
 * 지금 보이는 부분의 "위 끝:높이" (CSS px). 문자열로 돌려주는 건 useSyncExternalStore가 값이 같으면
 * 다시 그리지 않게 하려는 것입니다.
 * 보기 설정의 글씨 크기가 html zoom(0.9·1.15)이라, 우리가 적는 px도 그만큼 늘거나 줄어듭니다 — 그래서 zoom으로 나눕니다.
 */
function viewportSnapshot(): string {
  const viewport = window.visualViewport;
  if (!viewport) return "";
  const zoom = Number(getComputedStyle(document.documentElement).zoom) || 1;
  return `${Math.round(viewport.offsetTop / zoom)}:${Math.round(viewport.height / zoom)}`;
}

/**
 * 휴대폰 번호로 시작하기 / 로그인 (2026-09-22).
 * 번호를 넣고 "인증번호 받기" → 문자로 온 6자리를 넣고 "확인". 로그인되면 StageGate가 다음 화면으로 보냅니다.
 *
 * ★ 모양 (2026-09-22 사용자 요청 — 사용자가 보낸 캡처처럼):
 *   왼쪽 위 뒤로(‹) · 큰 제목 "전화번호를 입력해주세요" · 🇰🇷 + 큰 번호 칸(회색 자리글씨 010-0000-0000,
 *   넣은 번호는 브랜드색) · 오른쪽 끝 지우기(×) · 자판 바로 위 주황 "인증번호 받기" 상자.
 *   캡처는 보라색이지만 앱 브랜드색(주황)으로 맞췄습니다.
 * ★ 아래 단추가 자판 바로 위에 붙도록, 화면을 지금 보이는 부분(visualViewport)에 맞춘 세로 칸으로 그리고 단추를 맨 아래에 둡니다.
 *   입력칸에 커서가 있는 동안(=자판이 떠 있는 동안)엔 아래 안전 영역 여백을 걷습니다(이유는 chat/[roomId]/page.tsx 주석).
 */
function PhoneSignIn({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 입력칸에 커서가 있는지 — 자판이 떠 있는 동안 아래 여백을 걷는 데 씁니다. */
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  /** 인증번호 단계에서 번호 단계로 되돌아갑니다(뒤로 ‹ 와 "번호 다시 넣기"). */
  function backToPhone() {
    setConfirmation(null);
    setCode("");
    setError(null);
    resetVerifier();
  }

  const value = confirmation ? code : phone;
  const viewport = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "");
  const [viewportTop, viewportHeight] = viewport ? viewport.split(":").map(Number) : [0, 0];

  function clearValue() {
    if (confirmation) setCode("");
    else setPhone("");
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={confirmation ? handleConfirm : handleSend}
      onFocus={() => setTyping(true)}
      onBlur={() => setTyping(false)}
      /*
        화면을 "지금 보이는 부분"(자판 위)에 딱 맞춥니다 — 그래야 아래 단추가 자판 바로 위에 섭니다.
        아이폰 사파리는 자판이 떠도 화면 높이(dvh)를 줄이지 않아, h-dvh만으로는 단추가 자판 뒤에 숨었습니다.
        보이는 부분의 크기는 아래 viewportSnapshot. 값을 모르는 첫 그림(서버)에서만 h-dvh로 둡니다.
      */
      className={`mx-auto flex w-full max-w-[480px] flex-col bg-canvas ${
        viewport ? "fixed inset-x-0" : "h-dvh"
      }`}
      style={viewport ? { top: viewportTop, height: viewportHeight } : undefined}
    >
      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={confirmation ? backToPhone : onBack}
          aria-label="뒤로"
          className="-ml-2.5 flex h-11 w-11 items-center justify-center text-ink"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>

        <h1 className="mt-6 text-[26px] font-bold tracking-tight text-ink">
          {confirmation ? "인증번호를 입력해주세요" : "전화번호를 입력해주세요"}
        </h1>
        {confirmation ? (
          <p className="mt-2 text-[14px] text-ink-muted">{phone}로 보낸 6자리 숫자예요</p>
        ) : null}

        {/*
          큰 번호 칸 — 글씨 34px 굵게, 넣은 번호는 브랜드색, 자리글씨는 흐린 회색.
          번호 단계에만 앞에 🇰🇷 를 붙입니다. 칸이 비어 있지 않으면 오른쪽 끝에 지우기(×)가 뜹니다.
        */}
        <div className="mt-6 flex items-center gap-3">
          {confirmation ? null : (
            <span aria-hidden="true" className="shrink-0 text-[26px] leading-none">
              🇰🇷
            </span>
          )}
          <input
            ref={inputRef}
            key={confirmation ? "code" : "phone"}
            value={value}
            onChange={(event) => {
              setError(null);
              if (confirmation) setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              else setPhone(formatPhoneInput(event.target.value));
            }}
            inputMode="numeric"
            autoComplete={confirmation ? "one-time-code" : "tel"}
            placeholder={confirmation ? "000000" : "010-0000-0000"}
            aria-label={confirmation ? "인증번호" : "휴대폰 번호"}
            autoFocus
            /*
              text-[36px]! — 캡처처럼 크게(2026-09-22 사용자 요청, 34px에서 올림).
              ! 가 꼭 있어야 합니다: globals.css의 input { font-size: 16px }(iOS 확대 막기)가 Tailwind 크기를 이겨서,
              ! 없이 적었을 땐 폰에서 16px로 작게 보였습니다.
            */
            className={`min-w-0 flex-1 bg-transparent py-1 text-[36px]! font-bold text-brand-500 caret-brand-500 outline-none tabular-nums placeholder:text-ink-faint/50 ${
              confirmation ? "tracking-[0.15em]" : "tracking-tight"
            }`}
          />
          {value ? (
            <button
              type="button"
              // 누르는 순간 입력칸이 커서를 잃으면 자판이 내려갔다 올라옵니다 — 커서를 그대로 둡니다.
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearValue}
              aria-label="지우기"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-faint/40 text-surface"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}

        {confirmation ? (
          <button
            type="button"
            onClick={backToPhone}
            className="mt-5 text-[14px] font-bold text-ink-muted underline underline-offset-4"
          >
            번호 다시 넣기
          </button>
        ) : null}

        {/* 보이지 않는 로봇 확인(reCAPTCHA)이 붙는 자리. 의심스러울 때만 여기서 창이 뜹니다. */}
        <div id={PHONE_RECAPTCHA_ID} />
      </div>

      {/*
        맨 아래 단추 — 자판이 떠 있으면 자판 바로 위(여백 12px), 아니면 홈 바 위로 안전 영역만큼 띄웁니다.
        늘 주황 상자입니다(2026-09-22 사용자 요청 "주황색 박스로" — 처음엔 번호가 덜 차면 회색이었음).
        덜 찬 채로 누르면 handleSend/handleConfirm이 빨간 안내를 띄웁니다.
      */}
      <div
        className="px-6 pt-3"
        style={{ paddingBottom: typing ? "12px" : "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <button
          type="submit"
          disabled={busy}
          // 단추를 눌러도 자판이 내려가지 않게 커서를 입력칸에 둡니다.
          onMouseDown={(event) => event.preventDefault()}
          // py-[13px] — 약 50px (2026-09-22 사용자 요청 "높이 줄여줘", py-4 16px·약 56px에서 줄임 — 앱의 PrimaryButton field와 같은 높이).
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-[13px] text-[16px] font-bold text-white transition active:scale-[0.99]"
        >
          {busy ? <Spinner className="h-5 w-5" /> : null}
          {confirmation ? "확인" : "인증번호 받기"}
        </button>
      </div>
    </form>
  );
}
