import { ALL_COHORTS, cohortOf } from "@/lib/cohort";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 로그인 안 한 사람이 보는 원우 명단 — 휴대폰 번호·이메일을 뺀 것 (2026-09-24 사용자 요청
 * "보는 것만큼 로그인 없이" + "번호만 로그인 뒤에").
 *
 * users·roster는 보안 규칙상 원우만 읽습니다(문서에 번호가 들어 있어서 규칙으로 칸만 가릴 수는 없음).
 * 그래서 로그인 안 한 사람의 원우수첩·카드의 올린 사람 이름은 이 주소가 대신 받아 필요한 칸만 넘깁니다 — lib/hooks.ts.
 * 받는 쪽은 앱 화면이라 모양은 UserDoc·RosterDoc 그대로이고, 뺀 칸은 빈 문자열입니다.
 *
 * GET /api/public/directory?cohort=10기   (cohort=전체 → 모든 기수)
 */
export const dynamic = "force-dynamic";

const HIDDEN = { email: "", phone: "", inviteCode: "" };

export async function GET(request: Request) {
  const db = getAdminDb();
  if (!db) return Response.json({ members: [], roster: [] }, { status: 503 });

  const cohortParam = new URL(request.url).searchParams.get("cohort") ?? "";
  const all = cohortParam === ALL_COHORTS || !cohortParam;
  const cohort = cohortOf(cohortParam);

  const usersQuery = all
    ? db.collection("users").where("status", "==", "approved")
    : db.collection("users").where("status", "==", "approved").where("cohort", "==", cohort);
  const rosterQuery = all ? db.collection("roster") : db.collection("roster").where("cohort", "==", cohort);
  const [users, roster] = await Promise.all([usersQuery.get(), rosterQuery.get()]);

  const members = users.docs
    .map((document) => ({ ...document.data(), uid: document.id }) as Record<string, unknown>)
    .filter((member) => member.profileCompleted)
    .map((member) => ({ ...member, ...HIDDEN, createdAt: null, updatedAt: null }));
  const rosterEntries = roster.docs.map((document) => ({
    ...document.data(),
    id: document.id,
    phone: "",
    createdAt: null,
    updatedAt: null,
  }));

  return Response.json(
    { members, roster: rosterEntries },
    // 1분 동안 CDN이 재사용 — 원우 40명이 한꺼번에 열어도 Firestore 읽기가 한 번. (web.app 앞단 1년 캐시를 덮어씀)
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } },
  );
}
