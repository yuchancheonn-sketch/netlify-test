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
    /*
     * 이 탭만 바탕이 흰색입니다.
     * 다른 탭은 연한 회색 바탕에 흰 카드를 얹지만, 대화방 목록은 카톡처럼
     * 카드 없이 줄만 늘어놓는 편이 읽기 좋습니다. 카드가 없으니 바탕이
     * 회색이면 줄들이 회색 위에 떠 있는 것처럼 보입니다.
     */
    <div className="min-h-dvh bg-white">
      <PageHeader title="채팅" right={<ProfileAvatarButton />} />

      {/* 좌우 여백은 다른 탭과 같은 px-4로 맞춥니다. */}
      <div className="px-4 pb-8">
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
            {/* 줄 사이 간격은 각 줄이 위아래로 가진 여백이 만듭니다. */}
            <ul className="flex flex-col">
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
                    /* 단체방 이름 옆에 몇 명인지 — 1:1은 둘뿐이라 적지 않습니다. */
                    memberCount={room.kind === "group" ? members.length : undefined}
                    unread={unreadCounts[room.id] ?? 0}
                  />
                </li>
              ))}
            </ul>

            {/* 1:1 방이 하나도 없을 때만, 어디서 말을 걸 수 있는지 알려줍니다. */}
            {rooms.length === 1 ? (
              <EmptyState
                icon={<ChatIcon className="h-10 w-10" />}
                title="아직 1:1 대화가 없어요"
                description="원우 탭에서 원우를 고른 뒤 '채팅'을 누르면 둘만의 대화가 시작됩니다."
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 목록 한 줄 — 사진, 이름(+인원), 마지막 메시지, 시각, 안 읽은 개수.
 *
 * 카톡 대화 목록과 같은 짜임새입니다. 줄마다 카드를 두르지 않고 흰 바탕에
 * 바로 얹습니다. 방이 스무 개쯤 되면 카드가 스무 개 떠 있는 것보다 이쪽이
 * 훨씬 조용합니다. 누르는 자리는 눌렀을 때 잠깐 도는 회색으로 알려줍니다.
 *
 * 시각과 안 읽은 개수는 오른쪽에 위아래로 세웁니다. 예전처럼 시각을 이름 옆에
 * 두면 이름이 길 때 시각이 밀려납니다.
 */
function ChatRoomRow({
  room,
  title,
  other,
  memberCount,
  unread,
}: {
  room: ChatRoomDoc;
  title: string;
  /** 1:1 방일 때 상대 원우. 단체방이면 없습니다. */
  other?: UserDoc;
  /** 단체방 이름 옆에 적을 인원 수. 1:1이면 없습니다. */
  memberCount?: number;
  unread: number;
}) {
  const preview = previewText(room);
  const isGroup = room.kind === "group";

  return (
    <Link
      href={`/chat/${room.id}`}
      className="flex items-center gap-3.5 rounded-2xl px-1 py-2.5 transition active:bg-canvas"
    >
      {isGroup ? (
        // 단체방은 사람 사진 대신 브랜드 색 아이콘을 씁니다.
        <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <UsersIcon className="h-7 w-7" />
        </span>
      ) : (
        /*
          동그라미가 아니라 모서리 둥근 네모입니다. 뒤에 붙은 !는 Avatar가
          기본으로 들고 있는 rounded-full을 확실히 이기기 위한 것입니다 —
          같은 속성이면 클래스를 적은 순서가 아니라 Tailwind가 만든 CSS
          순서로 이깁니다.
        */
        <Avatar
          src={other?.photoURL ?? null}
          name={title}
          seed={room.id}
          size={54}
          className="rounded-2xl!"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-[16px] font-bold text-ink">{title}</p>
          {memberCount ? (
            <span className="shrink-0 text-[14px] font-medium text-ink-faint tabular-nums">
              {memberCount}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[14px] text-ink-muted">
          {preview ||
            (isGroup ? `${COHORT} 원우 모두가 함께하는 방이에요.` : "대화를 시작해 보세요.")}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {room.lastMessageAt ? (
          <time className="text-[12px] text-ink-faint">
            {formatChatListTime(room.lastMessageAt.toDate())}
          </time>
        ) : null}

        {unread > 0 ? (
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white tabular-nums">
            {unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : unread}
            <span className="sr-only">개 안 읽음</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
