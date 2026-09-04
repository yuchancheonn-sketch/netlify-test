"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 단체방을 "지금 다 읽었다"고 표시합니다. (chatReads/{uid})
 *
 * 하단 탭의 안 읽은 개수 배지는 여기 적힌 시각 이후에 올라온 메시지만 셉니다.
 * 실패해도 화면에는 알리지 않습니다. 읽음 표시가 한 번 늦게 남는 것뿐이라
 * 원우에게 오류를 띄울 만한 일이 아니고, 다음에 채팅을 열면 다시 시도됩니다.
 */
export async function markChatRead(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "chatReads", uid),
      { lastReadAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // 조용히 넘어갑니다.
  }
}
