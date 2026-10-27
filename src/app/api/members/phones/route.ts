import { authorizeAccountRequest } from "@/lib/account-link-server";

/**
 * 원우수첩에 보일 전화번호 받기 (2026-10-27 사용자 요청 "번호를 따로 분리해서 보관, 유닝앱처럼").
 * 번호는 users 문서가 아니라 users/{uid}/private/main(본인·운영진만 읽음)에 있어서, 다른 원우의 번호는 이 서버 창구만 내려줍니다.
 * POST + Authorization: Bearer <로그인 토큰> → { phones: { [uid]: "010-…" } }
 *  - 호출한 사람이 **승인된 원우**일 때만(아니면 403).
 *  - 일반 원우: **번호 공개(phonePublic)를 켠 사람의 번호 + 내 번호**만.
 *  - 운영진: 모든 가입 원우의 번호.
 * 번호는 이 응답으로만 나가고 로그·캐시에 남기지 않습니다(no-store).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authed = await authorizeAccountRequest(request);
  if ("response" in authed) return authed.response;
  const { db, token } = authed;

  const me = await db.collection("users").doc(token.uid).get();
  if (!me.exists || me.get("status") !== "approved") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const admin = me.get("role") === "admin";

  // 보여 줄 사람: 운영진은 전원, 그 밖에는 번호를 공개한 사람(+나)
  const wanted = new Set<string>([token.uid]);
  const snapshot = admin
    ? await db.collection("users").select().get()
    : await db.collection("users").where("phonePublic", "==", true).select().get();
  for (const doc of snapshot.docs) wanted.add(doc.id);

  const refs = [...wanted].map((uid) => db.doc(`users/${uid}/private/main`));
  const docs = refs.length > 0 ? await db.getAll(...refs) : [];
  const phones: Record<string, string> = {};
  for (const doc of docs) {
    const phone = doc.get("phone");
    if (typeof phone === "string" && phone.trim()) phones[doc.ref.parent.parent!.id] = phone;
  }
  return Response.json({ ok: true, phones }, { headers: { "Cache-Control": "no-store" } });
}
