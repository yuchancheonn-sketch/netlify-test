import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * 휴대폰 번호 로그인 (2026-09-22).
 *
 * Firebase가 기본으로 주는 방법이라 서버가 따로 필요 없습니다.
 *   1. 번호를 넣으면 Firebase가 문자로 6자리 인증번호를 보냅니다.
 *   2. 그 번호를 넣으면 로그인됩니다. 계정 id는 번호마다 하나로 정해집니다.
 *
 * ★ 로봇 확인(reCAPTCHA)이 꼭 따라붙습니다. 보이지 않는(invisible) 방식이라 보통은 아무것도 안 뜨고,
 *   의심스러울 때만 그림 고르기 창이 뜹니다. 그 창을 붙일 빈 자리(PHONE_RECAPTCHA_ID)가 화면에 있어야 합니다.
 *
 * ★ 문자는 공짜가 아닙니다(Firebase 요금제의 휴대폰 인증 요금). 콘솔 Authentication → 로그인 방법에서
 *   "전화"를 켜야 동작하고, 안 켜면 auth/operation-not-allowed가 납니다.
 */

export const PHONE_RECAPTCHA_ID = "phone-recaptcha";

let verifier: RecaptchaVerifier | null = null;

function getVerifier(): RecaptchaVerifier {
  if (!verifier) {
    verifier = new RecaptchaVerifier(auth, PHONE_RECAPTCHA_ID, { size: "invisible" });
  }
  return verifier;
}

/**
 * 로봇 확인을 버립니다. 실패한 뒤 다시 보낼 때, 그리고 휴대폰 화면을 떠날 때 부릅니다 —
 * 화면을 다시 열면 붙일 자리(div)가 새로 만들어지는데, 옛 확인은 사라진 자리를 붙잡고 있기 때문입니다.
 */
export function resetVerifier() {
  verifier?.clear();
  verifier = null;
}

/** "010-1234-5678" → "+821012345678". 한국 휴대폰 번호가 아니면 null. */
export function toE164Korean(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(digits)) return null;
  return `+82${digits.slice(1)}`;
}

/** "+821012345678" → "010-1234-5678". 가입할 때 프로필의 휴대폰 칸을 미리 채우는 데 씁니다. */
export function fromE164Korean(e164: string | null | undefined): string {
  if (!e164?.startsWith("+82")) return "";
  const digits = `0${e164.slice(3)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

/** 인증번호 문자를 보냅니다. 돌려받은 값의 confirm(code)로 로그인을 마칩니다. */
export async function sendPhoneCode(e164: string): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, e164, getVerifier());
  } catch (caught) {
    // 실패한 뒤 다시 보낼 때는 로봇 확인을 새로 받아야 합니다.
    resetVerifier();
    throw caught;
  }
}

/**
 * 지금 로그인한 계정(카카오 등)에 휴대폰 번호를 **이어 붙이는** 인증 문자를 보냅니다 (2026-09-22, 계정 합치기용).
 * 로그인은 그대로이고, confirm(code)이 끝나면 이 계정에 "인증된 번호"가 생깁니다 — lib/account-link-server.ts가 그 번호로 견줍니다.
 */
export async function sendLinkPhoneCode(e164: string): Promise<ConfirmationResult> {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error("not-signed-in"), { code: "auth/no-current-user" });
  try {
    return await linkWithPhoneNumber(user, e164, getVerifier());
  } catch (caught) {
    resetVerifier();
    throw caught;
  }
}

/** 휴대폰 로그인에서 난 오류를 원우가 읽을 문장으로. */
export function phoneErrorMessage(caught: unknown): string {
  const code = (caught as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "휴대폰 번호를 다시 확인해 주세요.";
    case "auth/invalid-verification-code":
      return "인증번호가 맞지 않아요. 문자를 다시 확인해 주세요.";
    case "auth/code-expired":
      return "인증번호가 만료됐어요. 다시 받아 주세요.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요.";
    case "auth/operation-not-allowed":
      return "휴대폰 번호 로그인이 아직 켜져 있지 않아요. 운영진에게 알려주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인하고 다시 시도해 주세요.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "이 번호는 이미 다른 로그인에 쓰이고 있어요. 그 방법(휴대폰 번호)으로 로그인해 주세요.";
    case "auth/provider-already-linked":
      return "이 계정에는 이미 휴대폰 번호가 이어져 있어요.";
    default:
      return `인증하지 못했어요. 잠시 후 다시 시도해 주세요.${code ? ` (${code})` : ""}`;
  }
}
