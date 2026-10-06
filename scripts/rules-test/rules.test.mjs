/*
 * Firestore 보안 규칙 시험 (2026-10-06 사용자 요청 (보안 점검 후 수정)).
 *
 * ★★ 이 파일은 작성만 했고 **한 번도 실행하지 않았습니다**(작성 환경에 에뮬레이터·Java·패키지가 없었음).
 *    처음 돌릴 때 규칙 문법 오류나 시나리오 오타가 나올 수 있으니, 실패하면 규칙과 시험 어느 쪽이 틀렸는지 먼저 확인하세요.
 *
 * 준비 (한 번만):
 *   1) Java 11+ (에뮬레이터가 필요로 함)
 *   2) npm i -D @firebase/rules-unit-testing        ← package.json이 바뀝니다(커밋 여부는 알아서)
 *   3) firebase-tools 로그인은 필요 없습니다(에뮬레이터만).
 *
 * 실행 (저장소 맨 위 폴더에서):
 *   firebase emulators:exec --only firestore --project demo-aegiaeta "node scripts/rules-test/rules.test.mjs"
 *   (Windows PowerShell이면 firebase.cmd)
 *
 * 각 시나리오는 "허용돼야 하는 것"과 "막혀야 하는 것"을 한 줄씩 적고, 결과를 표로 보여줍니다.
 * 하나라도 어긋나면 종료 코드 1.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(here, "../../firestore.rules"), "utf8");
const CLOUD = "https://res.cloudinary.com/qz4f4bh5/image/upload/v1/x.jpg";

const env = await initializeTestEnvironment({
  projectId: "demo-aegiaeta",
  firestore: { rules, host: "127.0.0.1", port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080) },
});

const results = [];
async function check(name, expectation, run) {
  try {
    await (expectation === "allow" ? assertSucceeds(run()) : assertFails(run()));
    results.push({ name, expected: expectation, ok: true });
  } catch (error) {
    results.push({ name, expected: expectation, ok: false, why: String(error?.message ?? error).slice(0, 160) });
  }
}

const userBase = (uid, extra = {}) => ({
  uid, email: "", name: uid, photoURL: null, birthdayMonthDay: "", birthdayYear: null,
  memberType: "general", company: "", position: "", phone: "010-1111-2222", councilRole: "",
  introduction: "", introVideoUrl: "", role: "member", status: "approved", cohort: "10기",
  inviteCode: "", profileCompleted: true, ...extra,
});

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/alice"), userBase("alice"));
    await setDoc(doc(db, "users/bob"), userBase("bob", { phone: "010-3333-4444" }));
    await setDoc(doc(db, "users/boss"), userBase("boss", { role: "admin" }));
    await setDoc(doc(db, "users/blocked"), userBase("blocked", { status: "pending" }));
    await setDoc(doc(db, "roster/r1"), { name: "홍길동", cohort: "10기", memberType: "general", linkedUid: null, note: "", createdBy: "alice" });
    await setDoc(doc(db, "photoAlbums/a1"), {
      title: "t", eventDate: "2026-10-01", body: "", coverImageUrl: CLOUD, photoCount: 1,
      cohort: "10기", createdBy: "alice", likedBy: [],
    });
    await setDoc(doc(db, "photoAlbums/a1/photos/p1"), { imageUrl: CLOUD, uploadedBy: "alice", caption: "" });
    await setDoc(doc(db, "files/f1"), { name: "a.pdf", url: CLOUD, uploadedBy: "alice" });
    await setDoc(doc(db, "chatRooms/alice__bob"), { kind: "direct", title: "", memberUids: ["alice", "bob"] });
  });
}
await seed();

const alice = env.authenticatedContext("alice").firestore();
const bob = env.authenticatedContext("bob").firestore();
const boss = env.authenticatedContext("boss").firestore();
const blocked = env.authenticatedContext("blocked").firestore();
const eve = env.authenticatedContext("eve").firestore(); // users 문서 없음

// ── users ──
await check("본인은 자기 휴대폰을 고칠 수 있다", "allow", () => updateDoc(doc(alice, "users/alice"), { phone: "010-9999-9999" }));
await check("다른 원우가 남의 phone을 바꾸는 것은 막힌다 (계정 탈취 경로)", "deny", () => updateDoc(doc(bob, "users/alice"), { phone: "010-3333-4444", updatedBy: "bob" }));
await check("다른 원우가 운영진의 phone을 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(bob, "users/boss"), { phone: "010-3333-4444", updatedBy: "bob" }));
await check("다른 원우가 남의 name을 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(bob, "users/alice"), { name: "해커", updatedBy: "bob" }));
await check("다른 원우가 남의 cohort를 옮기는 것은 막힌다", "deny", () => updateDoc(doc(bob, "users/alice"), { cohort: "9기", updatedBy: "bob" }));
await check("다른 원우가 남의 email을 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(bob, "users/alice"), { email: "x@y.z", updatedBy: "bob" }));
await check("다른 원우가 남의 photoURL을 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(bob, "users/alice"), { photoURL: "https://evil/x.png", updatedBy: "bob" }));
await check("다른 원우가 수첩 칸(회사·직책)을 채우는 것은 허용 — updatedBy가 내 uid", "allow", () =>
  updateDoc(doc(bob, "users/alice"), { company: "착한부자", position: "대표", updatedBy: "bob", updatedByName: "bob", updatedAt: serverTimestamp() }));
await check("수첩 칸을 채우면서 updatedBy를 남의 uid로 속이는 것은 막힌다", "deny", () =>
  updateDoc(doc(bob, "users/alice"), { company: "x", updatedBy: "alice" }));
await check("본인이 role을 admin으로 올리는 것은 막힌다", "deny", () => updateDoc(doc(alice, "users/alice"), { role: "admin" }));
await check("본인이 status를 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(alice, "users/alice"), { status: "pending" }));
await check("본인이 서버 칸 verifiedPhone을 적는 것은 막힌다", "deny", () => updateDoc(doc(alice, "users/alice"), { verifiedPhone: "01099999999" }));
await check("운영진은 남의 문서의 role을 바꿀 수 있다", "allow", () => updateDoc(doc(boss, "users/bob"), { role: "member", name: "밥" }));
await check("차단된 원우는 자기 문서도 못 고친다", "deny", () => updateDoc(doc(blocked, "users/blocked"), { company: "x" }));
await check("가입: 평원우·approved·허용 칸만이면 만들 수 있다", "allow", () =>
  setDoc(doc(eve, "users/eve"), {
    uid: "eve", email: "", name: "이브", photoURL: null, birthdayMonthDay: "", birthdayYear: null, memberType: "general",
    company: "", position: "", phone: "", councilRole: "", introduction: "", introVideoUrl: "", role: "member",
    status: "approved", cohort: "", inviteCode: "", profileCompleted: false, createdAt: serverTimestamp(),
  }));
const mallory = env.authenticatedContext("mallory").firestore();
await check("가입: role admin을 심으면 막힌다", "deny", () => setDoc(doc(mallory, "users/mallory"), { ...userBase("mallory", { role: "admin" }), profileCompleted: false, createdAt: serverTimestamp() }));
await check("가입: verifiedPhone 같은 서버 칸을 심으면 막힌다", "deny", () => setDoc(doc(mallory, "users/mallory"), { ...userBase("mallory", { verifiedPhone: "01012345678" }), profileCompleted: false, createdAt: serverTimestamp() }));

// ── roster ──
await check("원우가 명단 칸을 만들 수 있다 (createdBy 본인, 미연결)", "allow", () =>
  addDoc(collection(bob, "roster"), { name: "김철수", cohort: "10기", memberType: "general", linkedUid: null, note: "", createdBy: "bob", createdAt: serverTimestamp() }));
await check("원우가 명단 칸을 지우는 것은 막힌다", "deny", () => deleteDoc(doc(bob, "roster/r1")));
await check("운영진은 명단 칸을 지울 수 있다", "allow", () => deleteDoc(doc(boss, "roster/r1")));
await seed();
await check("원우가 명단의 linkedUid를 남의 uid로 잇는 것은 막힌다", "deny", () => updateDoc(doc(bob, "roster/r1"), { linkedUid: "alice" }));
await check("원우가 가입하며 내 uid로 처음 잇는 것은 허용", "allow", () => updateDoc(doc(bob, "roster/r1"), { linkedUid: "bob" }));
await check("원우가 명단 수첩 칸(회사)을 채우는 것은 허용", "allow", () => updateDoc(doc(alice, "roster/r1"), { company: "회사", updatedBy: "alice" }));

// ── photoAlbums ──
await seed();
await check("앨범 만들기: createdBy가 남이면 막힌다", "deny", () =>
  addDoc(collection(bob, "photoAlbums"), { title: "t", eventDate: "2026-10-01", body: "", coverImageUrl: CLOUD, photoCount: 1, createdBy: "alice", createdAt: serverTimestamp() }));
await check("앨범 만들기: Cloudinary가 아닌 대표 사진 주소는 막힌다", "deny", () =>
  addDoc(collection(bob, "photoAlbums"), { title: "t", eventDate: "2026-10-01", body: "", coverImageUrl: "https://evil.example/p.png", photoCount: 1, createdBy: "bob", createdAt: serverTimestamp() }));
await check("앨범 만들기: 정상", "allow", () =>
  addDoc(collection(bob, "photoAlbums"), { title: "t", eventDate: "2026-10-01", body: "", coverImageUrl: CLOUD, photoCount: 1, createdBy: "bob", createdAt: serverTimestamp() }));
await check("남이 앨범 제목을 바꾸는 것은 막힌다", "deny", () => updateDoc(doc(bob, "photoAlbums/a1"), { title: "해킹" }));
await check("공감: 내 uid를 likedBy에 넣는 것은 허용", "allow", () => updateDoc(doc(bob, "photoAlbums/a1"), { likedBy: arrayUnion("bob") }));
await check("공감 취소: 내 uid를 빼는 것은 허용", "allow", () => updateDoc(doc(bob, "photoAlbums/a1"), { likedBy: arrayRemove("bob") }));
await check("공감: 남의 uid를 대신 넣는 것은 막힌다", "deny", () => updateDoc(doc(bob, "photoAlbums/a1"), { likedBy: arrayUnion("alice") }));
await check("공감: likedBy를 통째로 비우는 것은(내 uid가 아닌 것을 빼므로) 막힌다", "deny", async () => {
  await env.withSecurityRulesDisabled((c) => updateDoc(doc(c.firestore(), "photoAlbums/a1"), { likedBy: ["alice", "bob"] }));
  return updateDoc(doc(bob, "photoAlbums/a1"), { likedBy: [] });
});
await seed();
await check("사진 더하기: 아무 원우나 photoCount +1 은 허용", "allow", () => updateDoc(doc(bob, "photoAlbums/a1"), { photoCount: increment(1) }));
await check("photoCount를 크게 부풀리는 것은 막힌다", "deny", () => updateDoc(doc(bob, "photoAlbums/a1"), { photoCount: increment(1000) }));
await check("앨범 지우기: 남은 막히고", "deny", () => deleteDoc(doc(bob, "photoAlbums/a1")));
await check("앨범 지우기: 올린 사람은 허용", "allow", () => deleteDoc(doc(alice, "photoAlbums/a1")));
await seed();
await check("앨범 지우기: 운영진은 허용", "allow", () => deleteDoc(doc(boss, "photoAlbums/a1")));
await check("사진 더하기: 내 uploadedBy + Cloudinary 주소는 허용", "allow", () =>
  addDoc(collection(bob, "photoAlbums/a1/photos"), { imageUrl: CLOUD, publicId: "p", width: 1, height: 1, caption: "", uploadedBy: "bob", uploadedByNickname: "bob", uploadedAt: serverTimestamp(), likes: [] }));
await check("사진 더하기: 남의 이름(uploadedBy)은 막힌다", "deny", () =>
  addDoc(collection(bob, "photoAlbums/a1/photos"), { imageUrl: CLOUD, uploadedBy: "alice" }));
await check("사진 지우기: 남의 사진은 막힌다", "deny", () => deleteDoc(doc(bob, "photoAlbums/a1/photos/p1")));

// ── files ──
await check("자료 올리기: 외부 주소는 막힌다", "deny", () =>
  addDoc(collection(bob, "files"), { name: "x", url: "http://evil/x.pdf", publicId: "p", format: "pdf", bytes: 1, cohort: "10기", uploadedBy: "bob", uploadedByName: "b", uploadedAt: serverTimestamp() }));
await check("자료 올리기: Cloudinary 주소는 허용", "allow", () =>
  addDoc(collection(bob, "files"), { name: "x", url: CLOUD, publicId: "p", format: "pdf", bytes: 1, cohort: "10기", uploadedBy: "bob", uploadedByName: "b", uploadedAt: serverTimestamp() }));
await check("남의 자료 지우기는 막힌다", "deny", () => deleteDoc(doc(bob, "files/f1")));

// ── committeeInfo / sessions ──
await check("위원회 소개: 원우가 goal을 적는 것은 허용(merge)", "allow", () => setDoc(doc(bob, "committeeInfo/문화"), { goal: "목표", updatedAt: serverTimestamp() }, { merge: true }));
await check("위원회 소개: 엉뚱한 칸은 막힌다", "deny", () => setDoc(doc(bob, "committeeInfo/문화"), { evil: "x" }, { merge: true }));
await check("위원회 소개: 2000자 초과는 막힌다", "deny", () => setDoc(doc(bob, "committeeInfo/문화"), { goal: "가".repeat(2001) }, { merge: true }));
await check("수업(sessions) 쓰기는 원우에게 막힌다", "deny", () => setDoc(doc(bob, "sessions/1"), { topic: "x" }));
await check("수업(sessions) 쓰기는 운영진은 허용", "allow", () => setDoc(doc(boss, "sessions/1"), { topic: "x" }));

// ── chatRooms ──
await check("1:1 방: memberUids에 제3자를 끼워 넣는 것은 막힌다", "deny", () => setDoc(doc(alice, "chatRooms/alice__bob"), { memberUids: ["alice", "bob", "eve"] }, { merge: true }));
await check("1:1 방: 정상 미리보기 갱신은 허용", "allow", () => setDoc(doc(alice, "chatRooms/alice__bob"), { lastMessageText: "hi", lastMessageSenderId: "alice", lastMessageAt: serverTimestamp() }, { merge: true }));
await check("1:1 방: 제3자는 남의 방을 못 만든다", "deny", () => setDoc(doc(bob, "chatRooms/alice__carol"), { kind: "direct", title: "", memberUids: ["alice", "carol"] }));
await check("1:1 방: 방 문서를 지우는 것은 막힌다", "deny", () => deleteDoc(doc(alice, "chatRooms/alice__bob")));
await check("단체방: memberUids를 심는 것은 막힌다", "deny", () => setDoc(doc(alice, "chatRooms/cohort-10"), { kind: "cohort", cohort: "10기", title: "t", memberUids: ["alice"] }));
await check("단체방: 정상(내 기수)은 허용", "allow", () => setDoc(doc(alice, "chatRooms/cohort-10"), { kind: "cohort", cohort: "10기", title: "t", lastMessageText: "hi" }, { merge: true }));

await env.cleanup();

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.expected}]  ${r.name}${r.ok ? "" : `\n      → ${r.why}`}`);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);
