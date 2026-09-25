import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { ACCOUNT_LINKS } from "@/lib/account-link-server";
import { cohortOf } from "@/lib/cohort";

/**
 * 탈퇴 — 서버 전용 (2026-09-25 사용자 요청 "로그인 계정만 지우는 걸로").
 *
 * ★ 지우는 것
 *   - 로그인 계정(Firebase Auth) — 본계정과, 거기 합쳐진 별칭 계정(구글·카카오·휴대폰) 모두
 *   - 계정 합치기 기록(accountLinks), 이 원우의 알림 받는 기기(pushTokens)
 *   - users 문서 — 프로필 사진, 생일, 권한 같은 계정 정보가 함께 사라집니다.
 * ★ 남기는 것
 *   - 원우수첩 칸: users 문서의 이름·기수·회사·직책·연락처·직위·소개·영상을 **명단(roster)** 으로 옮겨,
 *     "아직 가입 전" 원우처럼 수첩에 그대로 남깁니다(사진은 빠짐). 동기 명단이 비지 않게 하려는 것입니다.
 *   - 쓴 글·사진·채팅·댓글·투표 — 그대로 둡니다. 화면은 이름을 못 찾으면 글에 적어 둔 이름을 씁니다.
 *
 * ★ users 문서를 남기지 않고 명단으로 옮기는 이유
 *   카카오 로그인은 uid가 "kakao:<id>"로 늘 같아서, users 문서가 남아 있으면 다시 로그인하는 순간
 *   탈퇴 전 계정으로 그대로 들어와 버립니다. 명단으로 옮겨 두면 다시 로그인해도 새 가입부터 하고,
 *   가입하면 같은 기수·이름의 명단 칸과 저절로 한 줄로 합쳐집니다(lib/directory.ts).
 */
export async function withdrawAccount(db: Firestore, auth: Auth, uid: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  const user = await userRef.get();

  if (user.exists && user.get("profileCompleted") === true && user.get("status") === "approved") {
    await keepInRoster(db, uid, user.data() ?? {});
  }
  if (user.exists) await userRef.delete();

  const aliases = await db.collection(ACCOUNT_LINKS).where("primaryUid", "==", uid).get();
  const devices = await db.collection("pushTokens").where("uid", "==", uid).get();
  await Promise.all([
    ...aliases.docs.map((doc) => doc.ref.delete()),
    ...devices.docs.map((doc) => doc.ref.delete()),
    db.collection(ACCOUNT_LINKS).doc(uid).delete(),
  ]);

  // 로그인 계정은 맨 마지막에 — 앞에서 실패하면 다시 시도할 수 있게(로그인이 살아 있어야 이 주소를 부름).
  for (const loginUid of [...aliases.docs.map((doc) => doc.id), uid]) {
    await auth.deleteUser(loginUid).catch((error: { code?: string }) => {
      if (error?.code !== "auth/user-not-found") throw error;
    });
  }
}

/**
 * 원우수첩 칸을 명단으로 옮깁니다. 이 계정에 이어진 명단 칸(linkedUid)이 있으면 그 칸을,
 * 없으면 같은 기수·이름의 이어지지 않은 칸이 딱 하나일 때 그 칸을 채우고, 둘 다 아니면 새로 만듭니다.
 * 값은 계정 쪽이 우선이고(수첩이 그렇게 보여 줌), 계정 쪽이 비어 있으면 명단의 값을 둡니다.
 */
async function keepInRoster(db: Firestore, uid: string, data: Record<string, unknown>) {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = text(data.name);
  if (!name) return;
  const cohort = cohortOf(text(data.cohort));

  const linked = await db.collection("roster").where("linkedUid", "==", uid).limit(1).get();
  let target = linked.docs[0]?.ref ?? null;
  if (!target) {
    const sameName = await db.collection("roster").where("name", "==", name).get();
    const open = sameName.docs.filter(
      (doc) => !doc.get("linkedUid") && cohortOf(doc.get("cohort")) === cohort,
    );
    if (open.length === 1) target = open[0].ref;
  }

  const filled: Record<string, unknown> = {
    name,
    cohort,
    memberType: data.memberType ?? "general",
    linkedUid: null,
    updatedBy: text(data.updatedBy) || uid,
    updatedByName: text(data.updatedByName) || name,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const fields: Array<[string, string]> = [
    ["company", text(data.company)],
    ["position", text(data.position)],
    ["phone", text(data.phone)],
    ["councilRole", text(data.councilRole)],
    ["bio", text(data.introduction) || text(data.bio)],
    ["introVideoUrl", text(data.introVideoUrl)],
  ];
  for (const [key, value] of fields) if (value) filled[key] = value;

  if (target) {
    await target.set(filled, { merge: true });
  } else {
    await db.collection("roster").add({
      note: "",
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      ...filled,
    });
  }
}
