"use client";

import GuestGate from "@/components/GuestGate";
import { useMemo } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import MidEllipsis from "@/components/MidEllipsis";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { ChatBellIcon, StarIcon, UsersIcon } from "@/components/icons";
import { useChatPrefs } from "@/lib/chat-prefs";
import { ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { otherUidOf, previewText, roomMemberCount, roomTitle } from "@/lib/chat-rooms";
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
function ChatListPageContent() {
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
  /*
   * 즐겨찾기한 1:1 방은 단체방 바로 아래로 (2026-09-27 — 대화방 위 별 단추, lib/chat-prefs.ts).
   * 즐겨찾기끼리, 나머지끼리는 원래대로 최근 순입니다(directRooms가 이미 최근 순).
   */
  const chatPrefs = useChatPrefs(uid);
  const rooms = useMemo(() => {
    const favorite = directRooms.filter((room) => chatPrefs.favorites.has(room.id));
    const rest = directRooms.filter((room) => !chatPrefs.favorites.has(room.id));
    const ordered = [...favorite, ...rest];
    return cohortRoom ? [cohortRoom, ...ordered] : ordered;
  }, [cohortRoom, directRooms, chatPrefs.favorites]);

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
     * 바탕은 흰색(surface) — 2026-09-27 사용자 "채팅탭 배경을 흰색으로 바꾸면서 카톡 대화 목록처럼".
     * 방마다 두르던 흰 박스(2026-09-15)를 걷고, 카톡처럼 흰 바탕에 줄만 세웁니다(줄 사이 선도 없음).
     * 제목 줄도 tone="surface"로 맞춥니다(안 하면 제목 줄만 회색으로 남음).
     *
     * 예전엔 흰색으로 했을 때 맨 윗줄(시계 자리)만 회색으로 남아 회색 바탕으로 돌렸었습니다.
     * 지금은 제목 줄(sticky, 흰색)이 맨 위에 붙어 있어 아이폰이 그 색을 씁니다 — 내 프로필 화면과 같습니다.
     * ★ 흰 바탕은 화면 전체에 붙인 fixed 층(-z-10)으로 깝니다 (2026-09-27 사용자 "배경 전체가 흰색이 되도록").
     *   처음엔 내 프로필처럼 상자에 bg-surface + min-h-full을 줬는데, MainShell의 <main>이 높이를 정해 두지 않아
     *   min-h-full이 먹지 않고 목록 아래부터 회색이 드러났습니다. 화면에 붙인 층은 목록 길이·탭바 여백과 상관없이
     *   화면 전체를 덮고, body 바탕(회색)보다는 위, 목록보다는 아래에 깔립니다.
     */
    <>
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
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
        right={<HeaderActions tone="surface" />}
        tone="surface"
      />

      {/*
        좌우 여백은 다른 탭과 같은 px-4로 맞춥니다.
        pt-4 — 첫 박스와 제목 줄 사이 16px (2026-09-15, 박스로 바꾸며 더함 — 선일 때는 첫 줄이 여백 없이 서도 괜찮았지만
        박스는 제목 줄에 붙어 보입니다). 홈·원우수첩·알림 화면의 첫 칸과 같은 높이에서 시작합니다.
      */}
      <div className="pt-2 pb-8">
        {loading ? (
          /* 아래 진짜 목록과 같은 짜임 — 사진 56px + 위아래 10px씩 = 76px 줄. */
          <ul className="flex flex-col">
            {[0, 1, 2].map((key) => (
              <li key={key} className="flex items-center gap-3.5 px-4 py-2.5">
                <Skeleton className="squircle h-[56px] w-[56px] shrink-0 rounded-none!" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="mt-2 h-3.5 w-44 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="px-4">
            <ErrorState message={error} />
          </div>
        ) : (
          /*
            카톡 대화 목록처럼 흰 바탕에 줄만 — 박스·줄 사이 선 없음 (2026-09-27 사용자 요청).
            ★ 박스 → 줄 사이 선(2026-09-14) → 다시 박스(2026-09-15) → 박스 없는 카톡식(2026-09-27).
              줄마다 좌우 px-4를 줄 안에 두어, 누를 때 옅은 회색이 화면 끝에서 끝까지 깔립니다.
          */
          <>
            <ul className="flex flex-col">
              {rooms.map((room) => (
                <li key={room.id}>
                  <ChatRoomRow
                    room={room}
                    title={roomTitle(room, uid ?? "", nameByUid)}
                    other={memberByUid.get(otherUidOf(room.id, uid ?? "") ?? "")}
                    unread={unreadRooms[room.id] ?? false}
                    memberCount={members.length > 0 ? roomMemberCount(room.id, members) : null}
                    favorite={chatPrefs.favorites.has(room.id)}
                    muted={chatPrefs.muted.has(room.id)}
                  />
                </li>
              ))}
            </ul>

            {/*
              1:1 대화가 없을 때 목록 아래에 붙던 안내 상자("아직 1:1 대화가 없어요")는 2026-09-27 사용자 요청으로 없앴습니다 —
              기수 단체방이 늘 위에 있어 빈 화면이 되지 않습니다.
            */}
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
  memberCount,
  favorite,
  muted,
}: {
  room: ChatRoomDoc;
  title: string;
  /** 상대 원우. 탈퇴 등으로 못 찾으면 없습니다. */
  other?: UserDoc;
  /** 이 방에 안 읽은 새 메시지가 있는지. 몇 개인지는 세지 않습니다. */
  unread: boolean;
  /** 방 인원수 — 이름 옆에 굵은 회색 숫자 (원우 목록을 받기 전엔 null) */
  memberCount: number | null;
  /** 즐겨찾기한 방 — 이름 옆에 작은 별 */
  favorite: boolean;
  /** 알림을 끈 방 — 이름 옆에 작은 종(사선) */
  muted: boolean;
}) {
  const preview = previewText(room);

  return (
    <Link
      href={`/chat/${room.id}`}
      /*
        카톡 대화 목록 한 줄 (2026-09-27 사용자 요청 — 흰 바탕에 박스 없이).
        - 좌우 16px(px-4)·위아래 10px(py-2.5), 사진 56px(2026-09-27 사용자 "더 키워줘", 52px에서). 미리보기가 한 줄이면 76px 줄입니다.
        - 미리보기는 카톡처럼 두 줄까지(line-clamp-2) — 두 줄이면 줄이 그만큼 높아집니다.
        - 누르면 줄 전체가 옅은 회색(fill)으로 — 박스일 때의 살짝 줄어드는 효과 대신.
        예전 흰 박스 값(2026-09-15~26): rounded-3xl bg-surface px-3 py-[10.5px] shadow-card, 사진 58px.
      */
      className="flex items-center gap-3.5 px-4 py-2.5 transition-colors active:bg-fill"
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
        모양(스쿼클·56px)은 1:1 방의 사진과 똑같이 맞춰 두 줄이 나란히 섭니다.

        ★ 바탕은 주황(brand-500)이었다가 같은 날 옅은 회색(fill)으로 바꿨습니다(사용자 요청).
          바탕이 옅어졌으므로 그림은 흰색이면 안 보입니다 — 한 단 진한 회색(ink-muted)으로 함께 바꿨습니다.
          fill은 흰 카드 위에서 한 끗 차이라(globals.css의 --color-fill 주석) 네모가 흐릿하게 보입니다.
          더 또렷하게 하려면 bg-line쯤으로 올리세요.
      */}
      {room.cohort ? (
        <span
          aria-hidden="true"
          className="squircle flex h-[56px] w-[56px] shrink-0 items-center justify-center bg-fill text-ink-muted"
        >
          <UsersIcon className="h-7 w-7" strokeWidth={1.9} />
        </span>
      ) : (
        <Avatar
          src={other?.photoURL ?? null}
          name={title}
          seed={room.id}
          size={56}
          className="squircle rounded-none!"
        />
      )}

      <div className="min-w-0 flex-1">
        {/* 이름 옆 작은 표시 — 즐겨찾기 별(주황)·알림 끔 종(회색), 카톡의 핀·음소거 자리 (2026-09-27). */}
        <p className="flex min-w-0 items-center gap-1 text-[16px] font-bold text-ink">
          <MidEllipsis text={title} />
          {/* 인원수 — 카톡처럼 이름 옆 굵은 회색 숫자 (2026-09-27 사용자 요청). */}
          {memberCount ? (
            <span className="shrink-0 text-ink-faint tabular-nums">{memberCount}</span>
          ) : null}
          {favorite ? (
            <StarIcon className="h-3.5 w-3.5 shrink-0 text-brand-500" filled strokeWidth={1.6} />
          ) : null}
          {muted ? <ChatBellIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" muted /> : null}
        </p>
        {/* mt-px — 방 이름과의 사이 2px → 1px, 미리보기 1px 위로 (2026-09-27 사용자 요청). */}
        <p className="mt-px line-clamp-2 text-[14px] leading-snug break-all text-ink-muted">
          {preview ||
            (room.cohort
              ? "같은 기수 원우 모두가 있는 방이에요."
              : "대화를 시작해 보세요.")}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 self-start pt-1">
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

/** 로그인 안 하고 둘러보는 사람에게는 로그인 안내 상자만 (2026-09-24, components/GuestGate.tsx). */
export default function ChatListPage() {
  return (
    <GuestGate title="채팅">
      <ChatListPageContent />
    </GuestGate>
  );
}
