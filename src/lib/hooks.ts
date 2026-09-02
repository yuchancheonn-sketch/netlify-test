"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MAIN_CHAT_ROOM_ID } from "@/lib/constants";
import { todayString } from "@/lib/format";
import type {
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
          .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name, "ko"));
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
