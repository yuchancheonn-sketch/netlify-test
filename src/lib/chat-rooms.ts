"use client";

/**
 * 대화방을 다루는 규칙 모음.
 *
 * 방은 원우 두 명만의 1:1 방(direct) 한 종류입니다.
 * 단체방("main")은 2026-09-10에 없앴습니다 — 카톡 단톡방으로 대신합니다.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requestPush } from "@/lib/push";
import { CHAT_PREVIEW_MAX_LENGTH } from "@/lib/constants";
import type { ChatRoomDoc, MessageDoc, UserDoc } from "@/lib/types";

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

/**
 * 1:1 방에서 나 말고 상대의 uid.
 * 1:1 방 모양이 아니거나(예전 단체방 "main" 등) 내가 낀 방이 아니면 null
 */
export function otherUidOf(roomId: string, myUid: string): string | null {
  const uids = roomId.split(DIRECT_SEPARATOR);
  if (uids.length !== 2 || !uids.includes(myUid)) return null;
  const other = uids.find((uid) => uid !== myUid);
  return other ?? null;
}

/**
 * Firestore에서 읽은 방 문서를 화면에서 바로 쓸 수 있는 모양으로 맞춥니다.
 *
 * 방금 만들어져 아직 한 마디도 오가지 않은 방에는 마지막 메시지 칸이
 * 아예 없습니다. 그대로 쓰면 목록을 그릴 때 undefined에 걸려 넘어지므로,
 * 읽어 들이는 이 자리에서 빠진 칸을 채웁니다.
 */
export function toChatRoom(id: string, data: Record<string, unknown>): ChatRoomDoc {
  return {
    id,
    kind: data.kind === "group" ? "group" : "direct",
    title: typeof data.title === "string" ? data.title : "",
    memberUids: Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [],
    lastMessageText:
      typeof data.lastMessageText === "string" ? data.lastMessageText : "",
    lastMessageSenderId:
      typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : "",
    lastMessageAt: (data.lastMessageAt as ChatRoomDoc["lastMessageAt"]) ?? null,
  };
}

/** 채팅 목록에 보여줄 방 이름 — 상대 원우의 이름입니다. */
export function roomTitle(
  room: ChatRoomDoc,
  myUid: string,
  nameByUid: Map<string, string>,
): string {
  const other = otherUidOf(room.id, myUid);
  return (other && nameByUid.get(other)) || "원우";
}

/** 목록 한 줄에 들어갈 만큼 마지막 메시지를 줄입니다. */
export function previewText(room: ChatRoomDoc): string {
  // 아직 한 마디도 오가지 않은 방에는 이 칸이 없을 수 있습니다.
  const text = (room.lastMessageText ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > CHAT_PREVIEW_MAX_LENGTH
    ? `${text.slice(0, CHAT_PREVIEW_MAX_LENGTH)}…`
    : text;
}

/**
 * 두 원우의 1:1 방 id로 바로 이동할 수 있게 계산만 합니다.
 *
 * 예전에는 여기서 방 문서를 미리 만들어 두었는데, 그러면 메시지를 한 마디도
 * 보내지 않아도 채팅 목록(memberUids로 찾는 목록)에 빈 방이 나타났습니다.
 * 방 문서는 실제로 첫 메시지를 보낼 때 sendChatMessage가 만듭니다.
 */
export function ensureDirectRoom(myUid: string, otherId: string): string {
  return directRoomId(myUid, otherId);
}

/**
 * 메시지를 보냅니다.
 *
 * 메시지를 넣는 것과 방의 마지막 메시지를 갱신하는 것을 함께 합니다.
 * 방 문서는 merge로 쓰기 때문에, 아직 문서가 없던 방도 첫 메시지를
 * 보내는 순간 저절로 만들어집니다.
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
  // 1:1 방 모양이 아니면 보내지 않습니다. (보안 규칙도 막습니다)
  if (!otherUidOf(roomId, sender.uid)) {
    throw new Error("대화방을 찾지 못했어요.");
  }

  const senderName = sender.profile?.name || sender.profile?.nickname || "원우";

  /*
   * 보낸 사람 사진은 일부러 넣지 않습니다.
   *
   * 이 앱은 프로필 사진을 파일로 올리지 않고 문서 안에 글자로 박아 넣습니다
   * (data URL, 장당 10~15KB). 그걸 메시지마다 복사하면 250바이트면 될
   * 메시지 하나가 15KB가 되어, 저장 용량과 전송량을 수십 배로 씁니다.
   * 사진은 화면에서 users 문서를 보고 붙입니다. 이름과 같은 방식입니다.
   */
  await addDoc(collection(db, "chatRooms", roomId, "messages"), {
    senderId: sender.uid,
    // 채팅에는 별칭이 아니라 본명으로 나옵니다.
    senderName,
    text,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      kind: "direct",
      title: "",
      /*
        1:1 방은 미리 만들어 두지 않으므로, 첫 메시지를 보내는 이 자리에서
        memberUids를 함께 적어야 상대의 채팅 목록에도 뜹니다. roomId 자체가
        두 uid를 정렬해 이은 값이라 다시 계산할 필요 없이 그대로 씁니다.
      */
      memberUids: roomId.split(DIRECT_SEPARATOR),
      lastMessageText: text,
      lastMessageSenderId: sender.uid,
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  );

  // 상대 원우 폰에 알림이 뜨게 합니다. 곁들이는 일이라 기다리지 않습니다.
  void requestPush("chat", { roomId, text });
}

/**
 * 내가 보낸 메시지의 내용을 고칩니다.
 *
 * ★ 고친 흔적을 반드시 남깁니다 (editedAt). 흔적 없이 고칠 수 있으면
 *   하지도 않은 말을 한 것처럼 만들 수 있어, 오간 대화가 증거가 되지 못합니다.
 *   화면에서는 말풍선에 "수정됨"으로 나타납니다.
 *
 * ★ 보낸 사람과 보낸 시각은 건드리지 않습니다. 보안 규칙도 그 둘이 그대로인지
 *   확인하고, 바뀐 칸이 text·editedAt뿐일 때만 통과시킵니다.
 *
 * 고친 메시지가 방의 마지막 말이면 채팅 목록 미리보기도 함께 고칩니다.
 * 시각(lastMessageAt)은 그대로 둡니다 — 고친 것이지 새로 보낸 것이 아니므로,
 * 방이 목록 맨 위로 다시 올라오면 안 됩니다.
 */
export async function editChatMessage({
  roomId,
  messageId,
  text,
  isLast,
}: {
  roomId: string;
  messageId: string;
  text: string;
  /** 이게 방의 마지막 메시지인지 (맞으면 목록 미리보기도 고칩니다) */
  isLast: boolean;
}): Promise<void> {
  await updateDoc(doc(db, "chatRooms", roomId, "messages", messageId), {
    text,
    editedAt: serverTimestamp(),
  });

  if (!isLast) return;

  await setDoc(doc(db, "chatRooms", roomId), { lastMessageText: text }, { merge: true });
}

/**
 * 내가 보낸 메시지를 지웁니다. 문서를 통째로 지우므로 모두의 화면에서 사라집니다.
 *
 * ★ 남의 메시지는 지울 수 없습니다. 화면에서 버튼을 감추는 것과 별개로
 *   보안 규칙이 senderId를 보고 막습니다.
 *
 * ★ 이미 나간 푸시 알림은 되돌리지 못합니다.
 *   알림은 보낼 때 상대 폰으로 이미 건너간 것이라, 지워도 잠금화면에 뜬 알림은
 *   그대로 남습니다. 눌러서 들어오면 그 메시지가 없을 뿐입니다. 카톡도 같습니다.
 *
 * 마지막 메시지를 지울 때는 방 문서의 미리보기도 함께 고쳐야 합니다.
 * 안 그러면 채팅 목록에 지운 말이 계속 걸려 있습니다. 바로 앞 메시지는
 * 화면이 이미 들고 있으므로(useMessages), 그걸 넘겨받아 씁니다 —
 * 앞 메시지를 찾겠다고 Firestore에 다시 물으면 읽기가 한 건 더 나갑니다.
 */
export async function deleteChatMessage({
  roomId,
  messageId,
  isLast,
  previous,
}: {
  roomId: string;
  messageId: string;
  /** 이게 방의 마지막 메시지인지 (맞으면 아래 previous로 미리보기를 되돌립니다) */
  isLast: boolean;
  /** 바로 앞 메시지. 지우는 것이 방의 유일한 메시지였으면 null */
  previous: MessageDoc | null;
}): Promise<void> {
  await deleteDoc(doc(db, "chatRooms", roomId, "messages", messageId));

  if (!isLast) return;

  /*
   * 앞 메시지가 없으면(방의 마지막 한 마디였으면) 미리보기를 비웁니다.
   * lastMessageAt이 null이 되면 1:1 방은 채팅 목록에서 빠집니다 —
   * 방은 첫 메시지를 보낼 때 생긴다는 규칙과 짝이 맞습니다.
   */
  const preview: Record<string, unknown> = {
    lastMessageText: previous?.text ?? "",
    lastMessageSenderId: previous?.senderId ?? "",
  };

  /*
   * 시각은 값이 확실할 때만 적습니다.
   *
   * 앞 메시지를 방금 보냈다면 서버 시각이 아직 도착하지 않아 createdAt이
   * 비어 있습니다. 그걸 그대로 쓰면 "메시지가 없는 방"이 되어 목록에서
   * 사라집니다. 그럴 때는 시각만 손대지 않고 둡니다 — 다음 메시지가 오면
   * 어차피 제 값으로 덮입니다.
   */
  if (!previous || previous.createdAt) {
    preview.lastMessageAt = previous?.createdAt ?? null;
  }

  await setDoc(doc(db, "chatRooms", roomId), preview, { merge: true });
}
