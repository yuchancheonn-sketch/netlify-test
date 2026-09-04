"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { ArrowUpIcon, ChatIcon, ChevronLeftIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { markChatRead } from "@/lib/chat-read";
import { otherUidOf, sendChatMessage } from "@/lib/chat-rooms";
import { formatClockTime, formatDateDivider, isSameDay } from "@/lib/format";
import { useApprovedMembers, useMessages } from "@/lib/hooks";
import {
  CHAT_PAGE_SIZE,
  COHORT,
  MAIN_CHAT_ROOM_ID,
  MAIN_CHAT_ROOM_TITLE,
} from "@/lib/constants";
import type { MessageDoc } from "@/lib/types";

/**
 * 대화방 — 당근 채팅 화면의 짜임새를 그대로 따릅니다.
 *
 * 위에 얇은 제목 줄(뒤로가기 + 상대 이름), 가운데 대화, 아래 입력창.
 * 하단 탭바는 MainShell이 이 주소에서 감춥니다.
 */
export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const [count, setCount] = useState(CHAT_PAGE_SIZE);
  const { messages, loading, error, hasMore } = useMessages(roomId, count);
  const { data: members } = useApprovedMembers();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  /** "더 보기"로 과거를 불러왔을 때는 맨 아래로 끌어내리지 않습니다. */
  const skipAutoScroll = useRef(false);

  /*
   * 보낸 사람의 지금 이름을 uid로 찾아볼 수 있게 해둡니다.
   * 메시지에도 이름을 적어 두지만, 원우가 이름을 고치면 예전 메시지까지
   * 함께 바뀌는 편이 자연스럽습니다.
   */
  const nameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      if (member.name) map.set(member.uid, member.name);
    }
    return map;
  }, [members]);

  /*
   * 사진도 이름과 같은 방식으로 붙입니다.
   * 메시지에는 사진을 담지 않습니다. 프로필 사진이 문서 안에 글자로 박히는
   * 구조라, 메시지마다 복사하면 저장 용량과 전송량이 수십 배가 됩니다.
   */
  const photoByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      if (member.photoURL) map.set(member.uid, member.photoURL);
    }
    return map;
  }, [members]);

  const isGroup = roomId === MAIN_CHAT_ROOM_ID;
  const otherId = uid ? otherUidOf(roomId, uid) : null;
  const title = isGroup
    ? MAIN_CHAT_ROOM_TITLE
    : ((otherId && nameByUid.get(otherId)) ?? "원우");

  useEffect(() => {
    if (skipAutoScroll.current) {
      skipAutoScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId, loading]);

  /*
   * 이 방을 보고 있는 동안은 계속 "읽음"으로 표시합니다.
   * 그래야 목록과 하단 탭의 안 읽은 개수가 사라지고, 보는 중에 새 메시지가
   * 와도 다시 붙지 않습니다.
   */
  useEffect(() => {
    if (!uid || loading) return;
    void markChatRead(uid, roomId);
  }, [uid, roomId, loading, lastMessageId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !uid || sending) return;

    setSending(true);
    setSendError(null);
    // 전송이 실패하면 되돌릴 수 있도록 원본을 들고 있습니다.
    setDraft("");

    try {
      await sendChatMessage({ roomId, sender: { uid, profile }, text });
    } catch {
      setDraft(text);
      setSendError("메시지를 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/*
        제목 줄 — 다른 화면의 큰 제목(PageHeader) 대신 얇게 둡니다.
        대화방은 화면을 최대한 대화에 내주는 편이 좋습니다.
      */}
      <header
        className="sticky top-0 z-20 flex items-center gap-1 border-b border-line bg-canvas/95 px-2 pb-2.5 backdrop-blur"
        style={{ paddingTop: "calc(8px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => router.push("/chat")}
          aria-label="채팅 목록으로"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink active:bg-stone-100"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[17px] font-bold text-ink">{title}</p>
          {isGroup ? (
            <p className="text-[12px] text-ink-faint">{COHORT} 원우 모두</p>
          ) : null}
        </div>

        {/* 왼쪽 뒤로가기와 폭을 맞춰 제목이 한가운데 오게 합니다. */}
        <div className="h-10 w-10 shrink-0" aria-hidden="true" />
      </header>

      <div className="flex-1 px-4 pb-[104px]">
        {loading ? (
          <div className="flex flex-col gap-4 px-1 pt-4">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
            <Skeleton className="h-12 w-3/5 rounded-2xl" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<ChatIcon className="h-10 w-10" />}
            title="아직 대화가 없어요"
            description={
              isGroup
                ? "첫 인사를 남겨보세요. 모든 원우에게 보입니다."
                : `${title} 원우에게 첫 메시지를 보내보세요.`
            }
          />
        ) : (
          <>
            {hasMore ? (
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  onClick={() => {
                    skipAutoScroll.current = true;
                    setCount((previous) => previous + CHAT_PAGE_SIZE);
                  }}
                  className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink-muted shadow-[var(--shadow-card)]"
                >
                  이전 메시지 더 보기
                </button>
              </div>
            ) : null}

            <ol className="flex flex-col gap-1 pt-2">
              {messages.map((message, index) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  previous={messages[index - 1]}
                  isMine={message.senderId === uid}
                  senderName={resolveSenderName(message, nameByUid)}
                  /* 지금 프로필 사진을 우선 쓰고, 없으면 예전 메시지에 남은 사진. */
                  senderPhoto={
                    photoByUid.get(message.senderId) ?? message.senderPhotoURL ?? null
                  }
                  /* 1:1 방은 상대가 한 명뿐이라 이름을 반복해 적지 않습니다. */
                  showNames={isGroup}
                />
              ))}
            </ol>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 — 탭바가 없으므로 화면 맨 아래에 붙습니다. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-canvas/95 px-4 pt-2 backdrop-blur"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        {/*
          입력칸을 눌렀을 때 둘러지던 주황 테두리(focus:ring)는 뺐습니다.
          글자를 치는 칸이라, 깜빡이는 커서와 올라온 자판만으로도
          어디에 쓰고 있는지 알 수 있습니다.
        */}
        <form onSubmit={handleSend} className="mx-auto flex w-full max-w-[560px] items-end gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="메시지 보내기"
            aria-label="메시지 입력"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full bg-white px-4.5 py-2.5 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
          />
          {/* 동그라미는 입력칸과 같은 높이(40px)로 맞춰야 나란히 보입니다. */}
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="메시지 보내기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:bg-brand-200"
          >
            {sending ? (
              <Spinner className="h-[17px] w-[17px]" />
            ) : (
              <ArrowUpIcon className="h-[17px] w-[17px]" />
            )}
          </button>
        </form>
        {sendError ? (
          <p role="alert" className="mt-2 text-center text-[12px] font-medium text-red-600">
            {sendError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 말풍선에 띄울 보낸 사람 이름 — 언제나 본명입니다.
 *
 * 1) 지금 원우수첩에 올라와 있는 이름을 가장 먼저 씁니다.
 * 2) 탈퇴 등으로 못 찾으면 메시지에 적어둔 이름을 씁니다.
 * 3) 본명으로 바꾸기 전에 쌓인 메시지에는 별칭만 있어서 그거라도 씁니다.
 */
function resolveSenderName(message: MessageDoc, nameByUid: Map<string, string>): string {
  return (
    nameByUid.get(message.senderId) ||
    message.senderName ||
    message.senderNickname ||
    "원우"
  );
}

/** 말풍선 한 줄. 날짜가 바뀌면 위에 날짜 구분선을 함께 그립니다. */
function MessageRow({
  message,
  previous,
  isMine,
  senderName,
  senderPhoto,
  showNames,
}: {
  message: MessageDoc;
  previous?: MessageDoc;
  isMine: boolean;
  senderName: string;
  senderPhoto: string | null;
  showNames: boolean;
}) {
  // 서버 시각이 아직 도착하지 않은 방금 보낸 메시지는 현재 시각으로 보여줍니다.
  const sentAt = message.createdAt?.toDate() ?? new Date();
  const previousSentAt = previous?.createdAt?.toDate();
  const showDateDivider = !previousSentAt || !isSameDay(previousSentAt, sentAt);
  // 같은 사람이 이어서 보내면 사진과 이름을 반복하지 않습니다.
  const showSender =
    !isMine && (showDateDivider || previous?.senderId !== message.senderId);

  return (
    <li className="flex flex-col">
      {/* 날짜 구분선 — 당근처럼 배지 없이 가운데 회색 글씨로 둡니다. */}
      {showDateDivider ? (
        <p className="py-4 text-center text-[12px] font-medium text-ink-faint">
          {formatDateDivider(sentAt)}
        </p>
      ) : null}

      {/* 왼쪽 여백은 사진 32px + 사이 간격 8px. 이름이 말풍선과 나란히 서도록. */}
      {showSender && showNames ? (
        <p className="mt-2 mb-1 pl-[40px] text-[12px] font-medium text-ink-faint">
          {senderName}
        </p>
      ) : null}

      <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
        {!isMine ? (
          showSender ? (
            <Avatar
              src={senderPhoto}
              name={senderName}
              seed={message.senderId}
              size={32}
            />
          ) : (
            // 같은 사람이 이어 보낼 때, 사진 자리만큼 비워 말풍선을 나란히 세웁니다.
            <div className="w-8 shrink-0" aria-hidden="true" />
          )
        ) : null}

        {isMine ? (
          <time className="shrink-0 pb-1 text-[11px] text-ink-faint">
            {formatClockTime(sentAt)}
          </time>
        ) : null}

        <p
          className={`max-w-[70%] rounded-3xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap ${
            isMine
              ? "rounded-br-lg bg-brand-500 text-white"
              : "rounded-bl-lg bg-white text-ink shadow-[var(--shadow-card)]"
          }`}
        >
          {message.text}
        </p>

        {!isMine ? (
          <time className="shrink-0 pb-1 text-[11px] text-ink-faint">
            {formatClockTime(sentAt)}
          </time>
        ) : null}
      </div>
    </li>
  );
}
