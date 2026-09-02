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
import type { EventDoc, MessageDoc, RsvpDoc, UserDoc } from "@/lib/types";

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
