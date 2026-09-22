"use client";

import { useMemo } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { ChatIcon, UsersIcon } from "@/components/icons";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { otherUidOf, previewText, roomTitle } from "@/lib/chat-rooms";
import { formatChatListTime } from "@/lib/format";
import {
  useApprovedMembers,
  useChatReadTimes,
  useCohortChatRoom,
  useMyChatRooms,
  useUnreadRooms,
} from "@/lib/hooks";
import { useViewCohort } from "@/lib/use-view-cohort";
import type { ChatRoomDoc, UserDoc } from "@/lib/types";

/**
 * 채팅 탭 — 맨 위에 기수 단체방 하나, 그 아래 1:1 대화 목록(최근 순).
 *
 * ★ 기수 단체방 (2026-09-22 사용자 요청)
 *   기수마다 방이 하나씩 있고, 그 기수 원우는 **무조건** 그 방에 있습니다.
 *   들어오고 나가는 것이 없으므로 목록에서 내릴 수도 없고, 한 마디도 오가지 않아도
 *   늘 맨 위에 서 있습니다. 명단을 문서에 적지 않고 users/{uid}.cohort로 가리는
 *   까닭은 lib/chat-rooms.ts 맨 위에 적어 두었습니다.
 *
 *   (2026-09-10에 없앤 옛 단체방 "main"과는 다른 것입니다. 그때는 방이 앱 전체에 하나였고
 *    카톡 단톡방으로 대신하기로 했었습니다.)
 *
 * ★ 기수 고르개는 **운영진에게만** 보입니다 (useViewCohort).
 *   원우는 늘 자기 기수 방만 봅니다. 홈·자료·일정·수업 화면과 같은 규칙이고,
 *   고른 값도 그 화면들과 함께 따라다닙니다.
 */
export default function ChatListPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { cohort, canSwitch, setCohort } = useViewCohort();
  const { data: directRooms, loading, error } = useMyChatRooms(uid);
  const cohortRoom = useCohortChatRoom(cohort);
  const { data: members } = useApprovedMembers();

  /*
   * 기수 단체방을 늘 맨 위에 둡니다 — 최근 순 정렬에 섞지 않습니다.
   * 카톡의 공지방처럼 자리가 고정돼 있어야 "무조건 있는 방"으로 읽힙니다.
   */
  const rooms = useMemo(
    () => (cohortRoom ? [cohortRoom, ...directRooms] : directRooms),
    [cohortRoom, directRooms],
  );

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
     * 방마다 흰 박스를 두릅니다(2026-09-15, 원우수첩 목록과 같은 박스 — 한때는 카톡식으로 줄 사이 선만 두었습니다).
     */
    <>
      {/*
        제목은 "채팅"입니다 — 기수 단체방이 생겨 1:1만 있는 화면이 아니게 됐습니다
        (2026-09-22. 그 전에는 "1:1 채팅"이었습니다).
        제목 옆 기수 고르개는 운영진에게만 붙습니다 — 홈과 같은 짜임입니다.
      */}
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex items-center gap-2">
              채팅
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "채팅"
          )
        }
        right={<HeaderActions />}
      />

      {/*
        좌우 여백은 다른 탭과 같은 px-4로 맞춥니다.
        pt-4 — 첫 박스와 제목 줄 사이 16px (2026-09-15, 박스로 바꾸며 더함 — 선일 때는 첫 줄이 여백 없이 서도 괜찮았지만
        박스는 제목 줄에 붙어 보입니다). 홈·원우수첩·알림 화면의 첫 칸과 같은 높이에서 시작합니다.
      */}
      <div className="px-4 pt-4 pb-8">
        {loading ? (
          /* 아래 진짜 목록과 같은 짜임 — 12px씩 띄운 박스, 칸 높이 79px(사진 58px + 안쪽 위아래 10.5px씩). */
          <ul className="flex flex-col gap-3">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton className="h-[79px] rounded-3xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          /*
            방마다 흰 박스(ChatRoomRow)를 세우고 12px씩 띄워 나눕니다 — 원우수첩 목록과 같은 짜임.
            ★ 박스 → 줄 사이 선(2026-09-14) → 다시 박스(2026-09-15 사용자 "원우탭처럼 박스로 구분 짓게 해줘").
              원우수첩이 같은 날 박스로 돌아간 것에 맞췄습니다. 선으로 되돌리려면 git 기록의
              border-t와 ChatRoomRow의 py-2(좌우 여백 없음)를 보세요.
          */
          <>
            <ul className="flex flex-col gap-3">
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

            {/*
              1:1 대화가 하나도 없을 때만, 어디서 말을 걸 수 있는지 알려줍니다.
              기수 단체방은 늘 위에 서 있으므로 "대화가 하나도 없는 화면"은 이제 없습니다 —
              그래서 목록을 대신하는 빈 화면이 아니라 목록 **아래에 덧붙이는 안내**입니다.
            */}
            {directRooms.length === 0 ? (
              <div className="mt-3 rounded-3xl bg-surface shadow-[var(--shadow-card)]">
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

        가운데 글 두 줄(17px + 14px)을 합쳐도 50px 남짓이라, 사진이 칸 높이를
        혼자 정합니다. 글씨나 줄 간격을 건드려도 칸은 꿈쩍하지 않습니다.
        지금은 10.5 + 58 + 10.5 = 79px입니다 (2026-09-22 사용자 "아주 조금만 더 줄여줘" — 사진 62→58px, 위아래 11.5→10.5px).
        (2026-09-15 사용자 "박스들 높이 1px 만큼 줄여줘"로 위아래 12px → 11.5px씩. 좌우는 12px(px-3) 그대로.)

        ★ 흰 박스입니다 (2026-09-15 사용자 요청 — 원우수첩 목록처럼).
          bg-surface · shadow-[var(--shadow-card)](헤어라인 포함) · rounded-3xl · 안쪽 여백 p-3(12px) —
          원우수첩 MemberRow와 같은 값입니다. 한쪽을 바꾸면 같이 봐 주세요.
          줄 사이 선으로 지낼 때(2026-09-14)는 py-2만 두고 좌우 여백을 걷어 사진을 바깥 px-4에 맞췄습니다.
        (위 불러오는 중 자리표시의 높이도 이 값에 맞춰 두었습니다.)
      */
      className="flex items-center gap-3.5 rounded-3xl bg-surface px-3 py-[10.5px] shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      {/*
        동그라미가 아니라 스쿼클(네 변이 부드럽게 부푼 둥근 네모)입니다 — globals.css의 squircle.
        뒤에 붙은 !는 Avatar가 기본으로 들고 있는 rounded-full을 확실히 끄기 위한 것입니다 —
        같은 속성이면 클래스를 적은 순서가 아니라 Tailwind가 만든 CSS
        순서로 이깁니다. 모서리를 둥글게 남겨 두면 가면보다 먼저 깎여 모양이 틀어집니다.
      */}
      {/*
        기수 단체방은 사람 사진이 없으므로 옅은 회색 바탕에 사람들 그림을 담습니다 (2026-09-22).
        이름 이니셜(Avatar의 기본 갈래)을 쓰면 "10기 단체 대화방"에서 두 글자를 잘라
        "단체" 같은 조각이 나와 무슨 방인지 알아볼 수 없습니다.
        모양(스쿼클·58px)과 자리(ml-px)는 1:1 방의 사진과 똑같이 맞춰 두 줄이 나란히 섭니다.

        ★ 바탕은 주황(brand-500)이었다가 같은 날 옅은 회색(fill)으로 바꿨습니다(사용자 요청).
          바탕이 옅어졌으므로 그림은 흰색이면 안 보입니다 — 한 단 진한 회색(ink-muted)으로 함께 바꿨습니다.
          fill은 흰 카드 위에서 한 끗 차이라(globals.css의 --color-fill 주석) 네모가 흐릿하게 보입니다.
          더 또렷하게 하려면 bg-line쯤으로 올리세요.
      */}
      {room.cohort ? (
        <span
          aria-hidden="true"
          className="squircle ml-px flex h-[58px] w-[58px] shrink-0 items-center justify-center bg-fill text-ink-muted"
        >
          <UsersIcon className="h-8 w-8" strokeWidth={1.9} />
        </span>
      ) : (
        <Avatar
          src={other?.photoURL ?? null}
          name={title}
          seed={room.id}
          size={58}
          className="squircle ml-px rounded-none!"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold text-ink">{title}</p>
        <p className="mt-1 truncate text-[14px] text-ink-muted">
          {preview ||
            (room.cohort
              ? "같은 기수 원우 모두가 있는 방이에요."
              : "대화를 시작해 보세요.")}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {room.lastMessageAt ? (
          <time className="mr-0.5 text-[13px] text-ink-faint">
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
