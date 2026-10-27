/**
 * 전화번호를 users 문서에서 private 문서로 옮기기 — 2026-10-27 사용자 요청 "번호를 따로 분리해서 보관(유닝앱처럼)".
 *
 *   node scripts/migrate-phones.mjs            점검만(아무것도 안 바꿈) — 옮길 사람 수와 예시를 보여 줌
 *   node scripts/migrate-phones.mjs --copy     users.phone → users/{uid}/private/main.phone 로 **복사**(옛 칸은 그대로) — 되돌릴 수 있음
 *   node scripts/migrate-phones.mjs --delete   복사가 확인된 사람의 users.phone을 지움(★ 돌이킬 수 없음 — 복사·화면 확인 뒤에만)
 *
 * 순서: ① 새 코드 배포(번호는 private 우선, 없으면 옛 users.phone을 씀) ② --copy ③ 수첩·내 프로필에서 번호가 보이는지 확인 ④ --delete.
 * 번호는 출력하지 않고 끝 네 자리만 점검용으로 보여 줍니다. 열쇠: .env.local의 FIREBASE_SERVICE_ACCOUNT(없으면 `npm run setup:env`).
 */
import fs from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const mode = process.argv[2] ?? "";
if (!["", "--copy", "--delete"].includes(mode)) {
  console.error("사용법: node scripts/migrate-phones.mjs [--copy | --delete]");
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
initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: String(sa.private_key).replace(/\n/g, "\n") }) });
const db = getFirestore();

const users = await db.collection("users").get();
const hasPhone = users.docs.filter((d) => typeof d.get("phone") === "string" && d.get("phone").trim());
console.log(`users ${users.size}명 중 users.phone이 있는 사람 ${hasPhone.length}명`);

let copied = 0;
let deleted = 0;
let skipped = 0;
for (const doc of hasPhone) {
  const phone = String(doc.get("phone")).trim();
  const ref = doc.ref.collection("private").doc("main");
  if (mode === "--copy") {
    await ref.set({ phone, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    copied++;
  } else if (mode === "--delete") {
    // 복사본이 같은 값으로 있는 사람만 지웁니다.
    const now = await ref.get();
    if (now.exists && now.get("phone") === phone) {
      await doc.ref.update({ phone: FieldValue.delete() });
      deleted++;
    } else skipped++;
  }
}
if (mode === "") {
  console.log("예시(끝 4자리만):", hasPhone.slice(0, 3).map((d) => `${d.get("name")} …${String(d.get("phone")).slice(-4)}`).join(", "));
  console.log("점검만 했습니다 — 바꾼 것 없음. --copy로 복사하세요.");
} else if (mode === "--copy") console.log(`복사 ${copied}명 (옛 칸은 그대로)`);
else console.log(`삭제 ${deleted}명, 건너뜀 ${skipped}명(복사본이 없거나 다른 값)`);
