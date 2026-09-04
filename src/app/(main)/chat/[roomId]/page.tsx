"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import BottomTabBar from "@/components/BottomTabBar";
import ChatListPage from "@/app/(main)/chat/page";
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
  MARK_READ_GAP,
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
   * 오른쪽으로 밀어서 목록으로 나가기 — 왼쪽 위 < 버튼과 같은 동작입니다.
   *
   * dragX는 손가락을 따라 화면이 밀려난 거리입니다. 미는 동안에는 애니메이션
   * 없이 손가락에 딱 붙고(snapping=false), 손을 떼는 순간부터 부드럽게
   * 제자리로 돌아가거나 바깥으로 빠져나갑니다(snapping=true).
   */
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState(false);
  /*
   * 대화방 뒤에 채팅 목록을 깔아 둘지.
   *
   * 늘 깔아 두지는 않습니다. 목록 화면은 방 목록·읽은 시각·방마다의 안 읽은
   * 개수까지 실시간으로 구독하는데, 대화방에 머무는 내내 그걸 덤으로 켜 두면
   * Firestore 무료 읽기 한도를 그냥 태웁니다. 그래서 가로로 미는 손짓이라고
   * 판정된 순간에만 붙였다가, 되돌아오는 애니메이션이 끝나면 떼어냅니다.
   */
  const [peeking, setPeeking] = useState(false);
  /** 손짓이 시작된 자리. 세로 스크롤로 판정되면 null로 지웁니다. */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  /** 가로인지 세로인지는 처음 8px을 움직여 본 뒤 한 번만 정하고 끝까지 지킵니다. */
  const swipeAxis = useRef<"unknown" | "x" | "y">("unknown");

  function handleTouchStart(event: React.TouchEvent) {
    // 두 손가락은 확대·축소이지 넘기기가 아닙니다.
    if (event.touches.length !== 1) return;
    // 입력칸이나 버튼 위에서 시작한 손짓은 그쪽 몫으로 둡니다.
    if ((event.target as HTMLElement).closest("input, textarea, button")) return;

    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
    swipeAxis.current = "unknown";
    setSnapping(false);
  }

  function handleTouchMove(event: React.TouchEvent) {
    const start = swipeStart.current;
    if (!start) return;

    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (swipeAxis.current === "unknown") {
      // 아직 어느 쪽인지 알기엔 너무 조금 움직였습니다.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      /*
       * 오른쪽으로, 그리고 세로보다 1.5배는 더 갔을 때만 넘기기로 봅니다.
       * 이 기준이 없으면 대화를 비스듬히 훑어 올릴 때마다 방을 나가버립니다.
       */
      if (dx > 0 && dx > Math.abs(dy) * 1.5) {
        swipeAxis.current = "x";
        // 밀려나면 곧바로 뒤가 드러나므로, 이때 목록을 깔아 둡니다.
        setPeeking(true);
      } else {
        swipeAxis.current = "y";
        swipeStart.current = null;
        return;
      }
    }

    // 왼쪽으로 되돌아오는 건 따라가되, 시작점보다 왼쪽으로는 넘어가지 않습니다.
    setDragX(Math.max(0, dx));
  }

  function handleTouchEnd() {
    const start = swipeStart.current;
    swipeStart.current = null;
    setSnapping(true);

    if (!start || swipeAxis.current !== "x") {
      setDragX(0);
      return;
    }

    // 화면 절반을 넘겼으면 손을 떼는 순간 마저 빠져나가고, 못 넘겼으면 제자리로.
    if (dragX > window.innerWidth / 2) {
      setDragX(window.innerWidth);
      router.push("/chat");
    } else {
      setDragX(0);
    }
  }

  /**
   * 제자리로 돌아오는 애니메이션이 끝나면 뒤에 깔아 둔 목록을 떼어냅니다.
   *
   * 손을 떼자마자 떼어내면 대화방이 아직 비스듬히 밀려 있는 340ms 동안
   * 뒤가 흰 벽으로 보입니다.
   */
  function handleSlideSettled(event: React.TransitionEvent<HTMLDivElement>) {
    // 안쪽 요소의 다른 애니메이션이 타고 올라온 것은 흘려보냅니다.
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (dragX === 0) setPeeking(false);
  }

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
   *
   * 다만 메시지가 올 때마다 쓰지는 않습니다. 단체방에 원우 마흔 명이 들어와
   * 있으면 메시지 한 통에 쓰기가 마흔 건 나가고, 그때마다 각자의 chatReads가
   * 바뀌면서 방마다 걸어둔 안 읽은 개수 구독이 전부 끊겼다 다시 붙습니다.
   * 그래서 MARK_READ_GAP에 한 번으로 묶고, 방을 나갈 때 미뤄둔 몫을 마저 씁니다.
   */
  const markedAt = useRef(0);
  const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid || loading) return;
    const reader = uid;

    function write() {
      markedAt.current = Date.now();
      markTimer.current = null;
      void markChatRead(reader, roomId);
    }

    const wait = MARK_READ_GAP - (Date.now() - markedAt.current);
    if (wait <= 0) {
      write();
    } else if (markTimer.current === null) {
      // 이미 예약해 둔 것이 있으면 그 한 번이 최신 상태까지 담습니다.
      markTimer.current = setTimeout(write, wait);
    }
  }, [uid, roomId, loading, lastMessageId]);

  /*
   * 방을 떠날 때 마무리.
   * 예약해 둔 쓰기가 남아 있다는 건 아직 읽음으로 안 남긴 메시지가 있다는 뜻이라,
   * 기다리지 않고 지금 씁니다. 남은 게 없으면 이미 다 적혀 있으므로 그냥 나갑니다.
   */
  useEffect(() => {
    return () => {
      if (markTimer.current === null) return;
      clearTimeout(markTimer.current);
      markTimer.current = null;
      if (uid) void markChatRead(uid, roomId);
    };
  }, [uid, roomId]);

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

  /*
   * 대화방만 흰 바탕입니다.
   * 다른 화면은 연한 회색 배경(canvas) 위에 흰 카드를 얹는 구조지만,
   * 대화방은 카드가 아니라 말풍선이 놓이는 자리라 바탕과 말풍선의 색을
   * 서로 맞바꿨습니다 — 바탕이 희고, 남의 말풍선이 연한 회색입니다.
   */
  /*
   * 미는 동안 화면이 따라 움직이는 값.
   *
   * 제목·대화 묶음과 입력줄에 따로 겁니다. 하나로 묶어 바깥 상자에 걸면
   * 안 됩니다 — transform이 걸린 상자는 그 안의 fixed 요소가 화면이 아니라
   * 상자를 기준으로 자리를 잡아서, 스크롤을 내려둔 상태에서는 입력줄이
   * 대화 맨 아래로 뚝 떨어집니다.
   */
  const slide = {
    transform: dragX ? `translateX(${dragX}px)` : undefined,
    transition: snapping ? "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
  };

  /*
   * 바깥 상자는 흰색이 아니라 목록과 같은 배경색입니다.
   *
   * 대화방의 흰 바탕은 안쪽 상자(아래 slide가 걸린 것)가 칠합니다. 바깥까지
   * 희게 칠하면, 옆으로 미는 동안 뒤에 깔아둔 목록이 못 덮은 자리에서 이 흰색이
   * 배어 나옵니다. 특히 아이폰 사파리는 주소창이 접혔다 펴지는 사이 fixed 요소가
   * 화면 맨 위를 잠깐 못 덮어서, 목록의 "채팅" 제목 위로 흰 띠가 생깁니다.
   * 배경색을 목록과 같게 두면 그럴 때도 색이 이어져 보입니다.
   */
  return (
    <div
      className="flex min-h-dvh flex-col bg-canvas"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      /*
        세로 스크롤만 브라우저에 맡기고 가로는 우리가 씁니다.
        이게 없으면 미는 도중에 브라우저가 제 나름의 가로 스크롤·뒤로가기를
        끼어들어 처리해서 손짓이 중간에 끊깁니다.
      */
      style={{ touchAction: "pan-y" }}
    >
      {/*
        대화방 뒤에 깔리는 진짜 채팅 목록.
        대화방이 목록 위에 얹힌 종이처럼 보이도록, 미는 동안 뒤에서 드러납니다.
        보이기만 하면 되므로 손가락은 받지 않습니다(pointer-events-none).
        MainShell이 씌우던 폭 제한과 탭바 자리는 여기서 흉내 냅니다 —
        대화방에서는 MainShell이 탭바를 감추기 때문입니다.
      */}
      {peeking ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-canvas"
        >
          <div className="mx-auto h-full w-full max-w-[560px] overflow-hidden pb-[calc(82px+env(safe-area-inset-bottom))]">
            <ChatListPage />
          </div>
          <BottomTabBar />
        </div>
      ) : null}

      <div
        className="relative z-10 flex flex-1 flex-col bg-white"
        style={slide}
        onTransitionEnd={handleSlideSettled}
      >
        {/*
          제목 줄 — 다른 화면의 큰 제목(PageHeader) 대신 얇게 둡니다.
          대화방은 화면을 최대한 대화에 내주는 편이 좋습니다.

          바탕은 대화와 같은 흰색이되, 아래에 연한 회색 실선 한 줄로 대화와
          갈라 둡니다. 반투명은 쓰지 않습니다 — 살짝 비치면 위로 지나가는
          말풍선이 제목 글씨에 겹쳐 보입니다.
        */}
        {/*
          옆으로 밀 때 화면 맨 위에 흰 띠가 남는 것은 알고 두는 것입니다.

          아이폰 사파리는 화면 맨 위 자기 영역(시계·배터리가 얹히는 줄)을
          "페이지 맨 윗부분 색"에서 실시간으로 뽑아 와 화면 전체 너비로 칠합니다.
          색을 바꿔 가며 확인했습니다 — 이 제목 줄을 보라색으로 칠하면 그 띠도
          화면 전체가 보라색이 됩니다. 그래서 제목 줄이 흰 동안에는 목록을
          꺼내도 그 띠만 흰색으로 남습니다.

          고치려면 제목 줄을 회색으로 두는 수밖에 없는데(그러면 띠도 회색이 됩니다),
          보고 나서 흰 제목 줄이 낫다고 정했습니다. 아래 두 가지는 이미 해봤고
          효과가 없으니 다시 시도하지 마세요:
           - 목록 층을 화면 맨 위까지 깔기 → 사파리 영역이라 못 덮습니다.
           - 안전 영역을 회색으로 채우기 → 사파리로 볼 때
             env(safe-area-inset-top)은 0이라 띠 자체가 안 생깁니다.
        */}
        <header
          className="sticky top-0 z-20 flex items-center gap-1 border-b border-line bg-white px-2 pb-2.5"
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

              {/* gap은 같은 사람이 연달아 보낸 말풍선 사이의 간격입니다. */}
              <ol className="flex flex-col gap-2.5 pt-2">
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
      </div>

      {/* 입력창 — 탭바가 없으므로 화면 맨 아래에 붙습니다. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-white/95 px-4 pt-2 backdrop-blur"
        style={{ ...slide, paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
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
            className="min-w-0 flex-1 rounded-full bg-white px-4.5 py-2.5 text-[16px] leading-6 text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
          />
          {/*
            동그라미의 지름은 입력칸의 높이와 같은 44px입니다.
            입력칸 높이 = 글줄 24px(leading-6) + 위아래 여백 10px씩(py-2.5).
            둘 중 하나를 건드리면 다른 하나도 같이 맞춰야 나란히 보입니다.
          */}
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="메시지 보내기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:bg-brand-200"
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
  // 보낸 사람이 바뀌는 자리 — 여기서부터 한 사람의 말 묶음이 새로 시작합니다.
  const isBlockStart = showDateDivider || previous?.senderId !== message.senderId;
  // 같은 사람이 이어서 보내면 사진과 이름을 반복하지 않습니다.
  const showSender = !isMine && isBlockStart;

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
        <p className="mt-2 mb-1 pl-[40px] text-[12px] leading-[18px] font-medium text-ink">
          {senderName}
        </p>
      ) : isBlockStart ? (
        /*
          내 메시지 위와 1:1 대화에는 이름을 적지 않습니다. 그렇다고 이름 줄을
          통째로 빼버리면 바로 앞 원우의 말풍선에 딱 붙어 보입니다.
          그렇다고 이름 줄 높이(18px)를 그대로 비워 두면 이번엔 너무 멀어 보입니다.
          글자가 채워 주는 자리가 없어 빈 곳이 그만큼 더 넓게 읽히기 때문입니다.
          그래서 절반쯤인 16px만 띄웁니다.
        */
        <div className="mt-2 mb-1 h-1" aria-hidden="true" />
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
              : "rounded-bl-lg bg-canvas text-ink shadow-[var(--shadow-card)]"
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
