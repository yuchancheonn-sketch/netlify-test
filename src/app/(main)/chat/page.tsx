"use client";

import { useMemo } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { ChatIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { otherUidOf, previewText, roomTitle } from "@/lib/chat-rooms";
import { formatChatListTime } from "@/lib/format";
import {
  useApprovedMembers,
  useChatReadTimes,
  useMyChatRooms,
  useUnreadRooms,
} from "@/lib/hooks";
import type { ChatRoomDoc, UserDoc } from "@/lib/types";

/**
 * 채팅 탭 — 원우와의 1:1 대화 목록. 최근에 말이 오간 방이 위로 옵니다.
 *
 * 단체방은 2026-09-10에 없앴습니다. 기수 전체 대화는 카톡 단톡방에서 합니다.
 */
export default function ChatListPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: rooms, loading, error } = useMyChatRooms(uid);
  const { data: members } = useApprovedMembers();

  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);
  const { readMillis, loaded } = useChatReadTimes(uid, roomIds);
  const unreadRooms = useUnreadRooms(uid, rooms, readMillis, loaded);

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
     * 바탕은 다른 탭과 같은 연한 회색입니다.
     *
     * 흰색으로도 해봤는데, 화면 맨 윗줄(시계·배터리가 얹히는 자리)만 회색으로
     * 남아 흰 화면 위에 회색 띠가 그어진 것처럼 보였습니다. 그 자리는 사파리가
     * 제 나름의 색으로 칠하는 자리라 페이지에서 덮을 수 없습니다.
     * 다른 탭과 같은 회색으로 두면 띠가 바탕에 묻혀 보이지 않습니다.
     *
     * 줄마다 카드를 두르지 않는 카톡식 배치는 그대로입니다.
     */
    <>
      {/* 하단 탭 이름은 "채팅" 그대로 두고, 화면 제목에서만 1:1임을 밝힙니다. */}
      <PageHeader title="1:1 채팅" right={<HeaderActions />} />

      {/* 좌우 여백은 다른 탭과 같은 px-4로 맞춥니다. */}
      <div className="px-4 pb-8">
        {loading ? (
          <ul className="flex flex-col gap-2">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                {/* 실제 칸과 같은 높이(8 + 사진 62 + 8). 어긋나면 다 불러온 순간 목록이 덜컥 움직입니다. */}
                <Skeleton className="h-[78px] rounded-3xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState message={error} />
        ) : rooms.length === 0 ? (
          /* 대화가 하나도 없을 때만, 어디서 말을 걸 수 있는지 알려줍니다. */
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<ChatIcon className="h-10 w-10" />}
              title="아직 1:1 대화가 없어요"
              description="원우 탭에서 원우를 고른 뒤 '채팅'을 누르면 둘만의 대화가 시작됩니다."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <ChatRoomRow
                  room={room}
                  title={roomTitle(room, uid ?? "", nameByUid)}
                  other={memberByUid.get(otherUidOf(room.id, uid ?? "") ?? "")}
                  unread={unreadRooms[room.id] ?? false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * 목록 한 줄 — 사진, 이름, 마지막 메시지, 시각, 새 메시지 점.
 *
 * 방마다 흰 카드를 하나씩 두릅니다. 다른 탭의 카드들과 같은 결입니다.
 *
 * 안은 카톡 대화 목록의 짜임새를 따릅니다 — 사진은 모서리 둥근 네모,
 * 시각과 새 메시지 점은 오른쪽에 위아래로. 시각을 이름 옆에 두면
 * 이름이 길 때 시각이 밀려나기 때문입니다.
 */
function ChatRoomRow({
  room,
  title,
  other,
  unread,
}: {
  room: ChatRoomDoc;
  title: string;
  /** 상대 원우. 탈퇴 등으로 못 찾으면 없습니다. */
  other?: UserDoc;
  /** 이 방에 안 읽은 새 메시지가 있는지. 몇 개인지는 세지 않습니다. */
  unread: boolean;
}) {
  const preview = previewText(room);

  return (
    <Link
      href={`/chat/${room.id}`}
      /*
        칸 높이 = 위아래 여백 + 사진.

        가운데 글 두 줄(16px + 14px)을 합쳐도 49px이라, 사진이 칸 높이를
        혼자 정합니다. 글씨나 줄 간격을 건드려도 칸은 꿈쩍하지 않습니다.
        지금은 8 + 62 + 8 = 78px입니다.

        위아래(py-2)와 좌우(px-3)를 다르게 준 이유: 사진을 키우면서도 칸
        높이는 78px 그대로 두려고 위아래만 8px로 좁혔습니다. 좌우까지 8px로
        좁히면 오른쪽 시각·안 읽은 배지가 카드 모서리에 바짝 붙습니다.
        (위 불러오는 중 자리표시의 높이도 이 값에 맞춰 두었습니다.)
      */
      className="flex items-center gap-3.5 rounded-3xl bg-surface px-3 py-2 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      {/*
        동그라미가 아니라 모서리 둥근 네모입니다. 뒤에 붙은 !는 Avatar가
        기본으로 들고 있는 rounded-full을 확실히 이기기 위한 것입니다 —
        같은 속성이면 클래스를 적은 순서가 아니라 Tailwind가 만든 CSS
        순서로 이깁니다.
      */}
      <Avatar
        src={other?.photoURL ?? null}
        name={title}
        seed={room.id}
        size={62}
        className="rounded-2xl!"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold text-ink">{title}</p>
        <p className="mt-1 truncate text-[14px] text-ink-muted">
          {preview || "대화를 시작해 보세요."}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {room.lastMessageAt ? (
          <time className="text-[12px] text-ink-faint">
            {formatChatListTime(room.lastMessageAt.toDate())}
          </time>
        ) : null}

        {/*
          새 메시지가 있으면 빨간 점 하나. 개수는 세지 않습니다 (useUnreadRooms).
          시각과 세로로 나란히 서므로, 점만 있는 줄에서도 자리가 흔들리지 않게
          점을 22px 높이 안에 가운데로 담습니다 — 숫자 배지가 있던 자리입니다.
        */}
        {unread ? (
          <span className="flex h-[22px] items-center">
            <span aria-hidden="true" className="h-[10px] w-[10px] rounded-full bg-red-500" />
            <span className="sr-only">새 메시지 있음</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
