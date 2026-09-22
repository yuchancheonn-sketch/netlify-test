"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from "@/components/icons";
import {
  EmptyState,
  ErrorState,
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  Spinner,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { useViewCohort } from "@/lib/use-view-cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { isCloudinaryConfigured, uploadImage, viewerUrl } from "@/lib/cloudinary";
import { resizeImage } from "@/lib/image";
import { PHOTO_MAX_DIMENSION } from "@/lib/constants";
import { dotDate, todayString } from "@/lib/format";
import { useAlbums, useCohortMembers } from "@/lib/hooks";
import type { PhotoAlbumDoc, UserDoc } from "@/lib/types";
import Avatar from "@/components/Avatar";

/** 소식 본문 최대 글자 수 (2026-09-22). 카드에는 넉 줄까지만 보입니다. */
const ALBUM_BODY_MAX_LENGTH = 1000;

/**
 * 원우 소식 — 소식 탭의 첫 칸 (예전 이름 "행사 사진").
 *
 * ★ 2026-09-22 사용자 요청: 앨범 격자 대신 **게시물 카드 한 장씩**, 카드가 화면을 꽉 채우고,
 *   왼쪽·오른쪽으로 밀어 **책장 넘기듯** 넘겨 봅니다. 아래 AlbumBook.
 *   (앨범 = 게시물 한 개입니다. 데이터는 그대로 photoAlbums. 같은 날 사용자 요청으로 앨범 화면(/albums/…)으로
 *    가는 길을 모두 없앴습니다 — 사진은 "소식 올리기" 창에서 고르고, 고치기·지우기는 카드의 ⋯ 에서 합니다.
 *    앨범 화면 파일은 옛 주소로 들어오는 경우를 위해 남아 있습니다.)
 *
 * (같은 날 자료 탭에서 소식 탭으로 옮기며 이 파일로 떼어 냈습니다. 자리를 맞바꾼 복습 영상은 components/VideoList.tsx.)
 */
export default function AlbumList() {
  const { data: allAlbums, loading, error } = useAlbums();
  /** 보고 있는 기수의 앨범만. 만들 때도 이 기수로 적습니다. */
  const { cohort } = useViewCohort();
  const albums = allAlbums.filter((album) => inCohort(album, cohort));
  const [creating, setCreating] = useState(false);
  /*
   * 카드에 올린 원우의 사진·이름을 적으려고 그 기수 원우 명단을 받습니다(2026-09-22 사용자 요청).
   * 원우수첩과 같은 훅이라 한 번 받아 둔 것을 함께 씁니다. 명단에 없으면(탈퇴 등) 앨범에 적힌 이름을 씁니다.
   */
  const members = useCohortMembers(cohort);
  const authors = new Map(members.data.map((member) => [member.uid, member]));

  if (loading) {
    return (
      <BookFrame>
        <Skeleton className="h-full w-full rounded-[24px]" />
      </BookFrame>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {albums.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📸</span>}
            title="아직 올라온 소식이 없어요"
            description="아래 '소식 올리기'로 첫 소식을 올려 보세요."
          />
        </div>
      ) : (
        <AlbumBook albums={albums} authors={authors} />
      )}

      {/*
        사진 올리기 — 자료 탭 "파일 올리기"와 같은 자리·같은 모양의 떠 있는 주황 알약입니다 (2026-09-14).
        bottom의 92px는 하단 탭 알약 위로 올리는 높이입니다. 카드는 이 알약 위에서 끝나서(BookFrame)
        맨 아래의 제목·본문을 가리지 않습니다.

        원우 누구나 봅니다 (2026-09-14, 예전엔 운영진만). 보안 규칙도 원래
        photoAlbums 쓰기를 원우 누구에게나 열어 두었습니다. 새 앨범은 보고 있는
        기수로 적히고, 원우는 자기 기수로 고정이라 늘 자기 기수에 만들어집니다.
      */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95"
      >
        <PlusIcon className="h-5 w-5" />
        {/* 단추 글씨 "앨범 만들기" → "사진 올리기" → "소식 올리기" (2026-09-22 사용자 요청). 누르면 아래 소식 올리기 창. */}
        소식 올리기
      </button>

      {creating ? <AlbumSheet onClose={() => setCreating(false)} /> : null}
    </>
  );
}

/* ───────────────────────── 카드 책 ───────────────────────── */

/** 화면 높이(CSS px)가 바뀌면 알려 줍니다 — 자판·주소창·돌리기. */
function subscribeHeight(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/**
 * 화면 높이를 CSS px로. 보기 설정의 글씨 크기가 html zoom(0.9·1.15)이라 우리가 적는 px도 그만큼 늘거나 줄어,
 * zoom으로 나눠 맞춥니다. (dvh는 zoom까지 곱해져 "크게"에서 카드가 화면보다 길어집니다 — StageGate 주석.)
 */
function heightSnapshot(): number {
  const zoom = Number(getComputedStyle(document.documentElement).zoom) || 1;
  return Math.round(window.innerHeight / zoom);
}

/**
 * 카드 한 장이 들어갈 수 있는 틀 — 제목 줄 아래부터 "소식 올리기" 알약 바로 위까지.
 *
 * 높이 = 화면 높이 − 틀의 위 끝 − 156px − 아래 안전 영역.
 *   156px = "소식 올리기" 알약 윗변(바닥에서 92 + 높이 52 = 144px) + 사이 12px.
 *   카드의 제목·본문이 맨 아래라(2026-09-22) 알약이 그 글을 가리지 않게 알약 위에서 끝냅니다.
 *   (그 전엔 탭 알약 위까지 90px = MainShell이 비워 둔 78px + 12px이었습니다.)
 * 틀의 위 끝(제목 줄 높이 + 본문 pt-4)은 화면마다·폰마다 달라서 그려진 뒤에 한 번 잽니다(ref 콜백).
 * 재기 전 첫 그림에서는 넉넉히 70dvh로 둡니다.
 */
function BookFrame({ children }: { children: React.ReactNode }) {
  const viewport = useSyncExternalStore(subscribeHeight, heightSnapshot, () => 0);
  const [top, setTop] = useState<number | null>(null);

  const height =
    viewport && top !== null
      ? `calc(${Math.max(320, viewport - top)}px - 156px - env(safe-area-inset-bottom))`
      : "70dvh";

  return (
    <div
      ref={(element) => {
        if (!element || top !== null) return;
        const zoom = Number(getComputedStyle(document.documentElement).zoom) || 1;
        // 문서 맨 위에서의 거리 — 스크롤한 채로 들어와도 같은 값이 나오게 scrollY를 더합니다.
        setTop(Math.round((element.getBoundingClientRect().top + window.scrollY) / zoom));
      }}
      className="relative"
      // --frame-h — 카드가 사진 높이를 정할 때 "이보다 길면 안 됨"의 기준으로 씁니다(AlbumCard).
      style={{ height, "--frame-h": height } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** 이만큼(카드 폭의 비율) 넘기거나 빠르게 튕기면 한 장이 넘어갑니다. */
const TURN_THRESHOLD = 0.28;
/** 손을 뗀 뒤 남은 만큼 넘어가거나 되돌아오는 시간(ms) */
const TURN_MS = 380;

/**
 * 넘기는 중인 책장.
 *   mode "next" — 지금 카드가 왼쪽 등(책등)을 축으로 넘어가며 밑의 다음 카드가 드러납니다(왼쪽으로 밀기).
 *   mode "prev" — 앞서 넘긴 카드가 왼쪽에서 되돌아와 지금 카드를 덮습니다(오른쪽으로 밀기).
 *   progress 0~1 — 넘어간 정도. settling이면 손을 뗀 뒤 저절로 끝까지 가는 중(transition이 붙음).
 */
type Turn = { mode: "next" | "prev"; progress: number; settling: boolean };

/**
 * 카드를 책처럼 넘겨 보는 자리 (2026-09-22 사용자 요청).
 *
 * - 한 번에 카드 한 장. 카드는 틀(BookFrame) 위에 붙고, 높이는 사진 비율을 따릅니다(틀보다 길지는 않음, 2026-09-22).
 * - 왼쪽으로 밀면 다음(더 예전) 카드, 오른쪽으로 밀면 앞 카드. 목록 순서는 useAlbums 그대로(최근 행사가 먼저).
 * - 넘길 때 카드가 왼쪽 끝(책등)을 축으로 3D로 돌아 넘어가고(rotateY 0 → -90°), 넘어가는 장은 점점 어두워지고
 *   밑의 장은 그늘이 걷힙니다. 90°를 넘으면 뒷면이라 안 보입니다(backface-hidden) — 책장이 넘어간 모습입니다.
 * - 뒤에 남은 장이 있으면 오른쪽·아래로 살짝 비켜 선 종이 두 장을 깔아 "쌓인 카드"로 보이게 합니다.
 * - 처음·마지막 장에서 더 밀면 조금만 따라오다 되돌아옵니다.
 * - 카드를 톡 눌러도 아무 창도 뜨지 않습니다(2026-09-22 사용자 요청 — 예전엔 앨범 화면 /albums/… 이 열렸습니다).
 *
 * touch-action: pan-y — 세로 손짓은 브라우저에 맡기고 가로 손짓만 우리가 받습니다.
 */
function AlbumBook({
  albums,
  authors,
}: {
  albums: PhotoAlbumDoc[];
  /** uid → 원우 문서. 카드의 "올린 사람" 줄에 씁니다. */
  authors: Map<string, UserDoc>;
}) {
  const { user, isAdmin } = useAuth();
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  /** ⋯ 를 눌러 고르기 시트를 연 소식 / 고치기 창을 연 소식 */
  const [managing, setManaging] = useState<PhotoAlbumDoc | null>(null);
  const [editing, setEditing] = useState<PhotoAlbumDoc | null>(null);
  /** 올린 원우와 운영진만 ⋯ (고치기·지우기)가 보입니다. */
  const canManage = (album: PhotoAlbumDoc) => album.createdBy === user?.uid || isAdmin;
  const drag = useRef<{ x: number; y: number; time: number; width: number; moved: boolean } | null>(
    null,
  );

  // 기수를 바꾸거나 앨범이 지워져 목록이 짧아지면 마지막 장에 섭니다.
  const current = Math.min(index, albums.length - 1);
  const hasPrev = current > 0;
  const hasNext = current < albums.length - 1;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (turn?.settling) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      width: event.currentTarget.getBoundingClientRect().width,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (!start.moved) {
      // 6px 넘게 움직여야 넘기기로 봅니다. 세로로 더 움직였으면 넘기기가 아닙니다.
      if (Math.abs(dx) < 6) return;
      if (Math.abs(event.clientY - start.y) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      start.moved = true;
    }
    const mode = dx < 0 ? "next" : "prev";
    let progress = Math.min(1, Math.abs(dx) / start.width);
    // 더 넘길 장이 없으면 고무줄처럼 조금만 따라옵니다.
    if ((mode === "next" && !hasNext) || (mode === "prev" && !hasPrev)) progress *= 0.15;
    setTurn({ mode, progress, settling: false });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start) return;

    // 밀지 않고 톡 누른 것은 아무 일도 없습니다 — 누르면 앨범 화면이 열리던 것을 2026-09-22 사용자 요청으로 없앴습니다.
    if (!start.moved) return;
    if (!turn) return;

    const dx = event.clientX - start.x;
    const fast = Math.abs(dx) / Math.max(1, event.timeStamp - start.time) > 0.5; // 0.5px/ms 넘게 튕기면
    const possible = turn.mode === "next" ? hasNext : hasPrev;
    const commit = possible && (turn.progress > TURN_THRESHOLD || fast);

    setTurn({ mode: turn.mode, progress: commit ? 1 : 0, settling: true });
    window.setTimeout(() => {
      if (commit) setIndex(current + (turn.mode === "next" ? 1 : -1));
      setTurn(null);
    }, TURN_MS);
  }

  /**
   * 양옆 화살표(‹ ›)를 눌렀을 때 — 손으로 민 것처럼 한 장 넘깁니다(2026-09-22 사용자 요청).
   * 넘어간 정도 0에서 한 번 그린 뒤 다음 그림에서 1로 바꿔야 transition이 걸려 넘어가는 모습이 보입니다
   * (requestAnimationFrame 두 번 — 첫 번째는 0을 그리게, 두 번째에 1로).
   */
  function turnBy(mode: Turn["mode"]) {
    if (turn || (mode === "next" ? !hasNext : !hasPrev)) return;
    setTurn({ mode, progress: 0, settling: false });
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setTurn({ mode, progress: 1, settling: true })),
    );
    window.setTimeout(() => {
      setIndex(current + (mode === "next" ? 1 : -1));
      setTurn(null);
    }, TURN_MS + 40);
  }

  /*
   * 무엇을 어느 층에 그릴지.
   *   밑장(under): 넘어가는 장 아래에서 드러나는 카드.
   *   넘기는 장(page): 돌아가는 카드. 각도 = -90° × 넘어간 정도(next) / -90° × (1 − 넘어간 정도)(prev).
   */
  let under: PhotoAlbumDoc | null = albums[current];
  let page: PhotoAlbumDoc | null = null;
  let angle = 0;
  let turned = 0; // 0이면 덮여 있음, 1이면 다 넘어감 — 그늘 세기에 씁니다.
  if (turn) {
    if (turn.mode === "next") {
      page = albums[current];
      under = hasNext ? albums[current + 1] : null;
      turned = turn.progress;
    } else {
      page = hasPrev ? albums[current - 1] : albums[current];
      under = hasPrev ? albums[current] : null;
      turned = hasPrev ? 1 - turn.progress : turn.progress * -1;
    }
    angle = -90 * Math.max(-1, Math.min(1, turned));
  }
  const transition = turn?.settling ? `transform ${TURN_MS}ms ease-out, opacity ${TURN_MS}ms ease-out` : "none";
  /**
   * 밑장 뒤에 남은 장 수 — 쌓인 종이를 몇 장 깔지(많아도 두 장).
   * ★ 카드마다 높이가 달라서(사진 비율대로, 2026-09-22) 종이는 틀이 아니라 밑장 카드에 붙여 그 높이를 따릅니다.
   */
  const behind = under ? albums.length - 1 - albums.indexOf(under) : 0;

  return (
    <BookFrame>
      <div
        className="absolute inset-0 select-none"
        style={{ perspective: "1800px", touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setTurn(null);
        }}
        role="group"
        aria-roledescription="넘겨 보는 카드"
        aria-label={`${current + 1} / ${albums.length} ${albums[current].title}`}
      >
        {/*
          ★ 카드는 틀의 세로 한가운데에 섭니다(2026-09-22 사용자 요청 "화면 한 가운데") — 바깥 칸이 틀을 채우고
            flex로 가운데를 맞추며, 안쪽 relative 칸이 카드 크기라 종이·그늘이 카드에 딱 맞습니다.
            좌우는 inset-x-7(28px)만큼 들여 양옆 화살표 자리를 남깁니다.
        */}
        {under ? (
          <div className="pointer-events-none absolute inset-x-7 inset-y-0 flex items-center">
          <div className="pointer-events-auto relative w-full">
            {/* 쌓인 종이 — 뒤에 남은 장이 있을 때만. 밑장 카드 뒤에서 오른쪽·아래로 4px씩 비켜 섭니다. */}
            {behind >= 2 ? (
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-[8px] translate-y-[8px] rounded-[24px] bg-surface shadow-[var(--shadow-card)]"
              />
            ) : null}
            {behind >= 1 ? (
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-[4px] translate-y-[4px] rounded-[24px] bg-surface shadow-[var(--shadow-card)]"
              />
            ) : null}
            <AlbumCard
              album={under}
              author={authors.get(under.createdBy)}
              position={albums.indexOf(under) + 1}
              total={albums.length}
              // 넘기는 중이 아닐 때 보이는 장(= 밑장)에만 ⋯ 를 답니다.
              onMore={!page && canManage(under) ? () => setManaging(under) : undefined}
            />
            {/* 밑장의 그늘 — 위 장이 덮고 있을수록 짙고, 넘어갈수록 걷힙니다. */}
            {page ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[24px] bg-black"
                style={{ opacity: 0.25 * (1 - Math.abs(turned)), transition }}
              />
            ) : null}
          </div>
          </div>
        ) : null}

        {page ? (
          <div className="pointer-events-none absolute inset-x-7 inset-y-0 flex items-center">
            <div
              className="relative w-full origin-left [backface-visibility:hidden]"
              style={{ transform: `rotateY(${angle}deg)`, transition }}
            >
              <AlbumCard album={page} author={authors.get(page.createdBy)} position={albums.indexOf(page) + 1} total={albums.length} />
              {/* 넘어가는 장은 돌아갈수록 어두워집니다 — 빛을 등지는 책장처럼. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[24px] bg-black"
                style={{ opacity: 0.35 * Math.abs(turned), transition }}
              />
            </div>
          </div>
        ) : null}

        {/*
          양옆 화살표 ‹ › — "옆으로 넘기는 카드"라는 표시 겸 누르면 한 장 넘기는 단추 (2026-09-22 사용자 요청 "<> 이런 모양").
          카드 바깥 28px 자리(inset-x-7)의 세로 가운데. 더 넘길 장이 없는 쪽은 흐리게 두고 눌리지 않습니다.
          onPointerDown을 멈추는 이유는 카드의 ⋯ 단추와 같습니다(틀이 포인터를 붙잡으면 click이 안 일어남).
        */}
        {(["prev", "next"] as const).map((mode) => {
          const enabled = mode === "next" ? hasNext : hasPrev;
          const Icon = mode === "next" ? ChevronRightIcon : ChevronLeftIcon;
          return (
            <button
              key={mode}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => turnBy(mode)}
              disabled={!enabled}
              aria-label={mode === "next" ? "다음 소식" : "앞 소식"}
              className={`absolute top-1/2 flex h-12 w-7 -translate-y-1/2 items-center justify-center text-ink-muted transition disabled:opacity-25 ${
                mode === "next" ? "right-0" : "left-0"
              }`}
            >
              <Icon className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {managing ? (
        <AlbumManageSheet
          album={managing}
          onClose={() => setManaging(null)}
          onEdit={() => {
            setEditing(managing);
            setManaging(null);
          }}
        />
      ) : null}
      {editing ? <AlbumSheet album={editing} onClose={() => setEditing(null)} /> : null}
    </BookFrame>
  );
}

/**
 * 게시물 카드 한 장.
 *
 * ★ 글과 사진을 겹치지 않고 위아래로 나눕니다 (2026-09-22 사용자 요청 — "제목이랑 본문이 더 잘 보이게").
 *   처음엔 사진이 카드를 다 덮고 그 위 어두운 막에 흰 글씨를 얹었는데, 사진에 따라 글씨가 묻혔습니다.
 *   이제 흰 칸에 먹색으로 씁니다. 순서는 위에서부터 올린 사람(사진·이름·날짜) → 사진 → 제목(20px 굵게)·본문(15px).
 *   제목·본문은 처음엔 사진 위였는데 같은 날 사용자 요청으로 사진 아래로 옮겼습니다.
 *   "소식 올리기" 알약이 아래 글을 가리지 않도록 틀(BookFrame)이 알약 위에서 끝납니다.
 * ★ 본문은 넉 줄까지만 보이고 넘치면 "…"(line-clamp-4) — 다 쓰면 사진 자리가 없어집니다.
 *   (카드를 눌러 앨범 화면에서 전문을 보던 길은 2026-09-22 사용자 요청으로 없앴습니다.)
 * 사진 위 오른쪽 위 "3 / 10"은 몇 번째 장인지.
 */
function AlbumCard({
  album,
  author,
  position,
  total,
  onMore,
}: {
  album: PhotoAlbumDoc;
  /** 올린 원우(명단에서 찾은 것). 없으면 앨범에 적힌 이름만 씁니다. */
  author: UserDoc | undefined;
  position: number;
  total: number;
  /** ⋯ 를 눌렀을 때. 없으면(고칠 권한이 없거나 넘기는 중인 장) ⋯ 를 그리지 않습니다. */
  onMore?: () => void;
}) {
  const date = album.eventDate ? dotDate(new Date(`${album.eventDate}T00:00:00`)) : "";
  const body = album.body?.trim();
  const authorName = author?.name || album.createdByName || "원우";
  /*
   * 사진이 차지해도 되는 최대 높이 = 틀 높이 − 글 칸 높이(어림).
   * 글 칸: 위 올린 사람 칸(16 + 36 + 14 = 66) + 아래 제목 칸(14 + 제목 한 줄 약 28 + 20 = 62) ≈ 128 → 130,
   * 긴 제목(두 줄)이면 +28, 본문이 있으면 넉 줄 + 사이 8 ≈ +110.
   * ★ 제목이 맨 아래라, 어림이 모자라 잘리면 제목이 먼저 잘립니다 — 어림은 넉넉한 쪽으로 두세요. 어림이 모자라도 카드가 틀을 넘지는 않습니다(maxHeight: var(--frame-h) — 넘치는 아래 끝이 잘립니다).
   */
  const textReserve = 130 + (album.title.length > 16 ? 28 : 0) + (body ? 110 : 0);

  return (
    <article
      className="relative flex w-full flex-col overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-card)]"
      style={{ maxHeight: "var(--frame-h)" }}
    >
      <div className="shrink-0 px-5 pt-4 pb-3.5">
        {/*
          올린 원우 — 게시물 머리처럼 사진 + 이름, 그 아래 날짜·사진 수 (2026-09-22 사용자 요청 "업로드한 원우가 누군지").
          이름은 원우수첩의 지금 이름을 먼저 씁니다(이름을 고치면 따라옵니다). 명단에 없으면 올릴 때 적어 둔 이름.
          제목·본문은 같은 날 사용자 요청으로 사진 아래로 옮겼습니다(인스타그램 게시물처럼 머리 → 사진 → 글).
        */}
        <div className="flex items-center gap-2.5">
          <Avatar
            src={author?.photoURL ?? null}
            name={authorName}
            seed={album.createdBy}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink">{authorName}</p>
            {/* 날짜만 — "사진 N장"은 카드에 사진이 한 장뿐이라(2026-09-22) 뺐습니다. */}
            {date ? <p className="text-[12px] text-ink-faint">{date}</p> : null}
          </div>
          {/*
            ⋯ — 고치기·지우기 (2026-09-22 사용자 요청). 올린 원우와 운영진에게만 보입니다.
            ★ onPointerDown에서 멈추는 이유: 카드 틀이 넘기기 손짓을 받으려고 누르는 순간 포인터를 붙잡습니다
              (setPointerCapture). 그러면 손을 뗀 곳이 틀로 바뀌어 이 단추의 click이 안 일어납니다.
          */}
          {onMore ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onMore}
              aria-label={`${album.title} 고치기·지우기`}
              className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px]! leading-none font-bold text-ink-muted transition active:bg-fill"
            >
              ⋯
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative shrink-0">
        {/*
          ★ 사진은 자르지 않고 원본 비율 그대로, 카드 높이가 사진에 맞춰 줄어듭니다 (2026-09-22 사용자 요청).
            처음엔 카드가 틀을 꽉 채우고 사진을 잘라(c_fill + object-cover) 넣었고, 다음엔 자르지 않되 남는 자리를
            같은 사진을 흐리게 깔아 채웠는데 사용자가 "의미없는 여백 넣지 말고 카드 위아래를 줄여줘"라고 했습니다.
            이제 사진은 폭에 맞추고 높이는 비율대로(h-auto) — 카드는 그만큼만 깁니다. 틀 아래 남는 자리는 그냥 바탕입니다.
            viewerUrl은 c_limit(비율 그대로 줄이기만)입니다.
          ★ 세로로 아주 긴 사진만은 카드가 틀(화면)을 넘지 않게 maxHeight로 막습니다. 그때는 사진이 가운데로 줄고
            양옆이 카드 바탕(흰색)으로 남습니다(object-contain) — 사진을 자르지 않으려면 어쩔 수 없는 자리입니다.
        */}
        {album.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewerUrl(album.coverImageUrl, 1200)}
            alt={`${album.title} 대표 사진`}
            draggable={false}
            className="block h-auto w-full object-contain"
            style={{ maxHeight: `calc(var(--frame-h) - ${textReserve}px)` }}
          />
        ) : (
          <span
            className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(to_bottom,#e7e5e4,#a8a29e)] text-[48px]"
            aria-hidden="true"
          >
            📷
          </span>
        )}
        <span className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-bold text-white tabular-nums">
          {position} / {total}
        </span>
      </div>

      {/* 제목·본문 — 사진 아래 (2026-09-22 사용자 요청, 그 전엔 올린 사람 줄 바로 아래·사진 위). */}
      <div className="shrink-0 px-5 pt-3.5 pb-5">
        <h2 className="text-[20px] leading-snug font-bold break-keep text-ink [overflow-wrap:anywhere]">
          {album.title}
        </h2>
        {body ? (
          <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line break-keep text-ink-soft">
            {body}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** 고른 사진 한 장 — 미리보기 주소는 고를 때 한 번 만들고, 창을 닫을 때 돌려줍니다. */
type PickedPhoto = { file: File; preview: string };

/**
 * 소식 올리기 / 고치기 바텀시트 (2026-09-22).
 *
 * - 새로 올릴 때(album 없음): 사진 · 제목 · 날짜 · 본문(선택). "올리기"를 누르면 사진을 Cloudinary에 올린 뒤
 *   소식(photoAlbums 문서)과 사진 목록(photos 하위 문서)을 한 번에 적습니다. 첫 사진이 카드의 대표 사진입니다.
 * - 고칠 때(album 있음): 제목 · 날짜 · 본문만. 사진은 바꾸지 않습니다.
 *
 * ★ 사진 고르기를 이 창으로 옮겼습니다 (2026-09-22 사용자 요청).
 *   예전엔 올린 뒤 앨범 화면(/albums/…)이 열려 거기서 사진을 붙였는데, 카드를 눌러 여는 앨범 화면을
 *   사용자 요청으로 없애면서 사진도 여기서 고릅니다. 사진은 긴 변 PHOTO_MAX_DIMENSION으로 줄여 올립니다
 *   (앨범 화면의 "원본 그대로" 토글은 옮기지 않았습니다).
 */
function AlbumSheet({ album, onClose }: { album?: PhotoAlbumDoc; onClose: () => void }) {
  const { user, profile } = useAuth();
  /** 새 소식이 올라갈 기수 — 운영진이 제목 옆에서 고른 기수입니다. */
  const { cohort } = useViewCohort();
  const editing = Boolean(album);
  const [title, setTitle] = useState(album?.title ?? "");
  const [eventDate, setEventDate] = useState(album?.eventDate || todayString());
  const [body, setBody] = useState(album?.body ?? "");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** 사진 올리는 중이면 몇 장째인지 */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // 창이 닫힐 때 미리보기 주소를 돌려줍니다(브라우저 메모리). 상태는 건드리지 않습니다.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    const held = previews.current;
    return () => held.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /** 사진은 한 장만 — 다시 고르면 바꿔 끼웁니다 (2026-09-22 사용자 요청 "대표사진 한 장만"). */
  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 같은 사진을 다시 골라도 change가 일어나게 비웁니다.
    event.target.value = "";
    if (!file) return;
    const preview = URL.createObjectURL(file);
    previews.current.push(preview);
    setPhotos([{ file, preview }]);
    setError(null);
  }

  function removePhoto(preview: string) {
    setPhotos((previous) => previous.filter((photo) => photo.preview !== preview));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    if (!editing && photos.length === 0) {
      setError("사진을 골라 주세요.");
      return;
    }
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (body.length > ALBUM_BODY_MAX_LENGTH) {
      setError(`본문은 ${ALBUM_BODY_MAX_LENGTH}자까지 쓸 수 있어요.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (album) {
        // 응답을 잠깐만 기다리고 창을 닫습니다 — 이유는 lib/firestore-commit.ts에.
        await commitWrite(
          updateDoc(doc(db, "photoAlbums", album.id), {
            title: title.trim(),
            eventDate,
            body: body.trim(),
          }),
        );
        onClose();
        return;
      }

      // 1) 사진을 한 장씩 줄여서 Cloudinary에 올립니다. 한 장이라도 실패하면 소식은 적지 않고 멈춥니다.
      const uploaded = [];
      for (const [position, photo] of photos.entries()) {
        setProgress({ done: position, total: photos.length });
        const payload = await resizeImage(photo.file, PHOTO_MAX_DIMENSION);
        uploaded.push(await uploadImage(payload, photo.file.name));
      }
      setProgress({ done: photos.length, total: photos.length });

      // 2) 소식 문서와 사진 목록을 한 번에 적습니다.
      const created = doc(collection(db, "photoAlbums"));
      await commitWrite([
        setDoc(created, {
          title: title.trim(),
          eventDate,
          body: body.trim(),
          coverImageUrl: uploaded[0].url,
          photoCount: uploaded.length,
          cohort,
          createdBy: user.uid,
          // 카드에 "누가 올렸는지"를 적으려고 이름도 함께 남깁니다(2026-09-22). 카드는 원우수첩의 지금 이름을 먼저 씁니다.
          createdByName: profile?.name || "원우",
          createdAt: serverTimestamp(),
        }),
        ...uploaded.map((image) =>
          addDoc(collection(db, "photoAlbums", created.id, "photos"), {
            imageUrl: image.url,
            publicId: image.publicId,
            width: image.width,
            height: image.height,
            caption: "",
            uploadedBy: user.uid,
            // 칸 이름은 옛 그대로 uploadedByNickname이지만 본명을 적습니다(앨범 화면과 같음).
            uploadedByNickname: profile?.name || "원우",
            uploadedAt: serverTimestamp(),
            likes: [],
          }),
        ),
      ]);
      onClose();
    } catch (caught) {
      setError(
        saveErrorMessage(caught, editing ? "소식을 고치지 못했어요." : "소식을 올리지 못했어요."),
      );
      setSaving(false);
      setProgress(null);
    }
  }

  const heading = editing ? "소식 고치기" : "소식 올리기";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={saving ? undefined : onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">{heading}</h2>

        {/*
          사진 — 새로 올릴 때만, **한 장만** (2026-09-22 사용자 요청 "카드에는 대표사진 한 장만").
          고른 사진이 미리 보이고, 오른쪽 위 ×로 빼거나 옆 칸으로 다른 사진을 골라 바꿔 끼웁니다.
          (같은 날 처음엔 여러 장을 고르게 했다가 바꿨습니다.)
        */}
        {editing ? null : (
          <div className="mb-5">
            <FieldLabel>사진</FieldLabel>
            {!isCloudinaryConfigured ? (
              <p className="rounded-2xl bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-500">
                사진 보관소(Cloudinary) 설정이 아직 안 되어 있어요. 운영진에게 알려주세요.
              </p>
            ) : (
              <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
                {photos.map((photo, position) => (
                  <div key={photo.preview} className="relative h-24 w-24 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt={`고른 사진 ${position + 1}`}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.preview)}
                      disabled={saving}
                      aria-label={`사진 ${position + 1} 빼기`}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label
                  className={`flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-surface text-ink-muted ${
                    saving ? "opacity-50" : ""
                  }`}
                >
                  <PlusIcon className="h-6 w-6" />
                  <span className="text-[12px] font-bold">
                    {photos.length ? "사진 바꾸기" : "사진 고르기"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={saving}
                    onChange={handlePick}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="mb-5">
          <FieldLabel htmlFor="album-title">제목</FieldLabel>
          <input
            id="album-title"
            value={title}
            onChange={(changed) => {
              setTitle(changed.target.value);
              setError(null);
            }}
            placeholder="예) 10기 수료식"
            className={inputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="album-date">날짜</FieldLabel>
          <input
            id="album-date"
            type="date"
            value={eventDate}
            onChange={(changed) => setEventDate(changed.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-6">
          <FieldLabel
            htmlFor="album-body"
            hint={
              <span className="tabular-nums">
                선택 · {body.length}/{ALBUM_BODY_MAX_LENGTH}자
              </span>
            }
          >
            본문
          </FieldLabel>
          <textarea
            id="album-body"
            value={body}
            onChange={(changed) => {
              setBody(changed.target.value.slice(0, ALBUM_BODY_MAX_LENGTH));
              setError(null);
            }}
            rows={4}
            placeholder="어떤 자리였는지 원우들에게 짧게 들려주세요."
            className={`${inputClassName} resize-none leading-relaxed`}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            /*
              shrink-0과 whitespace-nowrap이 꼭 필요합니다.
              옆의 PrimaryButton이 w-full이라 자리를 통째로 요구해서, 이 단추가
              0에 가깝게 눌리며 "취소"가 세로로 접혔습니다.
            */
            className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted disabled:opacity-50"
          >
            취소
          </button>
          {/* sm — 다른 단추와 한 줄에 서는 크기입니다 (ui.tsx의 size 설명 참고). */}
          <PrimaryButton type="submit" loading={saving} size="sm">
            {progress && progress.done < progress.total
              ? `사진 올리는 중 ${progress.done + 1}/${progress.total}`
              : editing
                ? "저장"
                : "올리기"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

/**
 * 카드의 ⋯ 를 누르면 뜨는 고르기 시트 — 고치기 / 지우기 / 취소 (2026-09-22 사용자 요청).
 * 올린 원우와 운영진에게만 ⋯ 가 보입니다(AlbumCard). 모양은 설정의 로그아웃 확인 시트와 같은 결입니다.
 *
 * 지우기는 사진 목록(photos 하위 문서)을 먼저 지우고 소식을 지웁니다 — 앨범 화면의 "앨범 지우기"와 같은 순서.
 * Cloudinary의 사진 실물은 남습니다(서명 없는 업로드라 앱에서 못 지움 — 자료 탭 파일과 같음).
 */
function AlbumManageSheet({
  album,
  onEdit,
  onClose,
}: {
  album: PhotoAlbumDoc;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`"${album.title}" 소식을 지울까요?\n사진도 함께 사라지고 되돌릴 수 없어요.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const photos = await getDocs(collection(db, "photoAlbums", album.id, "photos"));
      await commitWrite([
        ...photos.docs.map((photo) => deleteDoc(photo.ref)),
        deleteDoc(doc(db, "photoAlbums", album.id)),
      ]);
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "소식을 지우지 못했어요."));
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="소식 고치기·지우기"
      onClick={deleting ? undefined : onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
      >
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />
        <p className="mt-5 truncate text-[15px] font-bold text-ink-muted">{album.title}</p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={deleting}
            className="w-full rounded-2xl bg-fill py-[13px] text-[16px] font-bold text-ink disabled:opacity-50"
          >
            고치기
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fill py-[13px] text-[16px] font-bold text-danger disabled:opacity-50"
          >
            {deleting ? <Spinner className="h-5 w-5" /> : null}
            지우기
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="mt-2 w-full py-3 text-[15px]! font-bold text-ink-soft"
        >
          취소
        </button>
      </div>
    </div>
  );
}
