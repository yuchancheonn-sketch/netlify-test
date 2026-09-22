import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import { cohortOf } from "@/lib/cohort";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

/**
 * 계정 합치기 — 서버 전용 (2026-09-22 사용자 요청).
 *
 * "카카오톡으로 로그인하더라도 같은 기수에서 이름이 같다면 구글 계정과 똑같은 계정주로 보고 계정 하나로.
 *  판단 기준은 이름 및 전화번호."
 *
 * ★ 어떻게 하나
 *   구글·카카오·휴대폰 로그인은 Firebase에서 각각 다른 계정 id(uid)가 됩니다. uid 자체를 합칠 수는 없어서,
 *   새로 들어온 쪽 uid(= 별칭)를 원래 계정 uid(= 본계정)에 **이어 두고**, 별칭으로 로그인하면 서버가
 *   본계정의 로그인 표(custom token)를 내줘 본계정으로 들어가게 합니다.
 *     accountLinks/{별칭 uid} = { primaryUid, method, linkedAt }   ← 서버만 읽고 씀(규칙에 안 적음 = 앱에서 막힘)
 *   - 카카오: /api/auth/kakao가 로그인 표를 만들 때 곧바로 본계정 표를 줍니다.
 *   - 휴대폰: 로그인 뒤 가입 화면(join)이 /api/account/resolve로 물어 본계정으로 바꿔 탑니다.
 *
 * ★ 언제 잇나 — 첫 프로필 설정(onboarding)에서 이름·기수를 넣고 저장할 때(/api/account/link).
 *   같은 기수 · 같은 이름 · 같은 휴대폰 번호인 **완성된 계정이 딱 하나** 있을 때만 잇습니다.
 *
 * ★ 휴대폰 번호는 "인증된 번호"로만 견줍니다 — 적어 넣은 번호로는 잇지 않습니다.
 *   원우수첩에는 모든 원우의 이름·번호가 보여서, 적은 번호만 믿으면 다른 원우의 계정을 가로챌 수 있습니다.
 *   그래서 로그인 토큰의 phone_number(Firebase가 문자로 확인한 번호)와 상대 계정의 휴대폰 칸을 견줍니다.
 *   휴대폰 로그인은 이미 인증돼 있고, 카카오는 합칠 때 한 번 문자 인증을 거칩니다.
 */

export const ACCOUNT_LINKS = "accountLinks";

const digits = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : "");

/** "+821012345678" → "01012345678" */
function localDigits(e164: string | undefined): string {
  if (!e164?.startsWith("+82")) return "";
  return `0${e164.slice(3)}`;
}

/** 별칭이면 본계정 uid, 아니면 그대로. */
export async function primaryUidOf(db: Firestore, uid: string): Promise<string> {
  const snap = await db.collection(ACCOUNT_LINKS).doc(uid).get();
  const primary = snap.get("primaryUid");
  return typeof primary === "string" && primary ? primary : uid;
}

type Authed = { token: DecodedIdToken; db: Firestore; auth: Auth } | { response: Response };

export async function authorizeAccountRequest(request: Request): Promise<Authed> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return { response: Response.json({ ok: false, reason: "not-configured" }, { status: 503 }) };
  }
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    return { token: await auth.verifyIdToken(idToken), db, auth };
  } catch {
    return { response: Response.json({ ok: false, reason: "unauthorized" }, { status: 401 }) };
  }
}

/** 같은 기수 · 같은 이름인 완성된 원우 계정들(나 자신·별칭은 빼고). */
async function sameNameMembers(db: Firestore, uid: string, name: string, cohort: string) {
  const snapshot = await db.collection("users").where("name", "==", name).limit(20).get();
  const links = await Promise.all(
    snapshot.docs.map((doc) => db.collection(ACCOUNT_LINKS).doc(doc.id).get()),
  );
  return snapshot.docs.filter(
    (doc, index) =>
      doc.id !== uid &&
      !links[index].exists &&
      doc.get("status") === "approved" &&
      doc.get("profileCompleted") === true &&
      cohortOf(doc.get("cohort") as string | undefined) === cohort,
  );
}

export type LinkOutcome =
  | { match: "none" }
  /** 같은 이름의 원우는 있는데 인증된 번호가 없음 — 문자 인증 뒤 다시 물어야 함 */
  | { match: "needs-phone" }
  /** 인증된 번호가 그 원우의 번호와 다름 */
  | { match: "phone-mismatch" }
  | { match: "merged"; token: string };

/**
 * 첫 프로필 설정에서 부릅니다. 합쳐지면 본계정 로그인 표를 돌려줍니다.
 * 합칠 때 별칭 쪽의 반쯤 만든 users 문서(가입 직후 자동으로 생긴 것)는 지웁니다 — 원우수첩에 두 명으로 서지 않게.
 */
export async function linkIfSameMember(
  db: Firestore,
  auth: Auth,
  token: DecodedIdToken,
  name: string,
  cohortInput: string,
): Promise<LinkOutcome> {
  const uid = token.uid;
  const cohort = cohortOf(cohortInput);

  // 구글 계정끼리는 합치지 않습니다 — 요청 범위는 카카오·휴대폰으로 새로 온 계정입니다.
  if (token.firebase?.sign_in_provider === "google.com") return { match: "none" };

  // 이미 프로필을 다 만든 계정은 합치지 않습니다(그쪽 기록이 사라질 수 있음).
  const mine = await db.collection("users").doc(uid).get();
  if (mine.exists && mine.get("profileCompleted") === true) return { match: "none" };

  const candidates = (await sameNameMembers(db, uid, name.trim(), cohort)).filter((doc) =>
    digits(doc.get("phone")),
  );
  if (candidates.length === 0) return { match: "none" };

  const verified = localDigits(token.phone_number);
  if (!verified) return { match: "needs-phone" };

  const same = candidates.filter((doc) => digits(doc.get("phone")) === verified);
  if (same.length !== 1) return { match: same.length === 0 ? "phone-mismatch" : "none" };

  const primaryUid = same[0].id;
  const method = uid.startsWith("kakao:") ? "kakao" : "phone";
  await db.collection(ACCOUNT_LINKS).doc(uid).set({
    primaryUid,
    method,
    name: name.trim(),
    cohort,
    linkedAt: FieldValue.serverTimestamp(),
  });
  if (mine.exists) await mine.ref.delete();
  return { match: "merged", token: await auth.createCustomToken(primaryUid, { linkedFrom: uid }) };
}
