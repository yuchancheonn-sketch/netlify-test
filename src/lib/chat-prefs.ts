"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatReadDoc } from "@/lib/types";

/**
 * 대화방마다 내가 정해 두는 것 — 즐겨찾기(별)와 알림 끄기(종) (2026-09-27 사용자 요청).
 *
 * 둘 다 chatReads/{uid}에 적습니다. 읽음 시각을 적는 그 문서라, 본인만 읽고 쓰는 규칙이 이미 있고
 * 채팅 목록이 이미 구독하고 있어 새로 읽는 비용이 없습니다.
 *
 * ★ 알림 끄기는 한 곳에 더 적습니다 — chatMutes/{roomId}의 {내 uid: true}.
 *   알림 서버(/api/push/chat)가 받을 사람을 거를 때, 단체방이면 원우 수십 명의 chatReads를
 *   하나하나 읽어야 합니다(메시지 한 통에 읽기 수십 건). 방마다 문서 하나에 모아 두면 한 건이면 됩니다.
 *   chatMutes는 앱에서 읽지 않고(누가 알림을 껐는지 남에게 보이지 않게) 서버만 읽습니다 — firestore.rules.
 */

/** 방 즐겨찾기 켜고 끄기 */
export async function setRoomFavorite(uid: string, roomId: string, on: boolean): Promise<void> {
  await setDoc(
    doc(db, "chatReads", uid),
    { favoriteRooms: { [roomId]: on ? true : deleteField() } },
    { merge: true },
  );
}

/** 방 알림 끄고 켜기 — 서버가 보는 chatMutes와 화면이 보는 chatReads를 함께 고칩니다. */
export async function setRoomMuted(uid: string, roomId: string, muted: boolean): Promise<void> {
  await setDoc(
    doc(db, "chatMutes", roomId),
    { [uid]: muted ? true : deleteField() },
    { merge: true },
  );
  await setDoc(
    doc(db, "chatReads", uid),
    { mutedRooms: { [roomId]: muted ? true : deleteField() } },
    { merge: true },
  );
}

/** 내 즐겨찾기·알림 끈 방 목록을 실시간으로 */
export function useChatPrefs(uid: string | undefined) {
  const [entry, setEntry] = useState<{ uid: string; doc: ChatReadDoc | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "chatReads", uid),
      (snapshot) => setEntry({ uid, doc: (snapshot.data() as ChatReadDoc | undefined) ?? null }),
      () => setEntry({ uid, doc: null }),
    );
  }, [uid]);

  const stored = uid && entry?.uid === uid ? entry.doc : null;
  return useMemo(
    () => ({
      favorites: new Set(
        Object.entries(stored?.favoriteRooms ?? {})
          .filter(([, on]) => on)
          .map(([id]) => id),
      ),
      muted: new Set(
        Object.entries(stored?.mutedRooms ?? {})
          .filter(([, on]) => on)
          .map(([id]) => id),
      ),
    }),
    [stored],
  );
}
