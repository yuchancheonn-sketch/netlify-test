/**
 * 새로 가입한 원우를 이미 올라와 있는 명단과 이어붙이는 곳.
 *
 * 운영진이 오프라인 명단을 보고 원우 전체를 미리 넣어두면, 그 사람이 나중에
 * Google 로그인으로 들어옵니다. 이때 아무것도 하지 않으면 수첩에
 *   - 명단에서 온 "홍길동"
 *   - 방금 가입한 "홍길동"
 * 두 칸이 나란히 생깁니다.
 *
 * 그래서 프로필을 저장하는 순간 같은 이름의 명단 항목을 찾아
 *   1) linkedUid에 계정을 적어 "이 사람이 그 사람"임을 못박고
 *   2) 명단에 미리 적어둔 회사·직책·휴대폰을 본인 문서로 옮겨 담습니다.
 *      (본인이 직접 채운 값이 있으면 그것을 우선합니다)
 *
 * 화면 쪽(lib/directory.ts)에서도 이름이 같으면 한 줄로 합쳐 보여주지만,
 * 그건 눈속임일 뿐이고 이 연결이 실제로 두 칸을 하나로 만듭니다.
 */

import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RosterDoc } from "@/lib/types";

/** 이름 비교용. "홍 길동"과 "홍길동"을 같게 봅니다. */
function normalize(name: string): string {
  return name.replace(/\s+/g, "");
}

/** 명단에서 옮겨올 수 있는 항목들 */
export interface RosterCarryOver {
  company: string;
  position: string;
  phone: string;
  councilRole: string;
  introVideoUrl: string;
}

/**
 * 같은 이름의 명단 항목을 찾아 계정과 이어붙이고, 미리 적혀 있던 정보를 돌려줍니다.
 *
 * 찾지 못하면 null을 돌려줍니다. 이미 이 계정과 이어져 있으면 정보만 돌려줍니다.
 * 실패해도 프로필 저장 자체를 막지 않도록, 부르는 쪽에서 감싸 주세요.
 */
export async function linkRosterEntry(
  uid: string,
  name: string,
): Promise<RosterCarryOver | null> {
  const target = normalize(name);
  if (!target) return null;

  const snapshot = await getDocs(collection(db, "roster"));

  const match = snapshot.docs.find((document) => {
    const entry = document.data() as RosterDoc;
    if (normalize(entry.name ?? "") !== target) return false;
    // 아직 아무와도 이어지지 않았거나, 이미 내 것으로 이어진 항목만 가져갑니다.
    return !entry.linkedUid || entry.linkedUid === uid;
  });

  if (!match) return null;

  const entry = match.data() as RosterDoc;
  if (entry.linkedUid !== uid) {
    await updateDoc(doc(db, "roster", match.id), { linkedUid: uid });
  }

  return {
    company: entry.company ?? "",
    position: entry.position ?? "",
    phone: entry.phone ?? "",
    councilRole: entry.councilRole ?? "",
    introVideoUrl: entry.introVideoUrl ?? "",
  };
}
