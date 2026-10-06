/**
 * 운영진 지정·점검 — `npm run make-admin -- <이메일|이름|전화번호|uid>` (2026-10-06 사용자 요청: yuchancheonn@gmail.com 계정의 운영진 화면이 사라짐).
 * 뉴웨이브앱 scripts/make-admin.mjs를 옮기고, 원인을 찾을 수 있게 점검 출력을 더했습니다.
 *
 * 설정 화면의 "관리자 화면" 입구는 로그인한 계정의 users 문서 role이 "admin"일 때만 보입니다(lib/auth-context.tsx isAdmin).
 * 앱 안에서는 운영진만 운영진을 지정할 수 있어(firestore.rules) 이 문이 사라지면 앱에서는 되돌릴 수 없고, 이 스크립트가
 * Admin SDK로 규칙을 건너뛰어 role을 바꿉니다. `.env.local`의 FIREBASE_SERVICE_ACCOUNT를 읽습니다(없으면 `npm run setup:env`).
 *
 * 쓰는 법 (사용자 컴퓨터에서)
 *   npm run make-admin                                  가입자 목록(운영진 표시)만 보여 줌
 *   npm run make-admin -- yuchancheonn@gmail.com        점검: 그 이메일의 로그인 계정(uid·로그인 방법)과 맞는 users 문서·role을 보여 줌(아무것도 안 바꿈)
 *   npm run make-admin -- yuchancheonn@gmail.com --apply   점검 결과 맞는 사람이 한 명이면 role을 admin으로 바꿈
 *   npm run make-admin -- --uid <uid> --apply           uid를 직접 정해 바꿈(점검에서 문서가 여럿일 때)
 */
import { existsSync, readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const uidIndex = args.indexOf("--uid");
const uidOption = uidIndex >= 0 ? args[uidIndex + 1] : undefined;
const target = args.filter((arg, i) => !arg.startsWith("--") && !(uidIndex >= 0 && i === uidIndex + 1)).join(" ").trim();

function loadServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw && existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("FIREBASE_SERVICE_ACCOUNT="));
    raw = line?.slice("FIREBASE_SERVICE_ACCOUNT=".length).trim().replace(/^'(.*)'$/s, "$1").replace(/^"(.*)"$/s, "$1");
  }
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT를 찾지 못했어요. 먼저 `npm run setup:env`로 .env.local을 만드세요.");
    process.exit(1);
  }
  const parsed = JSON.parse(raw);
  return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: String(parsed.private_key).replace(/\\n/g, "\n") };
}

const app = initializeApp({ credential: cert(loadServiceAccount()) });
const db = getFirestore(app);
const auth = getAuth(app);
const digits = (value) => String(value ?? "").replace(/\D/g, "");

const users = (await db.collection("users").get()).docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
const describe = (user) =>
  `${user.role === "admin" ? "[운영진] " : ""}${user.name || "(이름 없음)"}  ${user.email || ""} ${user.phone || ""}  status=${user.status ?? "-"} role=${user.role ?? "-"}  uid=${user.uid}`;

async function setAdmin(uid) {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) {
    console.error(`users/${uid} 문서가 없어요.`);
    process.exit(1);
  }
  await db.collection("users").doc(uid).update({ role: "admin" });
  console.log(`${doc.get("name") || uid}님(${uid})을 운영진으로 지정했어요. 앱을 완전히 닫았다 다시 열면 설정에 관리자 화면이 보입니다.`);
}

if (uidOption) {
  if (!apply) {
    const user = users.find((entry) => entry.uid === uidOption);
    console.log(user ? describe(user) : `users/${uidOption} 문서가 없어요.`);
    console.log("\n미리보기였어요. 바꾸려면 --apply를 붙이세요.");
    process.exit(0);
  }
  await setAdmin(uidOption);
  process.exit(0);
}

if (!target) {
  if (!users.length) console.log("아직 가입한 사람이 없어요.");
  for (const user of users) console.log(describe(user));
  process.exit(0);
}

// 점검: 이메일이면 로그인 계정(Firebase Auth)도 찾아, 지금 로그인되는 uid가 어느 users 문서인지 보여 줍니다.
if (target.includes("@")) {
  try {
    const record = await auth.getUserByEmail(target);
    console.log(`로그인 계정: uid=${record.uid}  로그인 방법=${record.providerData.map((p) => p.providerId).join(", ") || "-"}`);
    const own = users.find((entry) => entry.uid === record.uid);
    console.log(own ? `  이 uid의 users 문서: ${describe(own)}` : "  ★ 이 uid에는 users 문서가 없어요(가입 화면에서 새로 만들어져야 하는 상태).");
  } catch {
    console.log(`Firebase 로그인 계정에서 ${target}을(를) 찾지 못했어요(다른 로그인 방법·카카오·전화번호 계정일 수 있어요).`);
  }
}

const matches = users.filter(
  (user) =>
    user.name === target ||
    user.email === target ||
    user.uid === target ||
    (digits(target).length >= 10 && digits(user.phone) === digits(target)),
);
console.log(`\n"${target}"에 맞는 users 문서 ${matches.length}개:`);
for (const user of matches) console.log(`  ${describe(user)}`);

if (matches.length === 0) {
  console.log("\n맞는 가입자가 없어요. 위 '로그인 계정'의 uid가 있으면 `--uid <uid> --apply`로 지정할 수 있어요.");
  process.exit(0);
}
if (matches.length > 1) {
  console.log("\n여럿이에요 — 지금 로그인되는 계정의 uid(위 '로그인 계정')를 골라 `npm run make-admin -- --uid <uid> --apply`로 지정하세요.");
  process.exit(0);
}
if (matches[0].role === "admin") {
  console.log("\n이 문서는 이미 운영진이에요. 그런데도 화면에 안 보이면 지금 앱에 로그인된 계정이 이 uid와 다른 계정일 수 있어요(위 '로그인 계정' 확인).");
  process.exit(0);
}
if (!apply) {
  console.log("\n미리보기였어요. 맞으면 같은 명령 끝에 --apply를 붙여 다시 실행하세요.");
  process.exit(0);
}
await setAdmin(matches[0].uid);
