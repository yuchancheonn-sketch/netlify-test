import { createHash } from "node:crypto";
import { ALL_COHORTS, cohortOf } from "@/lib/cohort";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 로그인 안 한 사람이 보는 원우 명단 — 이름·기수·사진·구분만(2026-10-06부터, 아래 설명) (2026-09-24 사용자 요청
 * "보는 것만큼 로그인 없이" + "번호만 로그인 뒤에").
 *
 * users·roster는 보안 규칙상 원우만 읽습니다(문서에 번호가 들어 있어서 규칙으로 칸만 가릴 수는 없음).
 * 그래서 로그인 안 한 사람의 원우수첩·카드의 올린 사람 이름은 이 주소가 대신 받아 필요한 칸만 넘깁니다 — lib/hooks.ts.
 * 받는 쪽은 앱 화면이라 모양은 UserDoc·RosterDoc 그대로이고, 뺀 칸은 빈 문자열입니다.
 *
 * GET /api/public/directory?cohort=10기   (cohort=전체 → 모든 기수)
 */
export const dynamic = "force-dynamic";

/*
 * ★ 2026-10-06 사용자 요청 (보안 점검 후 수정): 예전에는 "번호·이메일만 빼고" 문서를 통째로 내려줬습니다
 *   (생일·회사·직책·자기소개·영상·직위·uid·역할까지 — 주소를 아는 누구나 읽음). 이제 **허용 칸 목록**으로만 만듭니다:
 *   이름·기수·사진·구분(일반/대학생). 나머지는 전부 빈 값이라 화면(앱)은 모양 그대로 비어 있게 그려집니다.
 *   uid·명단 id는 그대로 주지 않고 되돌릴 수 없는 해시(앞 16자)로 바꿔 key 용도로만 씁니다 —
 *   그래서 둘러보는 화면에서 앨범 카드의 올린 사람 이름은 카드에 적힌 createdByName으로 보입니다(최신 이름 대신 올릴 때 이름).
 *   (연락처·소개·생일은 로그인한 원우만 users 규칙으로 읽습니다.)
 */
const opaque = (id: string) => createHash("sha256").update(`dir:${id}`).digest("hex").slice(0, 16);

function publicMember(id: string, data: Record<string, unknown>) {
  return {
    uid: opaque(id),
    name: typeof data.name === "string" ? data.name : "",
    cohort: cohortOf(typeof data.cohort === "string" ? data.cohort : undefined),
    photoURL: typeof data.photoURL === "string" && /^(https:\/\/|data:image\/)/.test(data.photoURL) ? data.photoURL : null,
    memberType: data.memberType === "youth" ? "youth" : "general",
    // 아래는 UserDoc 모양을 맞추려는 빈 값입니다.
    email: "",
    phone: "",
    company: "",
    position: "",
    councilRole: "",
    introduction: "",
    introVideoUrl: "",
    birthdayMonthDay: "",
    birthdayYear: null,
    role: "member",
    status: "approved",
    profileCompleted: true,
    createdAt: null,
    updatedAt: null,
  };
}

function publicRoster(id: string, data: Record<string, unknown>) {
  return {
    id: opaque(id),
    name: typeof data.name === "string" ? data.name : "",
    cohort: cohortOf(typeof data.cohort === "string" ? data.cohort : undefined),
    memberType: data.memberType === "youth" ? "youth" : "general",
    linkedUid: null,
    note: "",
    createdBy: "",
    createdAt: null,
    updatedAt: null,
  };
}

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
    .filter((document) => document.get("profileCompleted"))
    .map((document) => publicMember(document.id, document.data()));
  const rosterEntries = roster.docs.map((document) => publicRoster(document.id, document.data()));

  return Response.json(
    { members, roster: rosterEntries },
    // 1분 동안 CDN이 재사용 — 원우 40명이 한꺼번에 열어도 Firestore 읽기가 한 번. (web.app 앞단 1년 캐시를 덮어씀)
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } },
  );
}
