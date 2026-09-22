"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { PlusIcon } from "@/components/icons";
import {
  EmptyState,
  ErrorState,
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { useViewCohort } from "@/lib/use-view-cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { viewerUrl } from "@/lib/cloudinary";
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
 *   (앨범 = 게시물 한 개입니다. 데이터는 그대로 photoAlbums — 카드를 누르면 그 앨범 화면에서 사진을 다 보고 올립니다.)
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

      {creating ? <AlbumCreateSheet onClose={() => setCreating(false)} /> : null}
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
 * - 밀지 않고 톡 누르면 그 앨범 화면(/albums/…)으로 갑니다 — 사진 전부 보기·사진 올리기는 거기서.
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
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
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

    if (!start.moved) {
      router.push(`/albums/${albums[current].id}`);
      return;
    }
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
        {under ? (
          <div className="absolute inset-x-0 top-0">
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
            <AlbumCard album={under} author={authors.get(under.createdBy)} position={albums.indexOf(under) + 1} total={albums.length} />
            {/* 밑장의 그늘 — 위 장이 덮고 있을수록 짙고, 넘어갈수록 걷힙니다. */}
            {page ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[24px] bg-black"
                style={{ opacity: 0.25 * (1 - Math.abs(turned)), transition }}
              />
            ) : null}
          </div>
        ) : null}

        {page ? (
          <div
            className="absolute inset-x-0 top-0 origin-left [backface-visibility:hidden]"
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
        ) : null}
      </div>
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
 *   전문은 카드를 눌러 들어간 앨범 화면에서 봅니다.
 * 사진 위 오른쪽 위 "3 / 10"은 몇 번째 장인지.
 */
function AlbumCard({
  album,
  author,
  position,
  total,
}: {
  album: PhotoAlbumDoc;
  /** 올린 원우(명단에서 찾은 것). 없으면 앨범에 적힌 이름만 씁니다. */
  author: UserDoc | undefined;
  position: number;
  total: number;
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
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink">{authorName}</p>
            <p className="text-[12px] text-ink-faint">
              {date}
              {date ? " · " : ""}사진 {album.photoCount}장
            </p>
          </div>
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

/**
 * 새 소식(앨범)을 올리는 바텀시트 — 제목·날짜·본문(선택).
 * 사진은 올린 뒤 카드를 눌러 들어간 앨범 화면에서 붙입니다. 첫 사진이 카드의 대표 사진이 됩니다.
 * (2026-09-22 "소식 올리기"로 이름을 바꾸며 본문 칸을 더하고, "행사 이름/행사 날짜"를 "제목/날짜"로 줄였습니다.)
 */
function AlbumCreateSheet({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  /** 새 앨범이 올라갈 기수 — 운영진이 제목 옆에서 고른 기수입니다. */
  const { cohort } = useViewCohort();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayString());
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
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
    // 응답을 잠깐만 기다리고 창을 닫습니다 — 이유는 lib/firestore-commit.ts에.
    try {
      const created = doc(collection(db, "photoAlbums"));
      await commitWrite(
        setDoc(created, {
          title: title.trim(),
          eventDate,
          body: body.trim(),
          coverImageUrl: null,
          photoCount: 0,
          cohort,
          createdBy: user.uid,
          // 카드에 "누가 올렸는지"를 적으려고 이름도 함께 남깁니다(2026-09-22). 카드는 원우수첩의 지금 이름을 먼저 씁니다.
          createdByName: profile?.name || "원우",
          createdAt: serverTimestamp(),
        }),
      );
      onClose();
      // 곧바로 그 앨범 화면으로 가서 사진을 붙이게 합니다 — "소식 올리기"를 눌렀는데 사진 없는 카드만 남지 않게.
      router.push(`/albums/${created.id}`);
    } catch (caught) {
      setError(saveErrorMessage(caught, "소식을 올리지 못했어요."));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="소식 올리기"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">소식 올리기</h2>

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
            /*
              shrink-0과 whitespace-nowrap이 꼭 필요합니다.
              옆의 PrimaryButton이 w-full이라 자리를 통째로 요구해서, 이 단추가
              0에 가깝게 눌리며 "취소"가 세로로 접혔습니다.
            */
            className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
          >
            취소
          </button>
          {/* sm — 다른 단추와 한 줄에 서는 크기입니다 (ui.tsx의 size 설명 참고). */}
          <PrimaryButton type="submit" loading={saving} size="sm">
            올리기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
