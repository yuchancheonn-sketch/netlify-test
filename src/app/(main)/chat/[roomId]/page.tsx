"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { ArrowUpIcon, ChatIcon, ChevronLeftIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { markChatRead } from "@/lib/chat-read";
import {
  deleteChatMessage,
  editChatMessage,
  otherUidOf,
  sendChatMessage,
} from "@/lib/chat-rooms";
import { formatClockTime, formatDateDivider, isSameDay } from "@/lib/format";
import { useApprovedMembers, useMessages } from "@/lib/hooks";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { CHAT_PAGE_SIZE, MARK_READ_GAP } from "@/lib/constants";
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** 지금 수정·삭제 박스가 떠 있는 메시지. 한 번에 하나만 뜹니다. */
  const [menuForId, setMenuForId] = useState<string | null>(null);
  /**
   * 지금 고치고 있는 메시지의 id. 없으면 새 메시지를 쓰는 중입니다.
   *
   * 아래 입력줄 하나를 새로 쓰기와 고치기가 함께 씁니다 — 고칠 때만 위에
   * "메시지 수정 중" 줄이 붙고, 보내기 단추가 고침을 확정합니다.
   */
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  /** "더 보기"로 과거를 불러왔을 때는 맨 아래로 끌어내리지 않습니다. */
  const skipAutoScroll = useRef(false);

  /*
   * 오른쪽으로 밀어서 목록으로 나가기 — 왼쪽 위 < 버튼과 같은 동작입니다.
   * 손짓을 읽는 부분은 내 프로필·설정 화면과 함께 쓰는 lib/use-swipe-back.ts에 있습니다.
   *
   * 예전에는 미는 동안 대화방 뒤로 진짜 채팅 목록을 깔아 두었는데, 밀 때마다
   * 목록이 통째로 다시 그려지며 뒤에서 움직이는 모습이 오히려 어색했습니다.
   * 내 프로필·설정 화면처럼 민 만큼 흰 바탕만 드러나다가, 손을 떼고 실제로
   * 목록으로 넘어갈 때 비로소 목록이 나타나는 편이 자연스럽습니다.
   */
  const swipe = useSwipeBack({ onCommit: () => router.push("/chat") });

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

  const otherId = uid ? otherUidOf(roomId, uid) : null;
  const title = (otherId && nameByUid.get(otherId)) || "원우";

  /*
   * 1:1 방이 아닌 주소로 들어오면 채팅 목록으로 돌려보냅니다.
   * 단체방(/chat/main)을 없앴는데, 예전 알림이나 방문 기록에 그 주소가 남아
   * 있을 수 있습니다. 보안 규칙도 그 방을 막아서, 두면 빈 화면만 뜹니다.
   */
  useEffect(() => {
    if (uid && !otherId) router.replace("/chat");
  }, [uid, otherId, router]);

  useEffect(() => {
    if (skipAutoScroll.current) {
      skipAutoScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId, loading]);

  /*
   * 자판이 올라와 있는 동안 body에 표시를 붙입니다. (실제로 여백을 줄이는 건 globals.css)
   *
   * 입력줄 아래에는 아이폰 홈 바에 가리지 않도록 안전 영역만큼(34px쯤) 여백을
   * 둡니다. 그런데 자판이 올라오면 그 자리를 자판이 덮어버려서, 여백이 입력줄과
   * 자판 사이의 빈칸으로만 남습니다. 카톡처럼 바짝 붙이려면 그동안 걷어야 합니다.
   *
   * ★ 자판 높이를 재서 알아내려던 것을 그만두고, 입력칸이 focus를 잡았는지로
   *   바꿨습니다.
   *
   *   예전에는 visualViewport로 "화면 전체 높이 - 지금 보이는 높이"를 재서
   *   자판 높이로 삼았습니다. 그런데 자판이 올라올 때 아이폰은 화면을 위로
   *   밀어 올리고 그만큼 visualViewport.offsetTop이 커집니다. 그 둘이 서로
   *   상쇄돼 잰 값이 0에 가깝게 나오면, 자판이 떠 있는데도 안 떠 있다고 보고
   *   여백을 그대로 두었습니다. 입력줄과 자판 사이에 46px(여백 12 + 안전영역
   *   34)이 남던 것이 이것입니다.
   *
   *   폰에서 입력칸에 커서가 들어갔다는 건 곧 자판이 올라왔다는 뜻이라,
   *   focus/blur로 보면 잴 것도 없고 어긋날 일도 없습니다.
   *   (마우스가 있는 컴퓨터에서는 안전 영역 자체가 0이라 달라지는 게 없습니다.)
   */
  useEffect(() => {
    // 방을 떠날 때 표시가 남아 다른 화면에 영향을 주지 않도록 지웁니다.
    return () => {
      delete document.body.dataset.keyboard;
    };
  }, []);

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

  /**
   * 보내기 단추 하나가 두 가지 일을 합니다 — 고치는 중이면 고침을 확정하고,
   * 아니면 새 메시지를 보냅니다.
   */
  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !uid || sending) return;

    setSending(true);
    setSendError(null);
    // 실패하면 되돌릴 수 있도록 원본을 들고 있습니다.
    setDraft("");

    try {
      if (editingId) {
        /*
         * 마지막 메시지인지는 **지금** 셉니다.
         * 고치기 시작한 뒤에 새 메시지가 들어왔을 수 있는데, 그때 미리 세어둔
         * 값을 쓰면 남의 새 말을 밀어내고 목록 미리보기를 덮어씁니다.
         */
        const index = messages.findIndex((message) => message.id === editingId);
        await editChatMessage({
          roomId,
          messageId: editingId,
          text,
          isLast: index >= 0 && index === messages.length - 1,
        });
        setEditingId(null);
      } else {
        await sendChatMessage({ roomId, sender: { uid, profile }, text });
      }
    } catch {
      setDraft(text);
      setSendError(
        editingId
          ? "메시지를 고치지 못했어요. 다시 시도해 주세요."
          : "메시지를 보내지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setSending(false);
    }
  }

  /** 말풍선 위 "수정"을 눌렀을 때 — 그 내용을 입력줄로 데려옵니다. */
  function startEdit(message: MessageDoc) {
    setMenuForId(null);
    setSendError(null);
    setDeleteError(null);
    setEditingId(message.id);
    setDraft(message.text);
    // 곧바로 고칠 수 있도록 자판을 올립니다.
    inputRef.current?.focus();
  }

  /**
   * 고치기 전의 원래 내용. "메시지 수정 중" 칸에 작게 띄웁니다.
   *
   * 따로 들고 있지 않고 목록에서 그때그때 찾습니다. 원본은 저장을 누르기
   * 전까지 Firestore에 그대로 있으므로, 베껴 두면 두 벌이 되어 어긋날 뿐입니다.
   */
  const editingOriginal = editingId
    ? (messages.find((message) => message.id === editingId)?.text ?? null)
    : null;

  /** 고치기를 그만둡니다. 쓰던 내용은 버립니다 — 원래 메시지는 그대로입니다. */
  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setSendError(null);
  }

  /**
   * 내가 보낸 메시지를 지웁니다.
   * 말풍선을 꾸욱 누르면 위에 뜨는 "전체에서 삭제"를 눌렀을 때 여기로 옵니다.
   *
   * 따로 "정말요?"를 묻지 않습니다. 꾸욱 누르고 → 빨간 글씨를 한 번 더
   * 누르는 것 자체가 이미 두 단계라, 확인창을 겹치면 성가시기만 합니다.
   */
  async function handleDelete(message: MessageDoc, index: number) {
    setMenuForId(null);
    setDeleteError(null);
    try {
      await deleteChatMessage({
        roomId,
        messageId: message.id,
        /*
         * 지금 화면의 마지막 줄이면 방의 마지막 메시지입니다 (messages는
         * 오래된 것부터 담겨 있습니다). 그럴 때만 채팅 목록의 미리보기를
         * 바로 앞 메시지로 되돌립니다.
         */
        isLast: index === messages.length - 1,
        previous: index > 0 ? messages[index - 1] : null,
      });
    } catch {
      setDeleteError("메시지를 지우지 못했어요. 다시 시도해 주세요.");
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
  const slide = swipe.slideStyle;

  /*
   * 바깥 상자도 안쪽과 같은 흰색입니다.
   *
   * 밀리는 안쪽 상자(아래 slide가 걸린 것)가 오른쪽으로 빠져나가는 동안
   * 그 자리로 바깥 상자의 색이 드러납니다. 내 프로필·설정 화면이 canvas
   * 회색을 두는 것과 같은 이유로, 대화방은 자기 바탕색인 흰색을 둡니다.
   */
  return (
    <div
      className="flex min-h-dvh flex-col bg-surface"
      {...swipe.handlers}
      style={swipe.touchAction}
    >
      <div
        className="relative z-10 flex flex-1 flex-col bg-surface"
        style={slide}
        onTransitionEnd={swipe.onSlideSettled}
      >
        {/*
          제목 줄 — 다른 화면의 큰 제목(PageHeader) 대신 얇게 둡니다.
          대화방은 화면을 최대한 대화에 내주는 편이 좋습니다.

          바탕은 대화와 같은 흰색이되, 아래에 연한 회색 실선 한 줄로 대화와
          갈라 둡니다. 반투명은 쓰지 않습니다 — 살짝 비치면 위로 지나가는
          말풍선이 제목 글씨에 겹쳐 보입니다.
        */}
        <header
          className="sticky top-0 z-20 flex items-center gap-1 border-b border-line bg-surface px-2 pb-2.5"
          style={{ paddingTop: "calc(8px + env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            onClick={() => router.push("/chat")}
            aria-label="채팅 목록으로"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink active:bg-fill"
          >
            <ChevronLeftIcon className="h-7 w-7" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[17px] font-bold text-ink">{title}</p>
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
              description={`${title} 원우에게 첫 메시지를 보내보세요.`}
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
                    className="rounded-full bg-surface px-4 py-2 text-[13px] font-bold text-ink-muted shadow-[var(--shadow-card)]"
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
                    /* 고치기·지우기는 내 메시지에만. 남의 말은 보안 규칙도 막습니다. */
                    menuOpen={menuForId === message.id}
                    onOpenMenu={
                      message.senderId === uid ? () => setMenuForId(message.id) : null
                    }
                    onCloseMenu={() => setMenuForId(null)}
                    onEdit={() => startEdit(message)}
                    onDelete={() => void handleDelete(message, index)}
                  />
                ))}
              </ol>
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/*
        입력창 — 탭바가 없으므로 화면 맨 아래에 붙습니다.

        아래 여백은 인라인 style이 아니라 클래스로 둡니다. 자판이 올라오면
        globals.css가 body[data-keyboard="open"]을 보고 이 여백을 줄이는데,
        인라인 style로 두면 CSS가 그걸 이기지 못합니다.
      */}
      <div
        className="chat-composer fixed inset-x-0 bottom-0 z-20 bg-surface/95 px-4 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur"
        style={slide}
      >
        {/*
          입력칸을 눌렀을 때 둘러지던 주황 테두리(focus:ring)는 뺐습니다.
          글자를 치는 칸이라, 깜빡이는 커서와 올라온 자판만으로도
          어디에 쓰고 있는지 알 수 있습니다.
        */}
        {/*
          고치는 중일 때만 입력줄 위에 붙는 줄.
          이것이 없으면 왜 입력칸에 글이 미리 들어와 있는지 알 수 없습니다.
        */}
        {editingId ? (
          <div className="mx-auto mb-2 flex w-full max-w-[560px] items-center gap-2 rounded-2xl bg-canvas px-3.5 py-2">
            {/* min-w-0이 있어야 아래 truncate가 듣습니다. 없으면 칸이 글자만큼 늘어납니다. */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink-muted">메시지 수정 중</p>
              {/*
                고치기 전의 내용. 입력칸에는 이미 고치는 중인 글이 들어 있어서,
                원래 뭐라고 썼는지는 여기서만 볼 수 있습니다.
                길면 한 줄로 자릅니다 — 원본을 다 보여주는 자리가 아니라
                "무엇을 고치는 중인지" 알려주는 자리입니다.
              */}
              {editingOriginal ? (
                <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                  {editingOriginal}
                </p>
              ) : null}
            </div>
            {/* 크기 뒤의 !는 위 삭제 박스와 같은 이유입니다 (globals.css의 button 규칙). */}
            <button
              type="button"
              onClick={cancelEdit}
              className="shrink-0 text-[13px]! font-bold text-ink-faint transition active:text-brand-500"
            >
              취소
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSend} className="mx-auto flex w-full max-w-[560px] items-end gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            /* 커서가 들어오면 자판이 올라온 것으로 봅니다 (위 useEffect 설명 참고). */
            onFocus={() => {
              document.body.dataset.keyboard = "open";
              /*
                입력칸은 대화 영역 밖(화면에 붙은 별개 층)이라 삭제 박스를
                닫아주는 덮개가 여기까지 닿지 않습니다. 글을 쓰려고 눌렀다는
                건 지우려던 마음을 접었다는 뜻이므로 여기서 닫아줍니다.
              */
              setMenuForId(null);
            }}
            onBlur={() => {
              delete document.body.dataset.keyboard;
            }}
            placeholder={editingId ? "메시지 고치기" : "메시지 보내기"}
            aria-label={editingId ? "메시지 수정" : "메시지 입력"}
            maxLength={1000}
            /*
              바탕은 canvas — 남의 말풍선과 같은 회색입니다.
              대화방은 바탕이 흰색(surface)이라 입력칸까지 흰색이면 테두리 없는
              칸이 바탕에 묻혔습니다. 어두운 화면에서는 이 색이 바탕보다 한 단
              더 진한 회색이 되어, 카톡처럼 입력칸이 또렷하게 앉습니다.
            */
            className="min-w-0 flex-1 rounded-full bg-canvas px-4.5 py-2.5 text-[16px] leading-6 text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
          />
          {/*
            동그라미의 지름은 입력칸의 높이와 같은 44px입니다.
            입력칸 높이 = 글줄 24px(leading-6) + 위아래 여백 10px씩(py-2.5).
            둘 중 하나를 건드리면 다른 하나도 같이 맞춰야 나란히 보입니다.
          */}
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label={editingId ? "고친 내용 저장" : "메시지 보내기"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:bg-brand-200"
          >
            {sending ? (
              <Spinner className="h-[17px] w-[17px]" />
            ) : (
              <ArrowUpIcon className="h-[17px] w-[17px]" />
            )}
          </button>
        </form>
        {/* 보내기·지우기 실패는 같은 자리에 알립니다. 둘이 겹칠 일은 없습니다. */}
        {sendError ?? deleteError ? (
          <p role="alert" className="mt-2 text-center text-[12px] font-medium text-danger">
            {sendError ?? deleteError}
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

/** 말풍선을 "꾸욱" 누른 것으로 볼 시간(밀리초). 카톡·인스타와 비슷하게 잡았습니다. */
const LONG_PRESS_MS = 450;

/**
 * 이만큼(px) 움직이면 누른 게 아니라 화면을 굴린 것으로 봅니다.
 * 손가락은 가만히 있어도 몇 픽셀씩 떨리므로 0으로 두면 아무것도 안 눌립니다.
 */
const LONG_PRESS_SLOP = 10;

/**
 * 꾸욱 누르기.
 *
 * 터치가 아니라 **포인터** 사건을 씁니다. 그래야 폰의 손가락과 컴퓨터의 마우스가
 * 같은 길로 들어와, 개발할 때 컴퓨터에서도 눌러볼 수 있습니다.
 *
 * onContextMenu는 막기만 합니다. 안드로이드 크롬은 길게 누르면 브라우저 제 메뉴를
 * 띄우려 하는데, 그걸 두면 우리 박스와 겹칩니다. 여기서 다시 onLongPress를 부르지도
 * 않습니다 — 아래 타이머가 이미 불렀으므로 박스가 두 번 뜹니다.
 */
function useLongPress(onLongPress: (() => void) | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  function cancel() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }

  // 누르고 있는 채로 화면이 바뀌면 타이머만 남습니다. 떠날 때 치웁니다.
  useEffect(() => cancel, []);

  if (!onLongPress) return {};

  return {
    onPointerDown(event: React.PointerEvent) {
      // 마우스는 왼쪽 단추만. 오른쪽 클릭은 아래 onContextMenu가 맡습니다.
      if (event.pointerType === "mouse" && event.button !== 0) return;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove(event: React.PointerEvent) {
      const start = origin.current;
      if (!start || timer.current === null) return;
      if (
        Math.abs(event.clientX - start.x) > LONG_PRESS_SLOP ||
        Math.abs(event.clientY - start.y) > LONG_PRESS_SLOP
      ) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu(event: React.MouseEvent) {
      event.preventDefault();
      // 컴퓨터에서 오른쪽 클릭으로도 열리게 해둡니다.
      if (event.nativeEvent.detail !== 0) onLongPress();
    },
  };
}

/** 말풍선 한 줄. 날짜가 바뀌면 위에 날짜 구분선을 함께 그립니다. */
function MessageRow({
  message,
  previous,
  isMine,
  senderName,
  senderPhoto,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: {
  message: MessageDoc;
  previous?: MessageDoc;
  isMine: boolean;
  senderName: string;
  senderPhoto: string | null;
  /** 이 말풍선 위에 수정·삭제 박스가 떠 있는지 */
  menuOpen: boolean;
  /** 꾸욱 눌렀을 때 할 일. 손댈 수 없는 메시지(남의 말)면 null */
  onOpenMenu: (() => void) | null;
  onCloseMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const longPress = useLongPress(onOpenMenu);
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

      {isBlockStart ? (
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

        {/*
          말풍선과, 그 위에 뜨는 "전체에서 삭제" 박스를 함께 담는 자리입니다.
          박스가 말풍선을 기준으로 앉아야 해서 relative를 여기 둡니다.
          폭 상한(70%)도 말풍선에서 이리로 옮겼습니다 — 말풍선은 이 안을
          그대로 채우므로 보이는 크기는 예전과 같습니다.

          박스가 떠 있는 동안에는 이 덩어리만 z-40으로 올려, 아래위 말풍선과
          제목 줄 위로 나옵니다.
        */}
        <div className={`relative max-w-[70%] ${menuOpen ? "z-40" : ""}`}>
          {menuOpen ? (
            <>
              {/*
                박스 밖 아무 데나 누르면 닫힙니다.
                화면을 덮되 어둡게 하지는 않습니다 — 고치고 지우는 것은 흔한
                일이라, 화면 전체를 가라앉히면 실제보다 큰일처럼 보입니다.
              */}
              <span
                aria-hidden="true"
                className="fixed inset-0 z-30"
                onPointerDown={onCloseMenu}
              />

              {/*
                내 말풍선은 늘 오른쪽에 붙으므로 박스도 오른쪽 끝에 맞춥니다.

                색은 화면 밝기를 따르지 않고 늘 같은 진한 회색입니다.
                떠 있는 작은 메뉴는 배경 위에 얹힌 별개의 판으로 보여야 하고,
                밝은 화면에서든 어두운 화면에서든 빨간 글씨가 가장 또렷하게
                읽히는 바탕이 이 회색입니다.
                (빨강은 red-400입니다. red-500은 이 회색 위에서 대비가 모자라
                 글씨가 탁해 보입니다.)

                지우기만 빨갛습니다. 되돌릴 수 없는 쪽이 하나뿐이라야
                빨강이 "조심"이라는 뜻을 유지합니다.
              */}
              {/*
                ★ 글씨 크기 뒤의 !는 꼭 필요합니다.

                globals.css의 `button { font-size: 16px }`는 레이어 밖에 있고,
                Tailwind의 text-* 는 @layer utilities 안에 있습니다. 레이어 밖
                규칙은 선택자가 아무리 헐거워도 레이어 안 규칙을 이기므로,
                그냥 text-[13px]로 두면 조용히 16px로 그려집니다.
                (그 규칙은 아이폰에서 입력칸을 눌렀을 때 화면이 확대되지 않게
                 막는 것이라 없앨 수 없습니다.)

                두 단추가 같은 크기로 보이려면 둘 다 이렇게 못 박아야 합니다.
              */}
              <div className="absolute right-0 bottom-full z-40 mb-1.5 flex flex-col overflow-hidden rounded-xl bg-[#33383E] shadow-[var(--shadow-float)]">
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3.5 py-2 text-[13px]! font-bold whitespace-nowrap text-white transition active:bg-[#40464D]"
                >
                  수정
                </button>
                <span className="h-px bg-white/15" aria-hidden="true" />
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3.5 py-2 text-[13px]! font-bold whitespace-nowrap text-red-400 transition active:bg-[#40464D]"
                >
                  전체에서 삭제
                </button>
              </div>
            </>
          ) : null}

          <p
            {...longPress}
            className={`rounded-3xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap ${
              isMine
                ? /*
                     내 말풍선은 꾸욱 눌러 고치거나 지울 수 있습니다. 그동안
                     아이폰이 글자를 잡아 "복사" 풍선을 띄우면 우리 박스와
                     겹치므로, 내 말풍선에서만 글자 선택을 끕니다.
                   */
                  "rounded-br-lg bg-brand-500 text-white select-none [-webkit-touch-callout:none]"
                : "rounded-bl-lg bg-canvas text-ink shadow-[var(--shadow-card)]"
            }`}
          >
            {message.text}
            {/*
              고친 메시지에는 흔적을 남깁니다. 언제 고쳤는지까지는 적지 않습니다 —
              "고쳐진 말"이라는 사실만 알면 되고, 시각이 둘이면 오히려 헷갈립니다.
            */}
            {message.editedAt ? (
              <span
                className={`ml-1.5 text-[11px] ${isMine ? "text-white/70" : "text-ink-faint"}`}
              >
                수정됨
              </span>
            ) : null}
          </p>
        </div>

        {!isMine ? (
          <time className="shrink-0 pb-1 text-[11px] text-ink-faint">
            {formatClockTime(sentAt)}
          </time>
        ) : null}
      </div>
    </li>
  );
}
