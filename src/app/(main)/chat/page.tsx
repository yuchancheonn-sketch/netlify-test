"use client";

import { useMemo } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { ChatIcon, UsersIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { otherUidOf, previewText, roomTitle } from "@/lib/chat-rooms";
import { formatChatListTime } from "@/lib/format";
import {
  useApprovedMembers,
  useChatReadTimes,
  useMyChatRooms,
  useUnreadCounts,
} from "@/lib/hooks";
import { COHORT, UNREAD_BADGE_MAX } from "@/lib/constants";
import type { ChatRoomDoc, UserDoc } from "@/lib/types";

/**
 * 채팅 탭 — 내가 들어가 있는 대화방 목록.
 * 10기 단체방이 늘 맨 위에 있고, 그 아래로 원우와의 1:1 대화가 최근 순으로 쌓입니다.
 */
export default function ChatListPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: rooms, loading, error } = useMyChatRooms(uid);
  const { data: members } = useApprovedMembers();

  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);
  const { readMillis, loaded } = useChatReadTimes(uid, roomIds);
  const unreadCounts = useUnreadCounts(uid, readMillis, loaded);

  const memberByUid = useMemo(() => {
    const map = new Map<string, UserDoc>();
    for (const member of members) map.set(member.uid, member);
    return map;
  }, [members]);

  const nameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      if (member.name) map.set(member.uid, member.name);
    }
    return map;
  }, [members]);

  return (
    <>
      <PageHeader title="채팅" right={<ProfileAvatarButton />} />

      {/* 좌우 여백은 다른 탭과 같은 px-5로 맞춥니다. */}
      <div className="px-5 pb-8">
        {loading ? (
          <ul className="flex flex-col gap-2">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton className="h-[76px] rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  <ChatRoomRow
                    room={room}
                    title={roomTitle(room, uid ?? "", nameByUid)}
                    other={
                      room.kind === "direct"
                        ? memberByUid.get(otherUidOf(room.id, uid ?? "") ?? "")
                        : undefined
                    }
                    unread={unreadCounts[room.id] ?? 0}
                  />
                </li>
              ))}
            </ul>

            {/* 1:1 방이 하나도 없을 때만, 어디서 말을 걸 수 있는지 알려줍니다. */}
            {rooms.length === 1 ? (
              <div className="mt-3 rounded-3xl bg-white shadow-[var(--shadow-card)]">
                <EmptyState
                  icon={<ChatIcon className="h-10 w-10" />}
                  title="아직 1:1 대화가 없어요"
                  description="원우 탭에서 원우를 고른 뒤 '채팅'을 누르면 둘만의 대화가 시작됩니다."
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

/** 목록 한 줄 — 사진, 이름, 마지막 메시지, 시각, 안 읽은 개수 */
function ChatRoomRow({
  room,
  title,
  other,
  unread,
}: {
  room: ChatRoomDoc;
  title: string;
  /** 1:1 방일 때 상대 원우. 단체방이면 없습니다. */
  other?: UserDoc;
  unread: number;
}) {
  const preview = previewText(room);
  const isGroup = room.kind === "group";

  return (
    <Link
      href={`/chat/${room.id}`}
      className="flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      {isGroup ? (
        // 단체방은 사람 사진 대신 브랜드 색 아이콘을 씁니다.
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <UsersIcon className="h-7 w-7" />
        </span>
      ) : (
        <Avatar src={other?.photoURL ?? null} name={title} seed={room.id} size={52} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[16px] font-bold text-ink">{title}</p>
          {room.lastMessageAt ? (
            <time className="shrink-0 text-[12px] text-ink-faint">
              {formatChatListTime(room.lastMessageAt.toDate())}
            </time>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[14px] text-ink-muted">
          {preview ||
            (isGroup ? `${COHORT} 원우 모두가 함께하는 방이에요.` : "대화를 시작해 보세요.")}
        </p>
      </div>

      {unread > 0 ? (
        <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white tabular-nums">
          {unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : unread}
          <span className="sr-only">개 안 읽음</span>
        </span>
      ) : null}
    </Link>
  );
}
