"use client";

/**
 * 대화방을 다루는 규칙 모음.
 *
 * 방은 두 종류입니다.
 *   direct  원우 두 명만의 1:1 방. id는 두 uid를 정렬해 "__"로 이은 것.
 *   cohort  기수 단체방 (2026-09-22). id는 "cohort-10" 꼴.
 *
 * ★ 기수 단체방에는 memberUids가 없습니다 — 일부러입니다.
 *   "그 기수 원우는 무조건 이 방에 있다"가 요구사항이라, 명단을 문서에 적어 두면
 *   가입·기수 변경·승인마다 그 배열을 고쳐야 하고 한 번이라도 빠뜨리면 누군가는
 *   방에서 사라집니다. 대신 **users/{uid}.cohort와 방 id를 견주어** 자격을 봅니다 —
 *   명단을 어디에도 적지 않으므로 어긋날 수가 없습니다.
 *   보안 규칙도 같은 방식입니다(firestore.rules의 isCohortRoomMine).
 *
 *   대가로 채팅 목록의 `where("memberUids","array-contains",uid)` 질의에는 안 걸립니다.
 *   그래서 이 방만 문서 id로 따로 구독합니다(hooks.ts의 useCohortChatRoom).
 *
 * 예전의 단체방 하나("main")는 2026-09-10에 없앴습니다. 지금 것은 기수별로 나뉜 다른 방입니다.
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
import { cohortOf } from "@/lib/cohort";
import {
  DIRECT_SEPARATOR,
  cohortOfRoomId,
  cohortRoomId,
  cohortRoomTitle,
  directRoomId,
  otherUidOf,
} from "@/lib/chat-room-id";
import { CHAT_PREVIEW_MAX_LENGTH } from "@/lib/constants";
import type { ChatRoomDoc, MessageDoc, UserDoc } from "@/lib/types";

/*
 * 방 id를 읽고 만드는 규칙은 lib/chat-room-id.ts에 있습니다 — 서버 라우트도 같은 규칙을
 * 써야 하는데 이 파일은 "use client"라 서버에서 못 불러옵니다. 여기서 다시 내보내
 * 부르는 쪽은 예전처럼 이 파일 하나만 보면 되게 둡니다.
 */
export {
  cohortOfRoomId,
  cohortRoomId,
  cohortRoomTitle,
  directRoomId,
  isCohortRoomId,
  otherUidOf,
} from "@/lib/chat-room-id";

/**
 * Firestore에서 읽은 방 문서를 화면에서 바로 쓸 수 있는 모양으로 맞춥니다.
 *
 * 방금 만들어져 아직 한 마디도 오가지 않은 방에는 마지막 메시지 칸이
 * 아예 없습니다. 그대로 쓰면 목록을 그릴 때 undefined에 걸려 넘어지므로,
 * 읽어 들이는 이 자리에서 빠진 칸을 채웁니다.
 */
export function toChatRoom(id: string, data: Record<string, unknown>): ChatRoomDoc {
  /*
   * kind는 문서에 적힌 값보다 **id를 먼저 믿습니다.**
   * id는 규칙이 자격을 가리는 기준이기도 해서, 문서 칸이 비어 있거나 옛 값이어도
   * id만 맞으면 기수 단체방으로 다뤄야 화면과 규칙이 어긋나지 않습니다.
   */
  const cohort = cohortOfRoomId(id);
  return {
    id,
    kind: cohort ? "cohort" : data.kind === "group" ? "group" : "direct",
    title: typeof data.title === "string" ? data.title : "",
    cohort: cohort ?? "",
    memberUids: Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [],
    lastMessageText:
      typeof data.lastMessageText === "string" ? data.lastMessageText : "",
    lastMessageSenderId:
      typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : "",
    lastMessageAt: (data.lastMessageAt as ChatRoomDoc["lastMessageAt"]) ?? null,
  };
}

/** 채팅 목록에 보여줄 방 이름 — 1:1 방은 상대 원우의 이름, 기수 단체방은 "N기 단체 대화방". */
export function roomTitle(
  room: ChatRoomDoc,
  myUid: string,
  nameByUid: Map<string, string>,
): string {
  if (room.cohort) return cohortRoomTitle(room.cohort);
  const other = otherUidOf(room.id, myUid);
  return (other && nameByUid.get(other)) || "원우";
}

/**
 * 방에 있는 원우 수 — 방 이름 옆에 굵게 붙입니다(카톡처럼, 2026-09-27 사용자 요청).
 *   기수 단체방: 그 기수의 승인된 원우 수 (명단을 따로 적지 않는 구조라 users로 셉니다 — 이 파일 맨 위).
 *   1:1 방: 늘 2명.
 * members는 화면이 이미 받아 둔 승인 원우 목록(useApprovedMembers)이라 새로 읽는 비용이 없습니다.
 */
export function roomMemberCount(roomId: string, members: UserDoc[]): number {
  const cohort = cohortOfRoomId(roomId);
  if (!cohort) return 2;
  return members.filter((member) => cohortOf(member.cohort) === cohort).length;
}

/**
 * 아직 문서가 없는 기수 단체방의 빈 껍데기.
 *
 * 기수 단체방은 "그 기수 원우는 무조건 있다"가 요구사항이라, 한 마디도 오가지 않아
 * 문서가 없을 때도 채팅 목록에 서 있어야 합니다. 1:1 방과 다른 점입니다 —
 * 1:1 방은 첫 메시지를 보낼 때 생기고, 그 전에는 목록에 없는 편이 맞습니다.
 */
export function emptyCohortRoom(cohort: string): ChatRoomDoc {
  return {
    id: cohortRoomId(cohort),
    kind: "cohort",
    title: cohortRoomTitle(cohort),
    cohort: cohortOf(cohort),
    memberUids: [],
    lastMessageText: "",
    lastMessageSenderId: "",
    lastMessageAt: null,
  };
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
  /*
   * 아는 방 모양인지 먼저 봅니다 — 1:1 방이거나 기수 단체방이어야 합니다.
   * (자격 자체는 보안 규칙이 가립니다. 여기서 막는 것은 오타 난 주소로 들어와
   *  쓸 수 없는 방에 글을 쓰려다 규칙에 거절당하는 일을 미리 거르는 것입니다.)
   */
  const roomCohort = cohortOfRoomId(roomId);
  if (!roomCohort && !otherUidOf(roomId, sender.uid)) {
    throw new Error("대화방을 찾지 못했어요.");
  }

  const senderName = sender.profile?.name || "원우";

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
    // 채팅에는 본명으로 나옵니다. (별칭 기능은 2026-09-15에 없앴습니다)
    senderName,
    text,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      ...(roomCohort
        ? {
            /*
              기수 단체방 — memberUids를 적지 않습니다.
              명단은 users/{uid}.cohort가 대신하므로 여기에 또 적으면 두 곳이 어긋납니다
              (이 파일 맨 위 설명). cohort 칸은 서버가 알림 받을 사람을 찾을 때 씁니다.
            */
            kind: "cohort",
            cohort: roomCohort,
            title: cohortRoomTitle(roomCohort),
          }
        : {
            kind: "direct",
            title: "",
            /*
              1:1 방은 미리 만들어 두지 않으므로, 첫 메시지를 보내는 이 자리에서
              memberUids를 함께 적어야 상대의 채팅 목록에도 뜹니다. roomId 자체가
              두 uid를 정렬해 이은 값이라 다시 계산할 필요 없이 그대로 씁니다.
            */
            memberUids: roomId.split(DIRECT_SEPARATOR),
          }),
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
