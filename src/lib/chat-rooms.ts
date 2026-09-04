"use client";

/**
 * 대화방을 다루는 규칙 모음.
 *
 * 방은 두 종류입니다.
 *  - 단체방(group) — 10기 전체가 함께 쓰는 방 하나. id는 늘 "main".
 *  - 1:1 방(direct) — 원우 두 명만의 대화.
 */

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CHAT_PREVIEW_MAX_LENGTH,
  MAIN_CHAT_ROOM_ID,
  MAIN_CHAT_ROOM_TITLE,
} from "@/lib/constants";
import type { ChatRoomDoc, UserDoc } from "@/lib/types";

/** 1:1 방 id에서 두 사람의 uid를 잇는 글자. uid에는 쓰이지 않는 모양으로 골랐습니다. */
const DIRECT_SEPARATOR = "__";

/**
 * 두 원우의 1:1 방 id.
 *
 * 누가 먼저 말을 걸든 같은 id가 나오도록 uid를 정렬해 붙입니다. 그래야
 *  - 방을 찾으려고 따로 조회할 필요가 없고,
 *  - 같은 상대와 방이 두 개 생기는 일이 없습니다.
 */
export function directRoomId(a: string, b: string): string {
  return [a, b].sort().join(DIRECT_SEPARATOR);
}

/** 1:1 방에서 나 말고 상대의 uid. 단체방이거나 내가 낀 방이 아니면 null */
export function otherUidOf(roomId: string, myUid: string): string | null {
  if (roomId === MAIN_CHAT_ROOM_ID) return null;
  const uids = roomId.split(DIRECT_SEPARATOR);
  if (uids.length !== 2) return null;
  const other = uids.find((uid) => uid !== myUid);
  return other ?? null;
}

/**
 * 아직 문서가 없어도 단체방은 늘 목록에 있어야 하므로,
 * 문서가 없을 때 대신 쓸 기본 모습을 만들어 둡니다.
 */
export function emptyGroupRoom(): ChatRoomDoc {
  return {
    id: MAIN_CHAT_ROOM_ID,
    kind: "group",
    title: MAIN_CHAT_ROOM_TITLE,
    memberUids: [],
    lastMessageText: "",
    lastMessageSenderId: "",
    lastMessageAt: null,
  };
}

/** 채팅 목록에 보여줄 방 이름. 1:1 방은 상대 이름을 씁니다. */
export function roomTitle(
  room: ChatRoomDoc,
  myUid: string,
  nameByUid: Map<string, string>,
): string {
  if (room.kind === "group") return room.title || MAIN_CHAT_ROOM_TITLE;
  const other = otherUidOf(room.id, myUid);
  return (other && nameByUid.get(other)) || "원우";
}

/** 목록 한 줄에 들어갈 만큼 마지막 메시지를 줄입니다. */
export function previewText(room: ChatRoomDoc): string {
  const text = room.lastMessageText.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > CHAT_PREVIEW_MAX_LENGTH
    ? `${text.slice(0, CHAT_PREVIEW_MAX_LENGTH)}…`
    : text;
}

/**
 * 1:1 방을 아직 없으면 만들어 둡니다.
 *
 * 메시지를 보내기 전에 방부터 만들어야 상대의 채팅 목록에 뜹니다.
 * (목록은 memberUids로 찾기 때문입니다.)
 * 이미 있으면 memberUids만 다시 확인하고 지나갑니다.
 */
export async function ensureDirectRoom(myUid: string, otherId: string): Promise<string> {
  const roomId = directRoomId(myUid, otherId);
  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      kind: "direct",
      title: "",
      memberUids: [myUid, otherId].sort(),
    },
    { merge: true },
  );
  return roomId;
}

/**
 * 메시지를 보냅니다.
 *
 * 메시지를 넣는 것과 방의 마지막 메시지를 갱신하는 것을 함께 합니다.
 * 방 문서는 merge로 쓰기 때문에, 단체방처럼 문서가 아직 없던 방도
 * 첫 메시지를 보내는 순간 저절로 만들어집니다.
 */
export async function sendChatMessage({
  roomId,
  sender,
  text,
}: {
  roomId: string;
  sender: { uid: string; profile: UserDoc | null };
  text: string;
}): Promise<void> {
  const senderName = sender.profile?.name || sender.profile?.nickname || "원우";

  await addDoc(collection(db, "chatRooms", roomId, "messages"), {
    senderId: sender.uid,
    // 채팅에는 별칭이 아니라 본명으로 나옵니다.
    senderName,
    senderPhotoURL: sender.profile?.photoURL ?? null,
    text,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  const isGroup = roomId === MAIN_CHAT_ROOM_ID;
  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      kind: isGroup ? "group" : "direct",
      title: isGroup ? MAIN_CHAT_ROOM_TITLE : "",
      // 1:1 방은 방을 만들 때 넣은 memberUids를 건드리지 않도록 단체방에서만 씁니다.
      ...(isGroup ? { memberUids: [] } : {}),
      lastMessageText: text,
      lastMessageSenderId: sender.uid,
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  );
}
