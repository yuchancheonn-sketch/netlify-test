import type { FirebaseError } from "firebase/app";
import { PhoneAuthProvider, signInWithCredential, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * 계정 합치기 — 브라우저 쪽 (2026-09-22). 규칙과 이유는 lib/account-link-server.ts 맨 위.
 */

export type LinkMatch = "none" | "needs-phone" | "phone-mismatch" | "merged";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  // 휴대폰을 방금 이어 붙였으면 토큰에 번호가 들어가도록 새로 받습니다(true).
  const idToken = await user.getIdToken(true);
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(`account-link ${response.status}`);
  return (await response.json()) as T;
}

/**
 * 첫 프로필 설정에서 같은 원우 계정이 있는지 묻습니다.
 * "merged"면 이미 본계정으로 바꿔 탔습니다(StageGate가 홈으로 보냄).
 */
export async function linkToExistingMember(
  name: string,
  cohort: string,
  phone: string,
): Promise<LinkMatch> {
  const result = await post<{ match: LinkMatch; token?: string }>("/api/account/link", {
    name,
    cohort,
    phone,
  });
  if (result.match === "merged" && result.token) {
    await signInWithCustomToken(auth, result.token);
  }
  return result.match;
}

/**
 * 합치려는 번호가 이미 휴대폰 로그인 계정일 때 (2026-09-23).
 * 이어 붙이기가 auth/credential-already-in-use로 막히면, 그 오류에 담긴 인증(문자 확인은 끝남)으로
 * 번호 계정에 로그인을 바꾸고, 바꾸기 전 계정을 서버가 그쪽에 잇게 합니다.
 * 성공하면 true — 번호 계정(또는 그 본계정)으로 들어와 있습니다.
 */
export async function adoptIntoPhoneAccount(caught: unknown): Promise<boolean> {
  const credential = PhoneAuthProvider.credentialFromError(caught as FirebaseError);
  const before = auth.currentUser;
  if (!credential || !before) return false;
  const aliasIdToken = await before.getIdToken();
  await signInWithCredential(auth, credential);
  const result = await post<{ merged: boolean; token: string | null }>("/api/account/adopt", {
    aliasIdToken,
  });
  if (result.token) await signInWithCustomToken(auth, result.token);
  return true;
}

/** 이 로그인이 본계정에 이어져 있으면 본계정으로 바꿔 탑니다. 바꿨으면 true. */
export async function switchToLinkedAccount(): Promise<boolean> {
  const result = await post<{ token: string | null }>("/api/account/resolve");
  if (!result.token) return false;
  await signInWithCustomToken(auth, result.token);
  return true;
}
