"use client";

import { useEffect, useState } from "react";
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
import { MAIN_CHAT_ROOM_ID, UNREAD_BADGE_MAX } from "@/lib/constants";
import { todayString } from "@/lib/format";
import type {
  ChatReadDoc,
  EventDoc,
  MessageDoc,
  PhotoAlbumDoc,
  PhotoDoc,
  RosterDoc,
  RsvpDoc,
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
 * 단체 채팅방 메시지.
 * 최신 count개만 구독하고, 위로 스크롤하면 count를 늘려 이전 메시지를 더 불러옵니다.
 */
export function useMessages(count: number) {
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, "chatRooms", MAIN_CHAT_ROOM_ID, "messages"),
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
  }, [count]);

  return { messages, loading, error, hasMore };
}

/**
 * 내가 단체방을 마지막으로 본 시각. (chatReads/{uid})
 *
 * 한 번도 채팅을 연 적이 없는 원우는 기록이 없습니다. 그럴 때 예전 대화를
 * 전부 "안 읽음"으로 세면 가입하자마자 배지에 99+가 뜨므로,
 * 기록이 없으면 지금 시각으로 한 번 남겨 그때부터 세기 시작합니다.
 */
function useChatLastRead(uid?: string) {
  /*
   * 어느 계정의 기록인지 함께 들고 있습니다.
   * 계정을 바꿨을 때 이전 사람의 시각을 잠깐이라도 쓰지 않기 위해서입니다.
   * (구독을 갈아끼우는 동안 상태를 비우면 렌더가 한 번 더 돌아 낭비입니다.)
   */
  const [entry, setEntry] = useState<{ uid: string; lastReadAt: Timestamp | null } | null>(
    null,
  );

  useEffect(() => {
    if (!uid) return;

    return onSnapshot(
      doc(db, "chatReads", uid),
      (snapshot) => {
        const stored = (snapshot.data() as ChatReadDoc | undefined)?.lastReadAt ?? null;
        // 기록이 아직 없는 원우라면 지금 시각으로 기준을 잡아둡니다.
        if (!snapshot.exists()) void markChatRead(uid);
        setEntry({ uid, lastReadAt: stored });
      },
      () => setEntry({ uid, lastReadAt: null }),
    );
  }, [uid]);

  const matched = uid && entry?.uid === uid ? entry : null;
  /*
   * serverTimestamp()로 적은 값은 서버에 닿기 전까지 null로 보입니다.
   * 기준 시각이 확실해지기 전에는 세지 않습니다. 잘못 세면 예전 대화가
   * 통째로 안 읽음으로 잡혀 배지에 엉뚱한 숫자가 뜹니다.
   */
  return { lastReadAt: matched?.lastReadAt ?? null, loaded: matched?.lastReadAt != null };
}

/**
 * 하단 탭 배지에 띄울, 아직 안 읽은 단체방 메시지 개수.
 *
 * 내가 보낸 메시지는 세지 않고, UNREAD_BADGE_MAX개까지만 셉니다.
 * 마지막으로 본 시각 이후의 메시지만 받아오므로 평소에는 0건을 구독합니다.
 */
export function useUnreadChatCount(uid?: string): number {
  const { lastReadAt, loaded } = useChatLastRead(uid);
  // Timestamp 객체는 값이 같아도 매번 새로 만들어져 useEffect가 헛돕니다. 숫자로 비교합니다.
  const sinceMillis = lastReadAt?.toMillis() ?? 0;
  // 어느 기준 시각으로 센 개수인지 함께 들고 있어야, 채팅을 읽어 기준이
  // 옮겨간 순간에 예전 개수가 잠깐 남아 보이지 않습니다.
  const [entry, setEntry] = useState<{ sinceMillis: number; count: number } | null>(null);

  useEffect(() => {
    if (!uid || !loaded) return;

    const unreadQuery = query(
      collection(db, "chatRooms", MAIN_CHAT_ROOM_ID, "messages"),
      where("createdAt", ">", Timestamp.fromMillis(sinceMillis)),
      orderBy("createdAt", "desc"),
      limit(UNREAD_BADGE_MAX + 1),
    );

    return onSnapshot(
      unreadQuery,
      (snapshot) => {
        const fromOthers = snapshot.docs.filter(
          (document) => (document.data() as MessageDoc).senderId !== uid,
        );
        setEntry({ sinceMillis, count: fromOthers.length });
      },
      () => setEntry({ sinceMillis, count: 0 }),
    );
  }, [uid, loaded, sinceMillis]);

  return entry?.sinceMillis === sinceMillis ? entry.count : 0;
}
