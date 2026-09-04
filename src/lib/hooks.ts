"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markChatRead } from "@/lib/chat-read";
import { emptyGroupRoom, toChatRoom } from "@/lib/chat-rooms";
import { MAIN_CHAT_ROOM_ID, UNREAD_BADGE_MAX } from "@/lib/constants";
import { todayString } from "@/lib/format";
import type {
  ChatReadDoc,
  ChatRoomDoc,
  EventDoc,
  MessageDoc,
  PhotoAlbumDoc,
  PhotoDoc,
  RosterDoc,
  RsvpDoc,
  SessionDoc,
  SessionNotesDoc,
  UserDoc,
} from "@/lib/types";

/** 목록형 화면이 공통으로 쓰는 상태 */
export interface ListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

const EMPTY: ListState<never> = { data: [], loading: true, error: null };

/**
 * 승인된 원우 목록.
 * 원우수첩처럼 이름 가나다순으로 정렬합니다.
 * 정렬은 Firestore 색인을 따로 만들지 않아도 되도록 앱에서 처리합니다.
 * (수십 명 규모라 성능 문제가 없습니다.)
 */
export function useApprovedMembers(): ListState<UserDoc> {
  const [state, setState] = useState<ListState<UserDoc>>(EMPTY);

  useEffect(() => {
    const membersQuery = query(collection(db, "users"), where("status", "==", "approved"));
    return onSnapshot(
      membersQuery,
      (snapshot) => {
        const members = snapshot.docs
          .map((document) => document.data() as UserDoc)
          // 아직 온보딩을 마치지 않은 사람은 소개에 띄우지 않습니다.
          .filter((member) => member.profileCompleted)
          .sort((a, b) => (a.name || a.nickname).localeCompare(b.name || b.nickname, "ko"));
        setState({ data: members, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "원우 목록을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/**
 * 가입 상태와 관계없는 전체 사용자 목록 (운영진 화면 전용).
 * 승인 대기 중인 사람까지 보여야 해서 필터 없이 구독합니다.
 */
export function useAllUsers(): ListState<UserDoc> {
  const [state, setState] = useState<ListState<UserDoc>>(EMPTY);

  useEffect(() => {
    return onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users = snapshot.docs
          .map((document) => document.data() as UserDoc)
          .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, "ko"));
        setState({ data: users, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "원우 목록을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/** 운영진이 미리 등록해 둔 원우 명단 */
export function useRoster(): ListState<RosterDoc> {
  const [state, setState] = useState<ListState<RosterDoc>>(EMPTY);

  useEffect(() => {
    return onSnapshot(
      collection(db, "roster"),
      (snapshot) => {
        const entries = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }) as RosterDoc)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"));
        setState({ data: entries, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "명단을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/** 모든 모임 일정 (날짜 오름차순) */
export function useEvents(): ListState<EventDoc> {
  const [state, setState] = useState<ListState<EventDoc>>(EMPTY);

  useEffect(() => {
    const eventsQuery = query(collection(db, "events"), orderBy("date"));
    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const events = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as EventDoc,
        );
        setState({ data: events, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "일정을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/** 오늘 이후의 일정만 (홈 화면 D-day 카드용) */
export function useUpcomingEvents(): ListState<EventDoc> {
  const { data, loading, error } = useEvents();
  const today = todayString();
  return { data: data.filter((event) => event.date >= today), loading, error };
}

/** 일정 하나 */
export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, "events", eventId),
      (snapshot) => {
        if (snapshot.exists()) {
          setEvent({ id: snapshot.id, ...snapshot.data() } as EventDoc);
          setNotFound(false);
        } else {
          setEvent(null);
          setNotFound(true);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
        setNotFound(true);
      },
    );
  }, [eventId]);

  return { event, loading, notFound };
}

/** 일정별 참석 응답 목록 */
export function useRsvps(eventId: string): ListState<RsvpDoc> {
  const [state, setState] = useState<ListState<RsvpDoc>>(EMPTY);

  useEffect(() => {
    return onSnapshot(
      collection(db, "events", eventId, "rsvps"),
      (snapshot) => {
        const rsvps = snapshot.docs.map(
          (document) => ({ uid: document.id, ...document.data() }) as RsvpDoc,
        );
        setState({ data: rsvps, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "참석 현황을 불러오지 못했어요." }),
    );
  }, [eventId]);

  return state;
}

/**
 * 주차별 수업 정보 (주제·강사).
 * 원우 누구나 채우는 공용 기록이라, 모두가 같은 내용을 봅니다.
 */
export function useSessions(): ListState<SessionDoc> {
  const [state, setState] = useState<ListState<SessionDoc>>(EMPTY);

  useEffect(() => {
    return onSnapshot(
      collection(db, "sessions"),
      (snapshot) => {
        const sessions = snapshot.docs.map(
          (document) => ({ ...document.data(), week: Number(document.id) }) as SessionDoc,
        );
        setState({ data: sessions, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "수업 기록을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/**
 * 내가 주차별로 남긴 느낀점. 본인 것만 봅니다.
 * 열한 주차가 문서 하나에 모여 있어 구독도 하나면 됩니다.
 */
export function useMySessionNotes(uid?: string) {
  // 어느 계정의 기록인지 함께 들고 있어야 계정을 바꿨을 때 섞이지 않습니다.
  const [entry, setEntry] = useState<{
    uid: string;
    notes: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "sessionNotes", uid),
      (snapshot) =>
        setEntry({
          uid,
          notes: (snapshot.data() as SessionNotesDoc | undefined)?.notes ?? {},
        }),
      () => setEntry({ uid, notes: {} }),
    );
  }, [uid]);

  const matched = uid && entry?.uid === uid ? entry : null;
  return { notes: matched?.notes ?? {}, loading: Boolean(uid) && !matched };
}

/** 행사 사진 앨범 목록 (최근 행사가 위로) */
export function useAlbums(): ListState<PhotoAlbumDoc> {
  const [state, setState] = useState<ListState<PhotoAlbumDoc>>(EMPTY);

  useEffect(() => {
    const albumsQuery = query(collection(db, "photoAlbums"), orderBy("eventDate", "desc"));
    return onSnapshot(
      albumsQuery,
      (snapshot) => {
        const albums = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as PhotoAlbumDoc,
        );
        setState({ data: albums, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "앨범을 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/** 앨범 하나 */
export function useAlbum(albumId: string) {
  const [album, setAlbum] = useState<PhotoAlbumDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, "photoAlbums", albumId),
      (snapshot) => {
        if (snapshot.exists()) {
          setAlbum({ id: snapshot.id, ...snapshot.data() } as PhotoAlbumDoc);
          setNotFound(false);
        } else {
          setAlbum(null);
          setNotFound(true);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
        setNotFound(true);
      },
    );
  }, [albumId]);

  return { album, loading, notFound };
}

/** 앨범 안의 사진들 (올린 순서대로) */
export function useAlbumPhotos(albumId: string): ListState<PhotoDoc> {
  const [state, setState] = useState<ListState<PhotoDoc>>(EMPTY);

  useEffect(() => {
    const photosQuery = query(
      collection(db, "photoAlbums", albumId, "photos"),
      orderBy("uploadedAt", "desc"),
    );
    return onSnapshot(
      photosQuery,
      (snapshot) => {
        const photos = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as PhotoDoc,
        );
        setState({ data: photos, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "사진을 불러오지 못했어요." }),
    );
  }, [albumId]);

  return state;
}

/**
 * 대화방 하나의 메시지.
 * 최신 count개만 구독하고, "더 보기"를 누르면 count를 늘려 이전 메시지를 불러옵니다.
 */
export function useMessages(roomId: string, count: number) {
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt", "desc"),
      limit(count),
    );
    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const list = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as MessageDoc,
        );
        // 화면에는 오래된 것부터 보여야 하므로 뒤집습니다.
        setMessages(list.reverse());
        setHasMore(snapshot.size === count);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("메시지를 불러오지 못했어요.");
      },
    );
  }, [roomId, count]);

  return { messages, loading, error, hasMore };
}

/**
 * 내가 들어가 있는 대화방 목록.
 *
 * 단체방은 늘 맨 위에 있고, 1:1 방은 memberUids에 내 uid가 들어 있는 것만
 * 가져옵니다. 정렬은 앱에서 합니다. Firestore에서 정렬까지 시키려면 색인을
 * 따로 만들어 올려야 하는데, 방이 수십 개뿐이라 그럴 값어치가 없습니다.
 */
export function useMyChatRooms(uid?: string): ListState<ChatRoomDoc> {
  const [directRooms, setDirectRooms] = useState<ChatRoomDoc[] | null>(null);
  const [groupRoom, setGroupRoom] = useState<ChatRoomDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1:1 방
  useEffect(() => {
    if (!uid) return;
    const roomsQuery = query(
      collection(db, "chatRooms"),
      where("memberUids", "array-contains", uid),
    );
    return onSnapshot(
      roomsQuery,
      (snapshot) => {
        setDirectRooms(
          snapshot.docs.map((document) => toChatRoom(document.id, document.data())),
        );
        setError(null);
      },
      () => setError("대화 목록을 불러오지 못했어요."),
    );
  }, [uid]);

  // 단체방. 아직 아무도 말을 안 걸어 문서가 없을 수 있어 기본 모습으로 대신합니다.
  useEffect(() => {
    return onSnapshot(
      doc(db, "chatRooms", MAIN_CHAT_ROOM_ID),
      (snapshot) => {
        setGroupRoom(
          snapshot.exists()
            ? toChatRoom(snapshot.id, snapshot.data())
            : emptyGroupRoom(),
        );
      },
      () => setGroupRoom(emptyGroupRoom()),
    );
  }, []);

  const rooms = useMemo(() => {
    const group = groupRoom ?? emptyGroupRoom();
    const others = (directRooms ?? [])
      .filter((room) => room.id !== MAIN_CHAT_ROOM_ID)
      // 최근에 말이 오간 방이 위로 옵니다. 아직 한 마디도 없는 방은 맨 아래.
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
    return [group, ...others];
  }, [groupRoom, directRooms]);

  return { data: rooms, loading: !groupRoom || (!!uid && directRooms === null), error };
}

/**
 * 내가 각 방을 마지막으로 본 시각(밀리초).
 *
 * 한 번도 연 적이 없는 방은 기록이 없습니다. 그럴 때 예전 대화를 전부
 * "안 읽음"으로 세면 가입하자마자 배지에 99+가 뜨므로, 기록이 없으면
 * 지금 시각으로 한 번 남겨 그때부터 세기 시작합니다.
 */
export function useChatReadTimes(uid: string | undefined, roomIds: string[]) {
  const [entry, setEntry] = useState<{ uid: string; doc: ChatReadDoc | null } | null>(null);
  const roomKey = roomIds.join("|");

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "chatReads", uid),
      (snapshot) => setEntry({ uid, doc: (snapshot.data() as ChatReadDoc) ?? null }),
      () => setEntry({ uid, doc: null }),
    );
  }, [uid]);

  const stored = uid && entry?.uid === uid ? entry.doc : null;
  const loaded = uid ? entry?.uid === uid : false;

  const readMillis = useMemo(() => {
    const map: Record<string, number> = {};
    for (const roomId of roomKey ? roomKey.split("|") : []) {
      const at =
        stored?.rooms?.[roomId] ??
        // 방이 단체방 하나뿐이던 시절의 기록을 이어받습니다.
        (roomId === MAIN_CHAT_ROOM_ID ? (stored?.lastReadAt ?? null) : null);
      map[roomId] = at?.toMillis() ?? 0;
    }
    return map;
  }, [stored, roomKey]);

  /*
   * 기록이 없는 방은 지금 시각으로 기준을 잡아 둡니다.
   * serverTimestamp()가 서버에 닿기 전까지는 값이 null로 보이므로,
   * 그동안은 아래 useUnreadCounts가 그 방을 세지 않습니다.
   */
  useEffect(() => {
    if (!uid || !loaded) return;
    for (const roomId of roomKey ? roomKey.split("|") : []) {
      const known =
        stored?.rooms?.[roomId] ??
        (roomId === MAIN_CHAT_ROOM_ID ? (stored?.lastReadAt ?? null) : null);
      if (!known) void markChatRead(uid, roomId);
    }
  }, [uid, loaded, roomKey, stored]);

  return { readMillis, loaded };
}

/**
 * 방마다 아직 안 읽은 메시지 개수.
 *
 * 내가 보낸 메시지는 세지 않고, 방마다 UNREAD_BADGE_MAX개까지만 셉니다.
 * 마지막으로 본 시각 이후의 메시지만 받아오므로 다 읽은 방은 0건을 구독합니다.
 */
export function useUnreadCounts(
  uid: string | undefined,
  readMillis: Record<string, number>,
  loaded: boolean,
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  /*
   * 방 목록과 기준 시각을 한 줄로 묶어 둡니다.
   * 객체를 그대로 의존성에 넣으면 렌더마다 새 객체라 구독이 계속 끊겼다 붙습니다.
   */
  const signature = Object.entries(readMillis)
    .map(([roomId, millis]) => `${roomId}:${millis}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!uid || !loaded || !signature) return;

    const unsubscribes = signature.split("|").map((pair) => {
      const cut = pair.lastIndexOf(":");
      const roomId = pair.slice(0, cut);
      const since = Number(pair.slice(cut + 1));

      // 기준 시각이 아직 정해지지 않은 방(0)은 세지 않습니다.
      if (!since) {
        return () => {};
      }

      const unreadQuery = query(
        collection(db, "chatRooms", roomId, "messages"),
        where("createdAt", ">", Timestamp.fromMillis(since)),
        orderBy("createdAt", "desc"),
        limit(UNREAD_BADGE_MAX + 1),
      );

      return onSnapshot(
        unreadQuery,
        (snapshot) => {
          const fromOthers = snapshot.docs.filter(
            (document) => (document.data() as MessageDoc).senderId !== uid,
          );
          setCounts((previous) =>
            previous[roomId] === fromOthers.length
              ? previous
              : { ...previous, [roomId]: fromOthers.length },
          );
        },
        () => setCounts((previous) => ({ ...previous, [roomId]: 0 })),
      );
    });

    return () => unsubscribes.forEach((stop) => stop());
  }, [uid, loaded, signature]);

  return counts;
}

/**
 * 하단 탭 배지에 띄울, 모든 방을 통틀어 안 읽은 메시지 개수.
 * 배지 하나만 필요한 곳(탭바)에서 씁니다.
 */
export function useUnreadChatCount(uid?: string): number {
  const { data: rooms } = useMyChatRooms(uid);
  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);
  const { readMillis, loaded } = useChatReadTimes(uid, roomIds);
  const counts = useUnreadCounts(uid, readMillis, loaded);

  // 나갔거나 사라진 방의 옛 개수가 남아 더해지지 않도록 지금 목록만 훑습니다.
  return roomIds.reduce((total, roomId) => total + (counts[roomId] ?? 0), 0);
}
