"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { markChatRead } from "@/lib/chat-read";
import { parseSessionDocId, sessionDocId } from "@/lib/cohort";
import { otherUidOf, toChatRoom } from "@/lib/chat-rooms";
import { todayString } from "@/lib/format";
import type {
  ChatReadDoc,
  ChatRoomDoc,
  EventDoc,
  FileDoc,
  MessageDoc,
  OpinionDoc,
  PhotoAlbumDoc,
  PhotoDoc,
  PollDoc,
  PollVoteDoc,
  RosterDoc,
  RsvpDoc,
  SessionCommentDoc,
  SessionDoc,
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
/**
 * 같은 날 일정끼리의 순서를 정하는 값 — 자정에서 몇 분 지났는지.
 *
 * 시각을 안 적은 일정은 -1이라 그날의 맨 위로 옵니다. 몇 시인지 모르는 일정을
 * 시각이 적힌 일정들 사이에 끼워 넣을 수는 없어서, 달력 앱들처럼 맨 위에 둡니다.
 *
 * ★ "9:00"과 "10:00"을 글자끼리 비교하면 9시가 10시보다 뒤로 갑니다.
 *   그래서 분으로 바꿔서 셈합니다.
 */
function startMinutes(event: EventDoc): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(event.startTime ?? "");
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function useEvents(): ListState<EventDoc> {
  const [state, setState] = useState<ListState<EventDoc>>(EMPTY);

  useEffect(() => {
    const eventsQuery = query(collection(db, "events"), orderBy("date"));
    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const events = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }) as EventDoc)
          /*
           * 빠른 일정이 위로. 날짜가 같으면 시작 시각이 이른 쪽이 먼저입니다.
           *
           * 날짜 정렬은 Firestore가 해주지만 같은 날끼리의 순서는 정해주지
           * 않습니다. 시각까지 Firestore에 맡기려면 색인을 따로 만들어 올려야
           * 하는데, 일정이 몇십 개뿐이라 여기서 한 번 더 세우는 편이 낫습니다.
           */
          .sort(
            (a, b) => a.date.localeCompare(b.date) || startMinutes(a) - startMinutes(b),
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
 * 주차별 수업 정보 (주제·강사) — 한 기수 몫.
 * 원우 누구나 채우는 공용 기록이라, 같은 기수는 모두가 같은 내용을 봅니다.
 *
 * 기수는 문서 id에 들어 있습니다(lib/cohort.ts의 sessionDocId). id로는 질의를
 * 걸 수 없어 컬렉션을 통째로 받아 거릅니다. 기수 × 열 주라 많아야 백 건이고,
 * 기수를 바꿔도 구독을 새로 걸지 않고 거르기만 다시 합니다.
 */
export function useSessions(cohort: string): ListState<SessionDoc> {
  const [state, setState] = useState<ListState<{ cohort: string; session: SessionDoc }>>(
    EMPTY,
  );

  useEffect(() => {
    return onSnapshot(
      collection(db, "sessions"),
      (snapshot) => {
        const sessions = snapshot.docs.flatMap((document) => {
          const place = parseSessionDocId(document.id);
          if (!place) return [];
          return [
            {
              cohort: place.cohort,
              session: { ...document.data(), week: place.week } as SessionDoc,
            },
          ];
        });
        setState({ data: sessions, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "수업 기록을 불러오지 못했어요." }),
    );
  }, []);

  return useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      data: state.data
        .filter((item) => item.cohort === cohort)
        .map((item) => item.session),
    }),
    [state, cohort],
  );
}

/** 한 주차의 수업 정보. 그 주 화면에서만 씁니다. */
export function useSession(cohort: string, week: number) {
  const sessionId = sessionDocId(cohort, week);
  const [state, setState] = useState<{
    data: SessionDoc | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    return onSnapshot(
      doc(db, "sessions", sessionId),
      (snapshot) =>
        setState({
          data: snapshot.exists()
            ? ({ ...snapshot.data(), week } as SessionDoc)
            : null,
          loading: false,
          error: null,
        }),
      () =>
        setState({ data: null, loading: false, error: "수업 기록을 불러오지 못했어요." }),
    );
  }, [sessionId, week]);

  return state;
}

/**
 * 그 주 수업에 달린 느낀점 댓글. 오래된 것이 위로 옵니다.
 *
 * 답글까지 한 번에 받아 화면에서 원 댓글 아래로 묶습니다. 답글만 따로
 * 질의하면 원 댓글 수만큼 구독이 생겨서, 댓글이 스무 개면 구독도 스무 개가
 * 됩니다. 한 주에 달릴 댓글은 많아야 수십 개라 통째로 받는 편이 훨씬 쌉니다.
 */
export function useSessionComments(
  cohort: string,
  week: number,
): ListState<SessionCommentDoc> {
  const sessionId = sessionDocId(cohort, week);
  const [state, setState] = useState<ListState<SessionCommentDoc>>(EMPTY);

  useEffect(() => {
    const commentsQuery = query(
      collection(db, "sessions", sessionId, "comments"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      commentsQuery,
      (snapshot) => {
        const comments = snapshot.docs
          .map(
            (document) => ({ ...document.data(), id: document.id }) as SessionCommentDoc,
          )
          /*
           * 방금 쓴 댓글을 맨 아래에 둡니다.
           *
           * 시각은 서버가 찍어주는 값이라, 막 보낸 댓글은 응답이 올 때까지
           * createdAt이 비어 있습니다. Firestore는 그 빈 값을 가장 이른 것으로
           * 보고 맨 위에 올려버려서, 내가 쓴 글이 목록 꼭대기에 나타났다가
           * 잠시 뒤 맨 아래로 뛰어내립니다. 빈 값을 "지금"으로 쳐서 그 튐을 막습니다.
           */
          .sort(
            (a, b) =>
              (a.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
              (b.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER),
          );
        setState({ data: comments, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "댓글을 불러오지 못했어요." }),
    );
  }, [sessionId]);

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
 * 투표 목록 (최근에 연 것이 위로).
 *
 * 열린 것만 걸러 받지 않고 전부 받아 화면에서 가릅니다.
 * `where("closed","==",false)`와 `orderBy("createdAt")`를 함께 걸면 복합 색인을
 * 따로 만들어 올려야 하는데, 투표는 많아야 몇십 개라 그럴 값어치가 없습니다.
 */
export function usePolls(): ListState<PollDoc> {
  const [state, setState] = useState<ListState<PollDoc>>(EMPTY);

  useEffect(() => {
    const pollsQuery = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    return onSnapshot(
      pollsQuery,
      (snapshot) => {
        const polls = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as PollDoc,
        );
        setState({ data: polls, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "투표를 불러오지 못했어요." }),
    );
  }, []);

  return state;
}

/**
 * 한 투표에 들어온 표 전부.
 *
 * 문서 하나가 표 하나라 원우 수만큼 읽습니다(쉰 명이면 쉰 건). 개수를 투표
 * 문서에 세어 두면 한 건으로 줄지만, 그 숫자는 브라우저가 올리는 값이라
 * 아무나 늘릴 수 있습니다. 규칙으로 "1만큼만 늘었는지"를 확인할 방법이 없어
 * 표를 그대로 세는 쪽을 골랐습니다. 내가 어디에 넣었는지도 이걸로 압니다.
 */
export function usePollVotes(pollId: string): ListState<PollVoteDoc> {
  const [state, setState] = useState<ListState<PollVoteDoc>>(EMPTY);

  useEffect(() => {
    /*
     * 여기서 "투표가 없으면" 같은 분기를 두지 마세요.
     * effect 안에서 곧바로 setState를 하면 이 저장소의 린트가 빌드를 막습니다
     * (react-hooks/set-state-in-effect). 이 훅은 늘 투표 하나에 붙으므로
     * pollId는 반드시 있고, 그래서 분기가 필요 없습니다.
     */
    return onSnapshot(
      collection(db, "polls", pollId, "votes"),
      (snapshot) => {
        const votes = snapshot.docs.map((document) => document.data() as PollVoteDoc);
        setState({ data: votes, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "표를 불러오지 못했어요." }),
    );
  }, [pollId]);

  return state;
}

/**
 * 익명으로 모인 의견 (먼저 쓴 것이 위로).
 *
 * 문서에 쓴 사람이 없으므로 "내 의견"을 골라낼 수 없습니다. 그것이 이
 * 기능의 값이라 일부러 그렇게 두었습니다(types.ts의 OpinionDoc 참고).
 */
export function usePollOpinions(pollId: string): ListState<OpinionDoc> {
  const [state, setState] = useState<ListState<OpinionDoc>>(EMPTY);

  useEffect(() => {
    const opinionsQuery = query(
      collection(db, "polls", pollId, "opinions"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      opinionsQuery,
      (snapshot) => {
        const opinions = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as OpinionDoc,
        );
        setState({ data: opinions, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "의견을 불러오지 못했어요." }),
    );
  }, [pollId]);

  return state;
}

/**
 * 자료 탭에 올라온 문서 파일 (최근에 올린 것이 위로).
 *
 * 정렬을 Firestore에 맡깁니다. 이 컬렉션은 한 갈래뿐이라 색인이 저절로 생기고,
 * 앨범 목록(useAlbums)이 eventDate로 정렬하는 것과 같은 경우입니다.
 */
export function useFiles(): ListState<FileDoc> {
  const [state, setState] = useState<ListState<FileDoc>>(EMPTY);

  useEffect(() => {
    const filesQuery = query(collection(db, "files"), orderBy("uploadedAt", "desc"));
    return onSnapshot(
      filesQuery,
      (snapshot) => {
        const files = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as FileDoc,
        );
        setState({ data: files, loading: false, error: null });
      },
      () => setState({ data: [], loading: false, error: "자료를 불러오지 못했어요." }),
    );
  }, []);

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
 * 내가 들어가 있는 1:1 대화방 목록.
 *
 * memberUids에 내 uid가 들어 있는 방만 가져옵니다. 정렬은 앱에서 합니다.
 * Firestore에서 정렬까지 시키려면 색인을 따로 만들어 올려야 하는데,
 * 방이 수십 개뿐이라 그럴 값어치가 없습니다.
 *
 * (단체방은 2026-09-10에 없앴습니다 — 카톡 단톡방으로 대신합니다.)
 */
export function useMyChatRooms(uid?: string): ListState<ChatRoomDoc> {
  const [directRooms, setDirectRooms] = useState<ChatRoomDoc[] | null>(null);
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

  const rooms = useMemo(() => {
    return (directRooms ?? [])
      /*
       * 1:1 방 모양의 id만 남깁니다.
       *
       * 예전 단체방 문서(chatRooms/main)가 Firestore에 남아 있으면, 그 문서의
       * memberUids에 원우 전원이 들어 있어서 위 질의에 함께 걸려 옵니다.
       */
      .filter((room) => !!uid && otherUidOf(room.id, uid) !== null)
      /*
       * 메시지를 한 통도 안 보낸 방은 목록에 올리지 않습니다.
       * 방은 첫 메시지를 보낼 때 만들어지므로 보통은 이런 방이 없지만,
       * 예전 코드가 남겨둔 빈 방 문서가 있을 수 있어 한 번 더 걸러냅니다.
       */
      .filter((room) => room.lastMessageAt !== null)
      // 최근에 말이 오간 방이 위로 옵니다.
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
  }, [uid, directRooms]);

  return { data: rooms, loading: !!uid && directRooms === null, error };
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
  /** 기준을 잡아달라고 이미 부탁한 방들. 아래 효과가 되풀이되는 것을 막습니다. */
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "chatReads", uid),
      (snapshot) =>
        setEntry({
          uid,
          /*
           * ★ serverTimestamps: "estimate"가 반드시 필요합니다.
           *
           * 읽음 시각은 serverTimestamp()로 적습니다. 기본값("none")으로 읽으면
           * 그 값이 서버에 닿기 전까지 null로 보입니다. 그러면 아래 readMillis가
           * 0이 되고, 0인 방은 안 읽은 개수를 세지 않고 건너뛰기 때문에
           * 직전에 세어둔 숫자가 그대로 배지에 남습니다.
           * 방을 다 읽었는데도 빨간 1이 안 사라지던 이유가 이것입니다.
           *
           * "estimate"로 읽으면 서버에 닿기 전에는 이 기기의 시각으로 대신
           * 채워줍니다. 몇 밀리초 어긋날 수 있지만, 그 오차로 개수가 틀릴 일은
           * 없습니다.
           */
          doc: (snapshot.data({ serverTimestamps: "estimate" }) as ChatReadDoc) ?? null,
        }),
      () => setEntry({ uid, doc: null }),
    );
  }, [uid]);

  const stored = uid && entry?.uid === uid ? entry.doc : null;
  const loaded = uid ? entry?.uid === uid : false;

  const readMillis = useMemo(() => {
    const map: Record<string, number> = {};
    for (const roomId of roomKey ? roomKey.split("|") : []) {
      const at = stored?.rooms?.[roomId] ?? null;
      map[roomId] = at?.toMillis() ?? 0;
    }
    return map;
  }, [stored, roomKey]);

  /*
   * 기록이 없는 방은 지금 시각으로 기준을 잡아 둡니다.
   * serverTimestamp()가 서버에 닿기 전까지는 값이 null로 보이므로,
   * 그동안은 아래 useUnreadRooms가 그 방의 점을 켜지 않습니다.
   *
   * ★ requested가 없으면 안 됩니다 — 여기서 무한 되먹임이 생깁니다.
   *   쓰기를 보내면 서버에 닿기 전에도 그 값이 담긴 스냅샷이 곧바로 돌아오는데,
   *   그 값이 위에서 말한 null입니다. 이 효과는 스냅샷마다 다시 도니까
   *   null을 "기록 없음"으로 읽고 또 씁니다. 그 쓰기가 또 스냅샷을 부르고…
   *   한도를 넘겨 쓰기가 거절되면 Firestore가 로컬 반영까지 되돌리므로
   *   기록 없는 상태로 돌아가, 고리는 아예 멈추지 않습니다.
   *   (2026-09-05에 이 고리로 Firestore 무료 한도를 태웠습니다.)
   *
   *   그래서 부탁한 방을 기억해 두고 화면당 한 번만 씁니다. 정말 실패했다면
   *   다음에 앱을 새로 열 때 다시 시도됩니다.
   */
  useEffect(() => {
    if (!uid || !loaded) return;
    for (const roomId of roomKey ? roomKey.split("|") : []) {
      const known = stored?.rooms?.[roomId] ?? null;
      if (known) continue;

      const key = `${uid}:${roomId}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      void markChatRead(uid, roomId);
    }
  }, [uid, loaded, roomKey, stored]);

  return { readMillis, loaded };
}

/**
 * 방마다 새 메시지가 왔는지 (안 읽음 여부).
 *
 * ★ 개수를 세지 않습니다. 인스타그램처럼 빨간 점 하나만 띄웁니다.
 *
 * 개수를 세려면 방마다 "마지막으로 본 시각 이후의 메시지" 질의를 하나씩
 * 걸어야 했습니다. 그런데 Firestore는 **결과가 0건인 질의에도 읽기 1건을
 * 물립니다.** 다 읽어서 셀 것이 없는 방도 값을 내는 셈이라, 앱을 열 때마다
 * 방 개수만큼 읽기가 나갔습니다. 보안 규칙의 isMember()가 구독마다 내
 * 문서를 한 번 더 읽으므로 실제로는 방 하나당 두 건이었습니다.
 * 방이 서른 개면 화면을 열 때마다 아흔 건입니다 — 기수를 늘리면 이 값에
 * 사람 수가 곱해집니다.
 *
 * 여기서는 질의를 아예 걸지 않습니다. 방 문서에 이미 마지막 메시지의
 * 시각과 보낸 사람이 적혀 있고(lastMessageAt·lastMessageSenderId), 방 목록과
 * 읽음 기록은 어차피 구독 중입니다. 그 둘을 견주기만 하므로 **추가 읽기가
 * 0건**입니다. 잃는 것은 숫자뿐입니다.
 */
export function useUnreadRooms(
  uid: string | undefined,
  rooms: ChatRoomDoc[],
  readMillis: Record<string, number>,
  loaded: boolean,
): Record<string, boolean> {
  return useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!uid || !loaded) return map;

    for (const room of rooms) {
      const lastAt = room.lastMessageAt?.toMillis() ?? 0;
      const since = readMillis[room.id] ?? 0;

      /*
       * 점을 켜는 조건은 넷입니다.
       *  · 한 마디라도 오간 방이어야 합니다 (lastAt).
       *  · 기준 시각이 잡혀 있어야 합니다 (since). 아직 안 잡힌 방은
       *    useChatReadTimes가 지금 시각으로 남기는 중이므로, 그때까지는
       *    읽은 것으로 봅니다. 안 그러면 처음 들어온 사람에게 모든 방이
       *    빨갛게 켜집니다.
       *  · 마지막 메시지가 그 기준보다 뒤에 왔어야 합니다.
       *  · 그 메시지를 내가 보낸 것이 아니어야 합니다. 내가 마지막으로
       *    말한 방에 점이 켜지면 안 됩니다.
       */
      map[room.id] =
        lastAt > 0 && since > 0 && lastAt > since && room.lastMessageSenderId !== uid;
    }
    return map;
  }, [uid, rooms, readMillis, loaded]);
}

/**
 * 하단 탭에 빨간 점을 띄울지 — 어느 방이든 새 메시지가 있으면 참.
 * 점 하나만 필요한 곳(탭바)에서 씁니다.
 */
export function useHasUnreadChat(uid?: string): boolean {
  const { data: rooms } = useMyChatRooms(uid);
  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);
  const { readMillis, loaded } = useChatReadTimes(uid, roomIds);
  const unread = useUnreadRooms(uid, rooms, readMillis, loaded);

  return rooms.some((room) => unread[room.id]);
}
