import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import { cohortOf } from "@/lib/cohort";
import { formatPhone } from "@/lib/format";
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
 * ★ 언제 잇나 — 첫 프로필 설정(onboarding)에서 저장할 때(/api/account/link).
 *   ★ 2026-09-23 사용자 "등록한 전화번호가 같으면 무조건 같은 계정으로 판단하고 합쳐서 하나로":
 *     **전화번호 하나로만** 판단합니다. 이름·기수가 달라도, 구글로 새로 들어왔어도 합칩니다.
 *     (예전엔 같은 기수 · 같은 이름 · 같은 번호, 카카오·휴대폰 로그인만이었습니다.)
 *   같은 번호의 완성된 계정이 여럿이면(예전에 따로 만든 계정들) 가장 먼저 만든 계정에 잇습니다.
 *
 * ★ 휴대폰 번호는 "인증된 번호"로만 견줍니다 — 적어 넣은 번호로는 잇지 않습니다.
 *   원우수첩에는 모든 원우의 이름·번호가 보여서, 적은 번호만 믿으면 다른 원우의 계정을 가로챌 수 있습니다.
 *   그래서 로그인 토큰의 phone_number(Firebase가 문자로 확인한 번호)와 상대 계정의 휴대폰 칸을 견줍니다.
 *   휴대폰 로그인은 이미 인증돼 있고, 카카오는 합칠 때 한 번 문자 인증을 거칩니다.
 */

/*
 * ── 2026-10-06 사용자 요청 (보안 점검 후 수정): 전화번호 "증명"을 서버가 따로 기록합니다 ──
 *
 * 문제: 예전에는 상대 계정의 `users.phone`(원우 누구나 고칠 수 있던 칸)이 인증 번호와 같으면 그 계정에 합쳐
 *   줬습니다. 공격자가 피해자(운영진 포함)의 users.phone을 자기 번호로 바꿔 놓고 자기 번호를 문자 인증하면
 *   피해자 계정의 로그인 표를 받아 갈 수 있었습니다.
 * 해결: users.phone은 이제 **후보를 찾는 힌트일 뿐 증명이 아닙니다.** 후보 계정이 그 번호를 서버 쪽에서
 *   증명했을 때만 합칩니다(아래 provedPhone). 증명 = 다음 중 하나
 *     ① `verifiedPhones/{번호 숫자}` = { uid, at } — 서버(Admin SDK)가 문자로 인증된 로그인 토큰(phone_number)을
 *        볼 때 적어 둔 기록. 규칙에 적지 않아 앱에서는 읽지도 쓰지도 못합니다. uid는 **본계정** uid입니다.
 *     ② 후보 계정의 Firebase Auth 기록에 그 번호가 있음(휴대폰 로그인 계정이거나 번호를 이어 붙인 계정 —
 *        Firebase가 문자 인증을 거쳐야만 넣는 값이라 클라이언트가 바꿀 수 없음). 찾으면 ①에 되적어 둡니다.
 *     ③ 후보 계정에 합쳐진 별칭(accountLinks) 중 하나의 Auth 기록에 그 번호가 있음. 찾으면 ①에 되적어 둡니다.
 *   ②·③이 "옛 계정 이월(backfill)"입니다 — 휴대폰으로 가입한 기존 원우는 따로 할 일 없이 계속 합쳐집니다.
 * ★ 이월의 한계: 구글·카카오로 가입하고 번호를 **손으로 적기만 했던** 계정은 증명이 없어서, 같은 번호로 나중에 들어온
 *   다른 로그인과 자동으로 합쳐지지 않습니다(새 계정이 따로 생김). 그 원우가 한 번 휴대폰 인증을 하거나(번호를 계정에
 *   이어 붙임) 운영진이 합쳐 줘야 합니다. 운영진(role=admin) 계정은 같은 기준이라 번호 증명이 없으면 절대 조용히 합쳐지지 않습니다.
 */
export const ACCOUNT_LINKS = "accountLinks";
export const VERIFIED_PHONES = "verifiedPhones";

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

/**
 * 문자 인증된 로그인 토큰을 봤으면 "이 번호는 이 본계정이 증명했다"고 서버에만 적어 둡니다.
 * owner는 호출한 쪽이 정합니다(합친 뒤라면 본계정). 실패해도 로그인 흐름은 막지 않습니다.
 */
export async function recordVerifiedPhone(db: Firestore, token: DecodedIdToken, ownerUid: string) {
  const number = localDigits(token.phone_number);
  if (!/^01\d{8,9}$/.test(number)) return;
  try {
    await db.collection(VERIFIED_PHONES).doc(number).set({ uid: ownerUid, at: FieldValue.serverTimestamp() });
  } catch (caught) {
    console.error("[account-link] 번호 증명 기록 실패", caught);
  }
}

/** 후보 계정(본계정)이 이 번호를 서버 쪽에서 증명했는가 — 위 설명의 ①②③. */
async function provedPhone(db: Firestore, auth: Auth, candidateUid: string, phoneDigits: string) {
  const record = await db.collection(VERIFIED_PHONES).doc(phoneDigits).get();
  if (record.exists && record.get("uid") === candidateUid) return true;

  let proven = false;
  try {
    const own = await auth.getUser(candidateUid);
    proven = localDigits(own.phoneNumber) === phoneDigits;
    if (!proven) {
      const aliases = await db
        .collection(ACCOUNT_LINKS)
        .where("primaryUid", "==", candidateUid)
        .limit(10)
        .get();
      for (const alias of aliases.docs) {
        const user = await auth.getUser(alias.id).catch(() => null);
        if (user && localDigits(user.phoneNumber) === phoneDigits) {
          proven = true;
          break;
        }
      }
    }
  } catch {
    proven = false;
  }
  if (proven && !record.exists) {
    // 이월 — 다음부터는 Auth를 다시 뒤지지 않게 적어 둡니다(이미 다른 계정 기록이 있으면 덮지 않음).
    await db
      .collection(VERIFIED_PHONES)
      .doc(phoneDigits)
      .create({ uid: candidateUid, at: FieldValue.serverTimestamp(), backfilled: true })
      .catch(() => {});
  }
  return proven;
}

/**
 * 이 번호로 된 완성된 원우 계정들(나 자신·별칭은 빼고), 먼저 만든 계정부터.
 * users.phone은 formatPhone 모양("010-1234-5678")으로 저장되지만, 숫자만 적힌 옛 문서도 함께 찾습니다.
 *
 * ★ users.phone(클라이언트가 고칠 수 있는 칸)은 **후보를 찾는 데만** 씁니다. 실제로 후보가 되려면
 *   그 번호를 서버 쪽에서 증명한 계정이어야 합니다(provedPhone, 맨 위 2026-10-06 설명).
 */
async function samePhoneMembers(db: Firestore, auth: Auth, uid: string, phoneDigits: string) {
  if (!/^01\d{8,9}$/.test(phoneDigits)) return [];
  const snapshot = await db
    .collection("users")
    .where("phone", "in", [...new Set([formatPhone(phoneDigits), phoneDigits])])
    .limit(20)
    .get();
  const docs = [...snapshot.docs];
  // 번호를 증명한 계정은 users.phone이 달라도(예: 별칭으로 증명) 후보에 넣습니다.
  const proofOwner = (await db.collection(VERIFIED_PHONES).doc(phoneDigits).get()).get("uid");
  if (typeof proofOwner === "string" && !docs.some((doc) => doc.id === proofOwner)) {
    const extra = await db.collection("users").doc(proofOwner).get();
    if (extra.exists) docs.push(extra as unknown as (typeof docs)[number]);
  }
  const links = await Promise.all(docs.map((doc) => db.collection(ACCOUNT_LINKS).doc(doc.id).get()));
  const createdMs = (doc: (typeof docs)[number]) =>
    (doc.get("createdAt") as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Infinity;
  const basic = docs.filter(
    (doc, index) =>
      doc.id !== uid &&
      !links[index].exists &&
      doc.get("status") === "approved" &&
      doc.get("profileCompleted") === true,
  );
  const proofs = await Promise.all(basic.map((doc) => provedPhone(db, auth, doc.id, phoneDigits)));
  return basic.filter((_, index) => proofs[index]).sort((a, b) => createdMs(a) - createdMs(b));
}

export type LinkOutcome =
  | { match: "none" }
  /** 적은 번호의 원우 계정이 있는데 이 로그인에 인증된 번호가 없음 — 문자 인증 뒤 다시 물어야 함 */
  | { match: "needs-phone" }
  /** 문자로 인증한 번호로 된 계정이 없음(적은 번호와 다른 번호를 인증함) */
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
  /** 프로필에 적은 전화번호 — 인증된 번호가 아직 없을 때 "합칠 계정이 있나"만 가늠하는 데 씁니다. */
  typedPhone: string,
): Promise<LinkOutcome> {
  const uid = token.uid;
  const cohort = cohortOf(cohortInput);

  // 이미 프로필을 다 만든 계정은 합치지 않습니다(그쪽 기록이 사라질 수 있음).
  const mine = await db.collection("users").doc(uid).get();
  if (mine.exists && mine.get("profileCompleted") === true) {
    await recordVerifiedPhone(db, token, await primaryUidOf(db, uid));
    return { match: "none" };
  }

  const verified = localDigits(token.phone_number);
  if (!verified) {
    // 적은 번호로만 가늠합니다 — 합치는 것은 문자 인증 뒤에만(맨 위 "인증된 번호" 설명).
    const typed = await samePhoneMembers(db, auth, uid, digits(typedPhone));
    return { match: typed.length > 0 ? "needs-phone" : "none" };
  }

  // ★ 증명 기록은 "합칠 계정을 찾은 뒤"에 적습니다 — 먼저 적으면 내 uid가 그 번호의 주인으로 덮여 후보 확인이 흔들립니다.
  const same = await samePhoneMembers(db, auth, uid, verified);
  if (same.length === 0) {
    // 휴대폰 로그인이라 처음부터 인증돼 있던 경우엔 그냥 새 계정입니다.
    // 합치기 시트에서 방금 인증했는데 계정이 없으면, 적은 번호와 다른 번호를 인증한 것입니다.
    const typed = await samePhoneMembers(db, auth, uid, digits(typedPhone));
    await recordVerifiedPhone(db, token, uid);
    return { match: typed.length > 0 ? "phone-mismatch" : "none" };
  }

  const primaryUid = same[0].id;
  const provider = token.firebase?.sign_in_provider;
  const method = uid.startsWith("kakao:") ? "kakao" : provider === "google.com" ? "google" : "phone";
  await db.collection(ACCOUNT_LINKS).doc(uid).set({
    primaryUid,
    method,
    name: name.trim(),
    cohort,
    linkedAt: FieldValue.serverTimestamp(),
  });
  if (mine.exists) await mine.ref.delete();
  await recordVerifiedPhone(db, token, primaryUid);
  return { match: "merged", token: await auth.createCustomToken(primaryUid, { linkedFrom: uid }) };
}

/**
 * 그 번호가 이미 **휴대폰 로그인 계정**일 때 합치기 (2026-09-23, "전화번호가 같으면 무조건 하나로").
 *
 * 카카오·구글 계정에 번호를 이어 붙이려 하면 Firebase가 "이 번호는 이미 다른 계정"이라며 막습니다
 * (auth/credential-already-in-use). 그래도 문자 인증은 끝난 상태라, 브라우저가 그 번호 계정으로 로그인을
 * 바꾼 뒤 **바꾸기 전 로그인 토큰(aliasIdToken)** 을 함께 보냅니다. 두 토큰이 모두 진짜면
 *   - 번호 계정(또는 그 계정이 이어진 본계정)을 본계정으로,
 *   - 바꾸기 전 계정을 그 별칭으로 잇고, 반쯤 만든 users 문서는 지웁니다.
 * 본계정이 번호 계정과 다르면(번호 계정이 예전에 구글 계정에 합쳐졌으면) 본계정 로그인 표를 돌려줍니다.
 */
export async function adoptIntoPhoneAccount(
  db: Firestore,
  auth: Auth,
  phoneToken: DecodedIdToken,
  aliasIdToken: string,
): Promise<{ merged: boolean; token: string | null }> {
  if (!phoneToken.phone_number) return { merged: false, token: null };
  let alias: DecodedIdToken;
  try {
    alias = await auth.verifyIdToken(aliasIdToken);
  } catch {
    return { merged: false, token: null };
  }
  const primaryUid = await primaryUidOf(db, phoneToken.uid);
  // 문자 인증을 거친 번호 계정이라 증명 기록을 남깁니다(후보를 찾는 함수가 아니므로 먼저 적어도 안전).
  await recordVerifiedPhone(db, phoneToken, primaryUid);
  if (alias.uid === phoneToken.uid || alias.uid === primaryUid) {
    return { merged: false, token: null };
  }

  // 바꾸기 전 계정이 이미 프로필을 다 만든 계정이면 합치지 않습니다(그쪽 기록이 사라질 수 있음).
  const aliasDoc = await db.collection("users").doc(alias.uid).get();
  if (aliasDoc.exists && aliasDoc.get("profileCompleted") === true) {
    return { merged: false, token: null };
  }

  const provider = alias.firebase?.sign_in_provider;
  await db.collection(ACCOUNT_LINKS).doc(alias.uid).set({
    primaryUid,
    method: alias.uid.startsWith("kakao:") ? "kakao" : provider === "google.com" ? "google" : "phone",
    linkedAt: FieldValue.serverTimestamp(),
  });
  if (aliasDoc.exists) await aliasDoc.ref.delete();

  const token =
    primaryUid === phoneToken.uid
      ? null
      : await auth.createCustomToken(primaryUid, { linkedFrom: phoneToken.uid });
  return { merged: true, token };
}
