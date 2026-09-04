"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Avatar from "@/components/Avatar";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { ArrowUpIcon, ChatIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { markChatRead } from "@/lib/chat-read";
import { db } from "@/lib/firebase";
import { formatClockTime, formatDateDivider, isSameDay } from "@/lib/format";
import { useApprovedMembers, useMessages } from "@/lib/hooks";
import { CHAT_PAGE_SIZE, COHORT, MAIN_CHAT_ROOM_ID } from "@/lib/constants";
import type { MessageDoc } from "@/lib/types";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [count, setCount] = useState(CHAT_PAGE_SIZE);
  const { messages, loading, error, hasMore } = useMessages(count);
  const { data: members } = useApprovedMembers();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  const uid = user?.uid;
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

  useEffect(() => {
    if (skipAutoScroll.current) {
      skipAutoScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId, loading]);

  /*
   * 채팅을 보고 있는 동안은 계속 "읽음"으로 표시합니다.
   * 그래야 하단 탭의 안 읽은 개수 배지가 사라지고, 보는 중에 새 메시지가
   * 와도 배지가 다시 붙지 않습니다.
   */
  useEffect(() => {
    if (!uid || loading) return;
    void markChatRead(uid);
  }, [uid, loading, lastMessageId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !user || sending) return;

    setSending(true);
    setSendError(null);
    // 전송이 실패하면 되돌릴 수 있도록 원본을 들고 있습니다.
    setDraft("");

    try {
      await addDoc(collection(db, "chatRooms", MAIN_CHAT_ROOM_ID, "messages"), {
        senderId: user.uid,
        // 채팅에는 별칭이 아니라 본명으로 나옵니다.
        senderName: profile?.name || profile?.nickname || "원우",
        senderPhotoURL: profile?.photoURL ?? null,
        text,
        imageUrl: null,
        createdAt: serverTimestamp(),
      });
    } catch {
      setDraft(text);
      setSendError("메시지를 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="채팅"
        eyebrow={`${COHORT} 단체방`}
        right={<ProfileAvatarButton />}
      />

      {/* 메시지 목록. 입력창이 가리지 않도록 아래 여백을 넉넉히 둡니다. */}
      <div className="px-4 pb-[86px]">
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
            description="첫 인사를 남겨보세요. 모든 원우에게 보입니다."
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
                />
              ))}
            </ol>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 — 하단 탭바 바로 위에 고정 */}
      <div
        className="fixed inset-x-0 z-20 bg-canvas/95 px-4 pt-2 pb-3 backdrop-blur"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      >
        <form onSubmit={handleSend} className="mx-auto flex w-full max-w-[560px] items-end gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`${COHORT} 단체방에 메시지 보내기`}
            aria-label="메시지 입력"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full bg-white px-5 py-3.5 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="메시지 보내기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:bg-brand-200"
          >
            {sending ? <Spinner className="h-5 w-5" /> : <ArrowUpIcon className="h-5 w-5" />}
          </button>
        </form>
        {sendError ? (
          <p role="alert" className="mt-2 text-center text-[12px] font-medium text-red-600">
            {sendError}
          </p>
        ) : null}
      </div>
    </>
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
}: {
  message: MessageDoc;
  previous?: MessageDoc;
  isMine: boolean;
  senderName: string;
}) {
  // 서버 시각이 아직 도착하지 않은 방금 보낸 메시지는 현재 시각으로 보여줍니다.
  const sentAt = message.createdAt?.toDate() ?? new Date();
  const previousSentAt = previous?.createdAt?.toDate();
  const showDateDivider = !previousSentAt || !isSameDay(previousSentAt, sentAt);
  // 같은 사람이 이어서 보내면 이름과 사진을 반복하지 않습니다.
  const showSender =
    !isMine && (showDateDivider || previous?.senderId !== message.senderId);

  return (
    <li className="flex flex-col">
      {showDateDivider ? (
        <div className="flex justify-center py-4">
          <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-[12px] font-bold text-brand-700">
            {formatDateDivider(sentAt)}
          </span>
        </div>
      ) : null}

      {showSender ? (
        <p className="mt-2 mb-1 pl-[52px] text-[12px] font-medium text-ink-faint">
          {senderName}
        </p>
      ) : null}

      <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
        {!isMine ? (
          showSender ? (
            <Avatar
              src={message.senderPhotoURL}
              name={senderName}
              seed={message.senderId}
              size={40}
            />
          ) : (
            <div className="w-10 shrink-0" aria-hidden="true" />
          )
        ) : null}

        {isMine ? (
          <time className="shrink-0 pb-1 text-[11px] text-ink-faint">
            {formatClockTime(sentAt)}
          </time>
        ) : null}

        <p
          className={`max-w-[70%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
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
