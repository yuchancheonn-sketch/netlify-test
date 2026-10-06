/**
 * 구글 플레이 심사용 시험 계정 만들기/지우기 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱 scripts/play-review-account.mjs를 이 앱에 맞춰 옮김).
 *
 *   node scripts/play-review-account.mjs create   — 시험 전화번호(+82 10-0000-0000 / 인증번호 000000, 문자 안 보냄) + 로그인 계정 + users 문서
 *   node scripts/play-review-account.mjs delete   — 위에서 만든 것 전부 삭제
 *
 * ★ 심사가 끝나면 반드시 delete. 이 번호+코드를 아는 사람은 누구나 이 계정으로 로그인할 수 있습니다.
 * ★ 이 앱은 가입한 원우 누구나 원우수첩(연락처 포함)을 읽는 구조라, 시험 계정으로 로그인한 심사자도 실제 원우 정보를 봅니다
 *   (뉴웨이브앱은 구성원 없는 테스트용 사랑방으로 가렸지만 이 앱은 기수 하나(10기)뿐이라 가릴 곳이 없습니다 — docs/play-store-checklist.md "주의").
 * .env.local의 FIREBASE_SERVICE_ACCOUNT가 필요합니다(없으면 `npm run setup:env`). 이 스크립트는 비밀값을 출력하지 않습니다.
 */
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const mode = process.argv[2];
if (mode !== "create" && mode !== "delete") {
  console.error("사용법: node scripts/play-review-account.mjs create | delete");
  process.exit(1);
}

let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw && fs.existsSync(".env.local")) {
  const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT="));
  raw = line?.slice("FIREBASE_SERVICE_ACCOUNT=".length).trim().replace(/^'(.*)'$/s, "$1").replace(/^"(.*)"$/s, "$1");
}
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT를 찾지 못했어요. 먼저 `npm run setup:env`로 .env.local을 만드세요.");
  process.exit(1);
}
const sa = JSON.parse(raw);
const credential = cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: String(sa.private_key).replace(/\\n/g, "\n") });
initializeApp({ credential });

const UID = "play-review";
const PHONE = "+821000000000"; // 앱에서는 010-0000-0000
const CODE = "000000";

// 1) 시험용 전화번호(문자를 보내지 않음) — Identity Toolkit 설정
const { access_token } = await credential.getAccessToken();
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${sa.project_id}/config`;
const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", "X-Goog-User-Project": sa.project_id };
const current = await (await fetch(url, { headers })).json();
if (current.error) {
  console.log("설정 읽기 실패:", current.error.status, current.error.message);
  process.exit(1);
}
const numbers = { ...(current.signIn?.phoneNumber?.testPhoneNumbers ?? {}) };
if (mode === "create") numbers[PHONE] = CODE;
else delete numbers[PHONE];
const patch = await fetch(`${url}?updateMask=signIn.phoneNumber.testPhoneNumbers`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ signIn: { phoneNumber: { testPhoneNumbers: numbers } } }),
});
const patched = await patch.json();
console.log("시험 번호 설정:", patch.ok ? "성공" : `${patched.error?.status} ${patched.error?.message}`);
if (!patch.ok) process.exit(1);

const auth = getAuth();
const db = getFirestore();
if (mode === "create") {
  try {
    await auth.getUser(UID);
  } catch {
    await auth.createUser({ uid: UID, phoneNumber: PHONE, displayName: "구글 심사용" });
  }
  // src/lib/types.ts의 UserDoc + src/app/join/page.tsx·onboarding이 채우는 칸과 같은 모양(프로필 완성·승인됨·일반 회원)
  await db.doc(`users/${UID}`).set({
    uid: UID,
    email: "",
    name: "구글 심사용",
    photoURL: null,
    birthdayMonthDay: "01-01",
    birthdayYear: null,
    memberType: "general",
    company: "",
    position: "",
    phone: "010-0000-0000",
    councilRole: "",
    introduction: "구글 플레이 심사용 계정입니다.",
    introVideoUrl: "",
    role: "member",
    status: "approved",
    cohort: "10기",
    inviteCode: "",
    profileCompleted: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log("시험 회원 만듦 (uid play-review, 10기). 심사가 끝나면 delete 하세요.");
} else {
  await db.doc(`users/${UID}`).delete();
  await auth.deleteUser(UID).catch(() => {});
  // 시험 계정이 쓴 알림 기기·차단 목록이 있으면 함께 지웁니다.
  const devices = await db.collection("pushTokens").where("uid", "==", UID).get();
  await Promise.all(devices.docs.map((d) => d.ref.delete()));
  await db.doc(`userBlocks/${UID}`).delete().catch(() => {});
  console.log("시험 회원 삭제 (시험 번호도 제거됨)");
}
