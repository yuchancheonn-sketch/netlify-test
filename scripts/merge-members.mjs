/**
 * 원우수첩에 같은 사람이 두 줄로 뜰 때 한 줄로 합치기 — `npm run merge:members -- --name 김승규` (2026-10-06 사용자 요청: 김승규 원우).
 *
 * 수첩은 코드가 아니라 Firestore(roster = 가입 전 명단, users = 가입자)에 있어서, 이 스크립트가 Admin SDK로 직접 고칩니다.
 * 앱은 "한 기수에 같은 이름의 명단이 둘 이상"이면 동명이인일 수 있다고 보고 일부러 합치지 않습니다(lib/directory.ts).
 * 그래서 같은 사람이 명단에 두 번 올라가 있으면 이렇게 사람이 확인하고 합쳐야 합니다.
 *
 * 쓰는 법 (사용자 컴퓨터에서 — `.env.local`의 FIREBASE_SERVICE_ACCOUNT를 읽습니다. 없으면 `npm run setup:env`):
 *   npm run merge:members -- --name 김승규                  미리보기만(아무것도 바꾸지 않음)
 *   npm run merge:members -- --name 김승규 --apply          미리보기 내용대로 실제로 합침
 *   옵션: --cohort 10기(기본)  --keep <남길 명단 문서 id>  (안 주면 "감사" 같은 직책이 있는 쪽, 같으면 회사·직책이 더 긴 쪽)
 *
 * 합치는 방식
 *   - 명단(roster)이 둘 이상: 남길 한 줄을 정하고, 남길 쪽의 빈 칸(회사·직책·전화·직책명·자기소개·영상·메모)을 다른 줄 값으로 채운 뒤
 *     다른 줄을 지웁니다. 두 줄에 서로 다른 값이 있으면 남길 쪽 값을 쓰고 미리보기에 "충돌"로 알려 줍니다.
 *   - 같은 이름의 가입자(users)가 정확히 한 명이고 남은 명단이 아직 이어지지 않았으면 그 계정과 이어 줍니다(linkedUid).
 *   - 가입자 계정이 둘 이상이면 계정은 합칠 수 없어 건드리지 않고 알려만 줍니다.
 */
import { existsSync, readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}
const name = option("name");
const cohort = option("cohort") ?? "10기";
const keepId = option("keep");
const apply = args.includes("--apply");
if (!name) {
  console.error("사용법: npm run merge:members -- --name <이름> [--cohort 10기] [--keep <명단 문서 id>] [--apply]");
  process.exit(1);
}

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
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
  };
}

const db = getFirestore(initializeApp({ credential: cert(loadServiceAccount()) }));
const normalize = (value) => String(value ?? "").replace(/\s+/g, "");
const cohortOf = (value) => value || "10기"; // 칸이 없던 예전 문서는 10기 (lib/cohort.ts와 같음)
const FIELDS = ["company", "position", "phone", "councilRole", "bio", "introVideoUrl", "note"];

const [rosterSnap, userSnap] = await Promise.all([db.collection("roster").get(), db.collection("users").get()]);
const rosters = rosterSnap.docs
  .map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
  .filter((entry) => normalize(entry.name) === normalize(name) && cohortOf(entry.cohort) === cohort);
const users = userSnap.docs
  .map((doc) => ({ id: doc.id, ...doc.data() }))
  .filter((entry) => normalize(entry.name) === normalize(name) && cohortOf(entry.cohort) === cohort);

console.log(`\n[${cohort} ${name}] 명단 ${rosters.length}줄 · 가입자 ${users.length}명`);
for (const entry of rosters) {
  console.log(`  명단 ${entry.id}: ${FIELDS.map((field) => `${field}=${JSON.stringify(entry[field] ?? "")}`).join(" ")} linkedUid=${entry.linkedUid ?? null}`);
}
for (const entry of users) console.log(`  가입자 ${entry.id}: company=${JSON.stringify(entry.company ?? "")} councilRole=${JSON.stringify(entry.councilRole ?? "")}`);

if (users.length > 1) {
  console.log("\n같은 이름의 가입자 계정이 둘 이상이에요. 계정은 이 스크립트로 합칠 수 없어 아무것도 바꾸지 않습니다.");
  process.exit(0);
}
if (rosters.length === 0) {
  console.log("\n합칠 명단이 없어요(이름·기수를 다시 확인하세요).");
  process.exit(0);
}

// 남길 한 줄 정하기
const score = (entry) => (entry.councilRole ? 1000 : 0) + String(entry.company ?? "").length + String(entry.position ?? "").length;
const keep = keepId ? rosters.find((entry) => entry.id === keepId) : [...rosters].sort((a, b) => score(b) - score(a))[0];
if (!keep) {
  console.error(`--keep ${keepId} 에 해당하는 명단이 없어요.`);
  process.exit(1);
}
const others = rosters.filter((entry) => entry.id !== keep.id);

const patch = {};
for (const field of FIELDS) {
  const current = String(keep[field] ?? "").trim();
  if (current) {
    const conflict = others.find((entry) => String(entry[field] ?? "").trim() && String(entry[field]).trim() !== current);
    if (conflict) console.log(`  충돌 [${field}]: 남김 ${JSON.stringify(current)} / 버림 ${JSON.stringify(conflict[field])}`);
    continue;
  }
  const filler = others.find((entry) => String(entry[field] ?? "").trim());
  if (filler) patch[field] = filler[field];
}
if (!keep.linkedUid) {
  const linked = others.find((entry) => entry.linkedUid);
  if (linked) patch.linkedUid = linked.linkedUid;
  else if (users.length === 1) patch.linkedUid = users[0].id;
}

console.log(`\n남길 명단: ${keep.id}`);
console.log(`채울 값: ${Object.keys(patch).length ? JSON.stringify(patch) : "(없음)"}`);
console.log(`지울 명단: ${others.length ? others.map((entry) => entry.id).join(", ") : "(없음)"}`);

if (!apply) {
  console.log("\n미리보기였어요. 위 내용이 맞으면 같은 명령 끝에 --apply를 붙여 다시 실행하세요.");
  process.exit(0);
}
const batch = db.batch();
if (Object.keys(patch).length) batch.update(keep.ref, patch);
for (const entry of others) batch.delete(entry.ref);
await batch.commit();
console.log("\n합쳤어요. 앱을 새로 열어 수첩에 한 줄만 보이는지 확인하세요.");
