"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import CommitteeOrgChart from "@/components/CommitteeOrgChart";
import { committeeSlides } from "@/components/CommitteeRoster";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from "@/components/icons";
import {
  EmptyState,
  ErrorState,
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  Spinner,
  flatInputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { useViewCohort } from "@/lib/use-view-cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { isCloudinaryConfigured, uploadImage, viewerUrl } from "@/lib/cloudinary";
import { resizeImage } from "@/lib/image";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useIsGuest, useRequireLogin } from "@/components/LoginRequired";
import { PHOTO_MAX_DIMENSION } from "@/lib/constants";
import { dotDate, parseDateString, todayString } from "@/lib/format";
import { useAlbums, useCohortMembers } from "@/lib/hooks";
import { currentWeekId, weekIdForMillis, weekRangeLabel } from "@/lib/week";
import type { PhotoAlbumDoc, UserDoc } from "@/lib/types";

/** 소식 본문 최대 글자 수 (2026-09-22). 카드에는 넉 줄까지만 보입니다. */
const ALBUM_BODY_MAX_LENGTH = 1000;

/** 소식 탭의 칸 (2026-09-23) — 원우 소식 / 위원회 */
export type AlbumCategory = "member" | "committee";

/** 소식이 속한 주(화~월). weekId가 없는 옛 소식은 올린 시각(createdAt)으로 다시 계산합니다 (2026-09-24). */
function weekOfAlbum(album: PhotoAlbumDoc): string {
  return (
    album.weekId ??
    weekIdForMillis(album.createdAt?.toMillis() ?? parseDateString(album.eventDate)?.getTime() ?? Date.now())
  );
}

/**
 * 한 주(화~월)의 원우 소식만 넘겨 보는 자리 — /news/week/[weekId] 화면 (2026-09-24 사용자 요청).
 * 원우 소식 칸과 같은 카드 책(AlbumBook)이고, 아래에는 탭바만 있어 90px(위원회 칸과 같음)만 비웁니다.
 */
export function WeekAlbumBook({ weekId }: { weekId: string }) {
  const { data: allAlbums, loading, error } = useAlbums();
  const { cohort } = useViewCohort();
  const members = useCohortMembers(cohort);
  const authors = new Map(members.data.map((member) => [member.uid, member]));

  if (loading) {
    return (
      <BookFrame bottomReservePx={90}>
        <Skeleton className="h-full w-full rounded-card" />
      </BookFrame>
    );
  }
  if (error) return <ErrorState message={error} />;

  const slides = allAlbums
    .filter(
      (album) =>
        inCohort(album, cohort) &&
        (album.category ?? "member") === "member" &&
        weekOfAlbum(album) === weekId,
    )
    .map((album) => ({ id: album.id, title: album.title, album }));

  if (slides.length === 0) {
    return (
      <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<span className="text-[40px]">📸</span>}
          title="이 주에는 올라온 소식이 없어요"
          description="소식 탭에서 이번 주 소식과 지난 소식을 볼 수 있어요."
        />
      </div>
    );
  }

  return <AlbumBook slides={slides} authors={authors} bottomReservePx={90} />;
}

const NO_AUTHORS = new Map<string, UserDoc>();

/**
 * 로그인 없이 보는 주간 소식지(app/letter/[slug])의 카드 책 (2026-09-24 사용자 요청
 * "앱처럼 옆으로 넘기는 형식으로 똑같이… 본문이 길면 카드 뒤집기로 전체… 애니메이션·기능 통일").
 *
 * 앱의 원우 소식 칸과 같은 AlbumBook이라 넘기기·화살표·순번·뒤집기가 모두 같고, ⋯ (수정·지우기)만 없습니다.
 * 소식은 서버가 읽어 넘깁니다(원우수첩을 못 읽으니 올린 원우 이름은 createdByName에 담겨 옵니다).
 * 원우 소식 칸처럼 카드가 화면에 딱 맞게 서서 화면을 위아래로 굴리지 않습니다.
 */
export function LetterBook({ albums }: { albums: PhotoAlbumDoc[] }) {
  useEffect(() => {
    document.body.dataset.lockScroll = "yes";
    return () => {
      delete document.body.dataset.lockScroll;
    };
  }, []);

  const slides = albums.map((album) => ({ id: album.id, title: album.title, album }));
  /*
   * 84 = "소식 올리러 가기" 알약 윗변(바닥에서 20 + 높이 52 = 72) + 사이 12 — 앱의 157과 같은 셈(탭바 자리만 없음).
   * 알약을 옮기면 이 값도 같이. (안전 영역은 BookFrame이 따로 뺍니다.)
   */
  return <AlbumBook slides={slides} authors={NO_AUTHORS} bottomReservePx={84} readOnly />;
}

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
export default function AlbumList({
  category = "member",
  startComposing = false,
}: {
  category?: AlbumCategory;
  /** 처음부터 소식 올리기 창을 연 채로 — 소식지의 "소식 올리러 가기"(/news?compose=1)로 들어왔을 때 (2026-09-24). */
  startComposing?: boolean;
}) {
  const { data: allAlbums, loading, error } = useAlbums();
  /** 보고 있는 기수의 앨범만. 만들 때도 이 기수로 적습니다. */
  const { cohort } = useViewCohort();
  /*
   * 소식 탭의 칸 나누기 (2026-09-23 사용자 요청 "위원회ㅣ원우소식").
   * category 칸이 없는 예전 소식은 모두 원우 소식으로 봅니다.
   * 위원회 칸에는 "소식 올리기" 단추를 두지 않습니다(사용자 "추가하기 기능은 없어도 돼").
   */
  const albums = allAlbums.filter(
    (album) => inCohort(album, cohort) && (album.category ?? "member") === category,
  );
  const canAdd = category === "member";
  const isGuest = useIsGuest();
  const requireLogin = useRequireLogin();
  // 둘러보는 사람은 창을 연 채로 시작하지 않습니다 — news/page.tsx가 로그인으로 보내고, 로그인 뒤 이 주소로 돌아옵니다.
  const [creating, setCreating] = useState(startComposing && category === "member" && !isGuest);
  const [viewingPast, setViewingPast] = useState(false);
  /*
   * 카드에 올린 원우의 사진·이름을 적으려고 그 기수 원우 명단을 받습니다(2026-09-22 사용자 요청).
   * 원우수첩과 같은 훅이라 한 번 받아 둔 것을 함께 씁니다. 명단에 없으면(탈퇴 등) 앨범에 적힌 이름을 씁니다.
   */
  const members = useCohortMembers(cohort);
  const authors = new Map(members.data.map((member) => [member.uid, member]));

  /*
   * 원우 소식은 화~월 주 단위로 묶입니다 (2026-09-24 사용자 요청). 화면 첫 자리엔 이번 주에 올라온
   * 소식만 보이고, 지난 주들은 "지난 소식" 단추 뒤로 접혀 들어갑니다 — 주가 바뀌면 아무도 아직 아무것도
   * 올리지 않은 빈 화면에서 다시 시작합니다(사용자 "새로 추가하기 전에는 쌓인 카드가 없는거지").
   * 위원회 칸에는 적용하지 않습니다 — 주간 개념이 없는 고정 소개 글이라 canAdd일 때만 거릅니다.
   * weekId가 없는 옛 소식(이 기능 이전에 올라온 소식)은 올린 시각(createdAt)으로 주를 다시 계산합니다.
   */
  const weekOf = weekOfAlbum;
  const thisWeek = currentWeekId();
  const currentAlbums = canAdd ? albums.filter((album) => weekOf(album) === thisWeek) : albums;
  /** 지난 주 → 그 주 소식 목록(최근 순은 useAlbums 정렬을 그대로 물려받습니다). */
  const pastWeeks = new Map<string, PhotoAlbumDoc[]>();
  if (canAdd) {
    for (const album of albums) {
      const week = weekOf(album);
      if (week === thisWeek) continue;
      const list = pastWeeks.get(week) ?? [];
      list.push(album);
      pastWeeks.set(week, list);
    }
  }
  // 최근 주가 먼저 — weekId는 "YYYY-MM-DD"라 문자열 비교로 그대로 최신순이 됩니다.
  const pastWeekIds = [...pastWeeks.keys()].sort((a, b) => (a < b ? 1 : -1));

  /*
   * 위원회 칸 (2026-09-23) — 맨 위에 총괄 임원진 조직도 카드가 늘 서고, 그 아래로 올라온 소식 카드가 섭니다.
   * 조직도는 앱 안에 적어 둔 카드라(components/CommitteeOrgChart.tsx) 불러오기를 기다리지 않습니다.
   */
  if (loading) {
    return (
      <BookFrame>
        <Skeleton className="h-full w-full rounded-card" />
      </BookFrame>
    );
  }

  if (error) return <ErrorState message={error} />;

  /*
   * 위원회 칸 (2026-09-23) — 조직도 → 위원회 7개 → (올라온 소식) 순으로 한 장씩 넘겨 봅니다.
   * 원우 소식 칸과 넘기는 방식이 똑같습니다(사용자 요청). 앞의 여덟 장은 앱에 적어 둔 카드입니다.
   */
  const albumSlides = currentAlbums.map((album) => ({ id: album.id, title: album.title, album }));
  const slides = canAdd
    ? albumSlides
    : [
        { id: "committee-org-chart", title: "총괄 임원진 조직도", node: <CommitteeOrgChart /> },
        ...committeeSlides(),
        ...albumSlides,
      ];

  return (
    <>
      {slides.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📸</span>}
            title={canAdd ? "아직 이번 주 소식이 없어요" : "아직 올라온 소식이 없어요"}
            description={
              canAdd
                ? "아래 + 단추로 이번 주 첫 소식을 올려 보세요."
                : "아래 + 단추로 첫 소식을 올려 보세요."
            }
          />
        </div>
      ) : (
        <AlbumBook slides={slides} authors={authors} fit={!canAdd} />
      )}

      {/*
        지난 소식 — 이번 주 뒤로 접힌 지난 주들을 주차별로 훑어보는 자리 (2026-09-24 사용자 요청).
        지난 주가 하나도 없으면 단추 자체를 안 둡니다. "소식 올리기"와 같은 줄, 반대쪽(왼쪽)에 옅은 색으로.
      */}
      {canAdd && pastWeekIds.length > 0 ? (
        <button
          type="button"
          onClick={() => setViewingPast(true)}
          className="fixed bottom-[calc(93px+env(safe-area-inset-bottom))] left-5 z-20 flex items-center gap-1.5 rounded-full bg-surface px-5 py-4 text-[15px] font-bold text-ink-muted shadow-[var(--shadow-card-flat)] transition active:scale-95"
        >
          지난 소식
        </button>
      ) : null}

      {/*
        사진 올리기 — 자료 탭 "파일 올리기"와 같은 자리·같은 모양의 떠 있는 주황 알약입니다 (2026-09-14).
        bottom의 92px는 하단 탭 알약 위로 올리는 높이입니다. 카드는 이 알약 위에서 끝나서(BookFrame)
        맨 아래의 제목·본문을 가리지 않습니다.

        원우 누구나 봅니다 (2026-09-14, 예전엔 운영진만). 보안 규칙도 원래
        photoAlbums 쓰기를 원우 누구에게나 열어 두었습니다. 새 앨범은 보고 있는
        기수로 적히고, 원우는 자기 기수로 고정이라 늘 자기 기수에 만들어집니다.
      */}
      {canAdd ? (
        <button
          type="button"
          onClick={() => {
            // 소식 올리기는 로그인해야 — 둘러보는 사람에게는 안내 창, 로그인 뒤 소식 올리기 창으로 (2026-09-24).
            if (requireLogin({ returnPath: "/news?compose=1" })) return;
            setCreating(true);
          }}
          // bottom 93px — 2026-09-22 사용자 요청 "1px 올려줘"(92px에서). 자료 탭 "파일 올리기"는 92px 그대로입니다.
          // ★ 글씨 없는 주황 동그라미 + (2026-09-25 사용자 "소식 올리기는 지우고 원 안에 + 만, + 크기·굵기 키워줘").
          //   예전엔 "+ 소식 올리기" 알약(높이 52px). 동그라미도 52px라 BookFrame이 비워 두는 157px 셈은 그대로입니다.
          aria-label="소식 올리기"
          className="fixed right-5 bottom-[calc(93px+env(safe-area-inset-bottom))] z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-500 text-white shadow-[var(--shadow-float)] transition active:scale-95"
        >
          {/* + 26px·선 2.8 — 예전 20px·2.1에서 키움. */}
          <PlusIcon className="h-[26px] w-[26px]" strokeWidth={2.8} />
        </button>
      ) : null}

      {creating ? <AlbumSheet onClose={() => setCreating(false)} /> : null}
      {viewingPast ? (
        <PastWeeksSheet
          weekIds={pastWeekIds}
          albumsByWeek={pastWeeks}
          onClose={() => setViewingPast(false)}
        />
      ) : null}
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
 * 높이 = 화면 높이 − 틀의 위 끝 − 157px − 아래 안전 영역.
 *   157px = "소식 올리기" 알약 윗변(바닥에서 93 + 높이 52 = 145px) + 사이 12px. 알약을 옮기면 이 값도 같이.
 *   카드의 제목·본문이 맨 아래라(2026-09-22) 알약이 그 글을 가리지 않게 알약 위에서 끝냅니다.
 *   (그 전엔 탭 알약 위까지 90px = MainShell이 비워 둔 78px + 12px이었습니다.)
 * 틀의 위 끝(제목 줄 높이 + 본문 pt-4)은 화면마다·폰마다 달라서 그려진 뒤에 한 번 잽니다(ref 콜백).
 * 재기 전 첫 그림에서는 넉넉히 70dvh로 둡니다.
 */
function BookFrame({
  children,
  minHeightPx = 0,
  bottomReservePx = 157,
}: {
  children: React.ReactNode;
  /**
   * 틀 아래로 비워 두는 높이(px).
   * 157 = "소식 올리기" 알약 윗변(93 + 52) + 사이 12 — 원우 소식 칸.
   * 위원회 칸에는 그 알약이 없어 90(탭 알약 자리 78 + 12)만 비웁니다 (2026-09-23 사용자 "카드가 화면 한가운데에").
   */
  bottomReservePx?: number;
  /**
   * 이 높이보다는 낮아지지 않습니다 — 위원회 칸에서 카드가 화면보다 길 때 그만큼 늘리는 데 씁니다 (2026-09-23).
   * 카드가 짧으면 틀은 화면 크기 그대로여서 카드가 화면 한가운데에 섭니다(사용자 "카드가 화면 정가운데에").
   */
  minHeightPx?: number;
}) {
  const viewport = useSyncExternalStore(subscribeHeight, heightSnapshot, () => 0);
  const [top, setTop] = useState<number | null>(null);

  const screenHeight =
    viewport && top !== null
      ? `calc(${Math.max(320, viewport - top)}px - ${bottomReservePx}px - env(safe-area-inset-bottom))`
      : "70dvh";
  const height = minHeightPx > 0 ? `max(${screenHeight}, ${minHeightPx}px)` : screenHeight;

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

/** 이만큼(카드 폭의 비율) 밀거나 빠르게 튕기면 한 장이 넘어갑니다. */
const TURN_THRESHOLD = 0.25;
/** 손을 뗀 뒤 남은 만큼 넘어가거나 되돌아오는 시간(ms) */
const TURN_MS = 340;
/** 넘어갈 때의 속도 곡선 — 처음 빠르고 끝에서 부드럽게 멈춥니다(ease-out 계열). */
const TURN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/**
 * 양옆 화살표 자리(px) — 카드가 양옆에 따로 비우는 자리.
 * 0 (2026-09-23 사용자 "게시물 카드 가로 길이를 홈탭 흰색 박스와 똑같게") — 예전엔 40px(inset-x-10).
 * 이제 카드가 홈 박스처럼 화면 양옆 16px(소식 탭의 px-4)만 남기고, 화살표는 그 16px 안에 작게 섭니다.
 */
const ARROW_GUTTER = 0;

/**
 * 넘기는 중인 상태.
 *   mode "next" — 왼쪽으로 밀기: 지금 카드가 왼쪽으로 날아가고 뒤에서 다음 카드가 커지며 올라옵니다.
 *   mode "prev" — 오른쪽으로 밀기: 지금 카드가 오른쪽으로 날아가고 뒤에서 앞 카드가 올라옵니다.
 *   progress 0~1 — 넘어간 정도. settling이면 손을 뗀 뒤 저절로 끝까지 가는 중(transition이 붙음).
 */
type Turn = { mode: "next" | "prev"; progress: number; settling: boolean };

/**
 * 카드를 옆으로 넘겨 보는 자리 (2026-09-22 사용자 요청).
 *
 * - 한 번에 카드 한 장, 틀(BookFrame)의 세로 가운데. 높이는 사진 비율을 따릅니다(틀보다 길지는 않음).
 * - 왼쪽으로 밀면 다음(더 예전) 카드, 오른쪽으로 밀면 앞 카드. 목록 순서는 useAlbums 그대로(최근 행사가 먼저).
 *
 * ★ 넘기는 모습 (2026-09-22 사용자 요청 "자연스럽게 넘어가는 애니메이션"):
 *   지금 카드는 손가락을 그대로 따라 옆으로 움직이며 아래쪽을 축으로 살짝 기울고(최대 5°),
 *   그 뒤에서 넘어올 카드가 90% 크기·옅은 모습에서 제 크기로 커지며 올라옵니다.
 *   손을 떼면 남은 만큼을 ease-out으로 마저 가거나 제자리로 돌아옵니다. 화살표를 눌러도 같은 모습입니다.
 *   (처음엔 책장처럼 왼쪽 끝을 축으로 3D로 돌려 넘겼는데 — rotateY 0 → -90° — 90°에서 장이 선처럼 서서 사라져
 *    뚝 끊겨 보였습니다. 그래서 슬라이드로 바꿨습니다.)
 *   ★ 카드마다 key를 소식 id로 줘서, 뒤에서 올라온 카드가 "지금 카드"가 될 때 같은 요소가 그대로 이어집니다 —
 *     바뀌는 순간 깜빡이지 않습니다. 그래서 두 자리(지금·뒤) 모두 같은 짜임(뒤집기 칸 + 앞뒤 면)으로 그립니다.
 * - 멈춰 있을 때 뒤에 남은 장이 있으면 오른쪽·아래로 살짝 비켜 선 종이 두 장을 깔아 "쌓인 카드"로 보입니다.
 * - 처음·마지막 장에서 더 밀면 조금만 따라오다 되돌아옵니다.
 * - 카드를 톡 누르면 제자리에서 뒤집혀 뒷면(세부 설명, AlbumCardBack)이 보이고, 다시 누르면 앞면(2026-09-22 사용자 요청).
 *   넘기기를 시작하거나 화살표를 누르면 앞면으로 돌아옵니다. (예전엔 누르면 앨범 화면 /albums/… 이 열렸습니다.)
 *
 * touch-action: pan-y — 세로 손짓은 브라우저에 맡기고 가로 손짓만 우리가 받습니다.
 */
/**
 * 넘겨 보는 카드 한 장 (2026-09-23) — 소식 카드이거나, 앱에 적어 둔 카드(위원회 조직도·위원회별 인원)입니다.
 * album이 있으면 소식 카드라 눌러서 뒤집고 ⋯로 고칠 수 있고, node면 그 내용만 그립니다.
 */
type Slide = {
  id: string;
  title: string;
  album?: PhotoAlbumDoc;
  node?: React.ReactNode;
  /** 눌러서 뒤집었을 때 보이는 면. 소식 카드는 AlbumCardBack이 대신하고, 위원회 카드는 이것을 씁니다. */
  back?: React.ReactNode;
};

function AlbumBook({
  slides,
  authors,
  fit = false,
  bottomReservePx,
  readOnly = false,
}: {
  slides: Slide[];
  /** uid → 원우 문서. 카드의 "올린 사람" 줄에 씁니다. */
  authors: Map<string, UserDoc>;
  /**
   * true면 카드 길이만큼 자리가 늘어납니다 — 위원회 칸 (2026-09-23 사용자 "조직도는 카드 길이를 늘려줘.
   * 지금은 카드 안에서 스크롤해야 더 보여"). 긴 카드는 화면을 넘어가고 탭 전체를 굴려 읽습니다.
   * false면 예전처럼 화면에 딱 맞는 틀(BookFrame) 안에 카드가 섭니다 — 원우 소식 칸.
   */
  fit?: boolean;
  /**
   * 틀 아래로 비워 두는 높이(px)를 밖에서 정합니다 (2026-09-24, "지난 소식" 보기용).
   * 안 주면 기본값(원우 소식 157 / 위원회 90 — 아래 BookFrame 호출부)을 그대로 씁니다.
   */
  bottomReservePx?: number;
  /** true면 ⋯ (수정·지우기)를 아무에게도 달지 않습니다 — 로그인 없이 보는 소식지(LetterBook) (2026-09-24). */
  readOnly?: boolean;
}) {
  const { user, isAdmin } = useAuth();
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  /** ⋯ 를 눌러 고르기 시트를 연 소식 / 수정 창을 연 소식 */
  const [managing, setManaging] = useState<PhotoAlbumDoc | null>(null);
  const [editing, setEditing] = useState<PhotoAlbumDoc | null>(null);
  /** 올린 원우와 운영진만 ⋯ (수정·지우기)가 보입니다. */
  const canManage = (album: PhotoAlbumDoc) =>
    !readOnly && (album.createdBy === user?.uid || isAdmin);
  /** 뒤집어 세부 설명을 보고 있는 소식의 id (2026-09-22 사용자 요청 — 카드를 한 번 누르면 뒤집힘) */
  const [flippedId, setFlippedId] = useState<string | null>(null);
  /** 카드 자리 — 아래 touchmove 막기를 걸어 두는 곳 */
  const deckRef = useRef<HTMLDivElement | null>(null);
  /** 카드 자리(틀)의 높이(px) — 긴 위원회 카드를 줄일 때 기준입니다(아래 fitScale). */
  const [deckHeight, setDeckHeight] = useState(0);
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const observer = new ResizeObserver(() => setDeckHeight(deck.offsetHeight));
    observer.observe(deck);
    return () => observer.disconnect();
  }, []);
  /*
   * 지금 카드의 높이(px) — 두 곳에 씁니다 (2026-09-23).
   *  1. 순번 줄("3 / 8")을 카드 아래 8px에 두는 자리. 카드마다 길이가 달라도 자리가 뚝 끊기지 않게
   *     transition을 걸어 부드럽게 옮깁니다(사용자 "n/n이 너무 부자연스럽게 이동해").
   *  2. fit일 때(위원회 칸) 카드 자리 전체의 높이 — 카드가 길면 그만큼 자리가 늘어납니다.
   * 카드가 그려진 뒤·크기가 바뀔 때마다 ResizeObserver가 알려 줍니다.
   */
  const [cardHeight, setCardHeight] = useState(0);
  const cardObserver = useRef<ResizeObserver | null>(null);
  const measureCard = (element: HTMLDivElement | null) => {
    cardObserver.current?.disconnect();
    cardObserver.current = null;
    if (!element) return;
    /*
     * ★ offsetHeight로 잽니다 — getBoundingClientRect()는 안 됩니다 (2026-09-25 사용자 "이 카드만 회전할 때 내려갔다가 올라가").
     *   카드는 뒤집힐 때 perspective 3D로 돌아서, 도는 동안 화면에 보이는 크기(getBoundingClientRect)가 커졌다 작아집니다.
     *   그 값으로 재면 높이가 흔들리고, 화면보다 긴 카드(fit — 대외협력위원회처럼 인원 많은 카드)는 그 높이로 자리를 잡아서
     *   카드가 아래로 내려갔다 올라왔습니다. offsetHeight는 변형(transform)을 무시한 원래 높이라 도는 동안에도 그대로입니다.
     *   (measureCard는 그릴 때마다 새 함수라 리액트가 그릴 때마다 다시 부릅니다 — 회전 중에도 계속 재는 까닭.)
     */
    setCardHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => setCardHeight(element.offsetHeight));
    observer.observe(element);
    cardObserver.current = observer;
  };
  const drag = useRef<{
    x: number;
    y: number;
    time: number;
    /** 카드 폭(px) — 민 거리를 넘어간 정도(0~1)로 바꾸는 기준 */
    width: number;
    moved: boolean;
    /** 카드 위에서 눌렀는지 — 카드 바깥 빈자리를 눌러서는 뒤집히지 않게. */
    onCard: boolean;
  } | null>(null);

  /*
   * 화면보다 긴 위원회 카드(fit)를 화면에 맞게 줄이는 비율 (2026-09-25 사용자 "위원회창은 위아래로 스크롤 안 되게").
   * 카드 자리 = 틀 높이 − 아래 순번 줄 40px. 카드가 그보다 길면 그만큼만 줄이고(scale), 짧으면 1(그대로)입니다.
   * 인원이 많은 위원회나 조직도, 글씨 "크게"일 때만 줄어듭니다. 원우 소식 칸(fit 아님)은 늘 1입니다.
   */
  const fitSpace = deckHeight - 40;
  const fitScale = fit && cardHeight > 0 && fitSpace > 0 && cardHeight > fitSpace ? fitSpace / cardHeight : 1;

  // 기수를 바꾸거나 소식이 지워져 목록이 짧아지면 마지막 장에 섭니다.
  const current = Math.min(index, slides.length - 1);
  const hasPrev = current > 0;
  const hasNext = current < slides.length - 1;

  /*
   * 가로로 밀 때 카드 안쪽 세로 굴리기가 끼어들지 않게 막습니다
   * (2026-09-23 사용자 "위원회 칸에서 카드가 옆으로 잘 안 넘어가").
   *
   * 위원회 카드는 길어서 카드 안에서 위아래로 굴려 읽습니다(overflow-y-auto). 그 자리에서 손을 옆으로 밀면
   * 브라우저가 "세로로 굴리려는 손짓"으로 먼저 채 가고, 그러면 우리 쪽 손짓이 pointercancel로 끊겨
   * 카드가 제자리로 돌아옵니다. 가로로 6px 넘게(세로보다 많이) 움직인 순간부터 기본 동작을 막아
   * 그 손짓을 우리가 끝까지 받습니다.
   *
   * ★ React의 onTouchMove로는 안 됩니다 — 리액트가 passive로 붙여 preventDefault가 먹지 않습니다.
   *   그래서 여기서 passive: false로 직접 붙입니다.
   */
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    function onTouchMove(event: TouchEvent) {
      const start = drag.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (start.moved || (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy))) event.preventDefault();
    }
    deck.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => deck.removeEventListener("touchmove", onTouchMove);
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (turn?.settling) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      width: Math.max(1, event.currentTarget.getBoundingClientRect().width - ARROW_GUTTER * 2),
      moved: false,
      onCard: event.target instanceof Element && event.target.closest("[data-album-card]") !== null,
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
      // 넘기기 시작하면 뒤집어 둔 카드는 앞면으로 돌려놓습니다.
      setFlippedId(null);
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

    /*
     * 밀지 않고 카드를 톡 누르면 뒤집힙니다 — 뒷면에 세부 설명, 다시 누르면 앞면 (2026-09-22 사용자 요청).
     * (그 전엔 누르면 앨범 화면이 열렸다가, 같은 날 사용자 요청으로 아무 일도 없게 했었습니다.)
     */
    if (!start.moved) {
      // 뒷면이 있는 카드만 뒤집힙니다 — 소식 카드(AlbumCardBack)와 위원회 카드(back). 조직도 카드는 뒷면이 없어 넘어갑니다.
      if (start.onCard && (slides[current].album || slides[current].back)) {
        const id = slides[current].id;
        setFlippedId((flipped) => (flipped === id ? null : id));
      } else if (start.onCard) {
        /*
         * 뒷면 없는 카드(조직도)는 누르면 다음 카드로 넘어갑니다 — › 화살표를 누른 것과 같습니다
         * (2026-09-24 사용자 요청 "조직도 카드는 그 다음 카드로 넘어가도록").
         */
        turnBy("next");
      }
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

  /**
   * 양옆 화살표(‹ ›)를 눌렀을 때 — 손으로 민 것처럼 한 장 넘깁니다(2026-09-22 사용자 요청).
   * 넘어간 정도 0에서 한 번 그린 뒤 다음 그림에서 1로 바꿔야 transition이 걸려 넘어가는 모습이 보입니다
   * (requestAnimationFrame 두 번 — 첫 번째는 0을 그리게, 두 번째에 1로).
   */
  function turnBy(mode: Turn["mode"]) {
    if (turn) return;
    setFlippedId(null);
    setTurn({ mode, progress: 0, settling: false });

    /*
     * ★ 넘길 장이 없는 쪽(첫 장의 ‹, 마지막 장의 ›, 카드가 한 장뿐일 때 둘 다)도 눌립니다 (2026-09-22 사용자 요청
     *   "화살표를 누르면 카드를 옆으로 넘기는 것과 같은 기능"). 손으로 밀 때처럼 카드가 그쪽으로 살짝 끌려갔다가
     *   제자리로 돌아와 "더 없음"을 알립니다. 예전엔 그쪽 화살표가 꺼져 있어(disabled) 눌러도 아무 일이 없었고,
     *   카드가 한 장뿐이던 사용자에게는 화살표가 고장 난 것처럼 보였습니다.
     */
    if (mode === "next" ? !hasNext : !hasPrev) {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => setTurn({ mode, progress: 0.06, settling: true })),
      );
      window.setTimeout(() => setTurn({ mode, progress: 0, settling: true }), TURN_MS / 2);
      window.setTimeout(() => setTurn(null), TURN_MS / 2 + TURN_MS);
      return;
    }

    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setTurn({ mode, progress: 1, settling: true })),
    );
    window.setTimeout(() => {
      setIndex(current + (mode === "next" ? 1 : -1));
      setTurn(null);
    }, TURN_MS + 40);
  }

  /*
   * 그릴 카드 — 멈춰 있으면 지금 카드 하나, 넘기는 중이면 뒤에서 올라올 카드(neighbor) + 지금 카드.
   * 뒤 카드를 먼저 그려 지금 카드 밑에 깔립니다.
   */
  const currentSlide = slides[current];
  const neighbor = !turn
    ? null
    : turn.mode === "next"
      ? hasNext
        ? slides[current + 1]
        : null
      : hasPrev
        ? slides[current - 1]
        : null;
  const slots = neighbor
    ? [
        { slide: neighbor, isCurrent: false },
        { slide: currentSlide, isCurrent: true },
      ]
    : [{ slide: currentSlide, isCurrent: true }];
  /** 지금 카드가 날아가는 쪽 — 다음이면 왼쪽(-1), 앞이면 오른쪽(+1). */
  const direction = turn?.mode === "next" ? -1 : 1;
  const progress = turn?.progress ?? 0;
  const transition = turn?.settling
    ? `transform ${TURN_MS}ms ${TURN_EASE}, opacity ${TURN_MS}ms ${TURN_EASE}`
    : "none";

  /** 카드 + 그 아래 순번 줄(40px)이 들어갈 자리. fit이면 카드 길이를 따라 늘어납니다. */
  const deck = (
      <div
        ref={deckRef}
        /*
          틀을 다 씁니다. 순번 줄("3 / 10", 32px)은 카드 바로 밑에 붙어 카드와 한 덩어리로 가운데에 섭니다
          (2026-09-23 사용자 "1/1은 게시물 카드 바로 밑으로" — 예전엔 틀 맨 아래 bottom-8 자리에 따로).
          --card-max(카드 최대 높이)는 그 32px을 빼 카드가 순번 줄을 밀어내지 않게 합니다.
        */
        className="absolute inset-0 select-none"        /*
          touch-action (2026-09-23 사용자 "옆으로 넘길 때 자꾸 아래로 스크롤 되는 경향")
            - 소식 카드: "none" — 카드 자리에서는 세로 스크롤을 아예 받지 않습니다. 옆으로 밀 때 화면이
              같이 밀려 내려가던 것이 없어집니다. 이 자리는 화면에 딱 맞아(BookFrame) 굴릴 것도 없습니다.
            - 위원회 카드: "pan-y" — 카드 안에서 위아래로 굴려 읽어야 해서(긴 조직도) 세로는 열어 둡니다.
        */
        style={
          {
            // fit(위원회)에서는 카드가 잘리지 않고 다 보이므로 세로 손짓을 막지 않습니다 — 탭을 굴려 읽습니다.
            // 위원회 칸도 이제 화면을 굴리지 않아(2026-09-25) 세로 손짓을 받을 일이 없습니다 — 둘 다 "none".
            touchAction: "none",
            "--card-max": fit ? "none" : "calc(var(--frame-h) - 40px)",
          } as React.CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setTurn(null);
        }}
        role="group"
        aria-roledescription="넘겨 보는 카드"
        aria-label={`${current + 1} / ${slides.length} ${currentSlide.title}`}
      >
        {/*
          ★ 카드는 틀의 세로 한가운데에 섭니다(2026-09-22 사용자 요청 "화면 한 가운데") — 바깥 칸이 틀을 채우고
            flex로 가운데를 맞추며, 안쪽 relative 칸이 카드 크기라 종이가 카드에 딱 맞습니다.
            좌우는 들이지 않습니다(inset-x-0) — 카드 폭이 홈 흰 박스와 같습니다(2026-09-23 사용자 요청,
            예전엔 inset-x-10으로 40px씩 들여 큰 화살표 자리를 남겼습니다). 사진은 폭에 맞춰 비율대로 커집니다.
        */}
        {slots.map(({ slide, isCurrent }) => {
          const album = slide.album;
          const flipped = isCurrent && flippedId === slide.id;
          const motion = isCurrent
            ? {
                transform: `translateX(${direction * progress * 112}%) rotate(${direction * progress * 5}deg)`,
                opacity: 1 - progress * 0.25,
              }
            : {
                transform: `translateX(${-direction * (1 - progress) * 6}%) scale(${0.9 + 0.1 * progress})`,
                opacity: 0.4 + 0.6 * progress,
              };
          return (
            <div
              key={slide.id}
              /* 아래 40px은 순번 줄 자리로 비워 둡니다(순번은 아래에 따로 한 줄만 그립니다). */
              className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex items-center"
              style={{ zIndex: isCurrent ? 2 : 1 }}
            >
              <div
                className="pointer-events-auto relative w-full origin-bottom"
                style={{ ...motion, transition }}
              >
                {/* 화면보다 긴 위원회 카드를 화면에 맞게 줄이는 칸 — 아래 fitScale 주석. 보통은 1(그대로)입니다. */}
                {/*
                  --fit-scale — 줄인 비율을 카드 안에 알려 줍니다. 카드 아래 안내 글씨("눌러서 다음 장 보기" 등)가
                  이 값으로 나눠 제 크기(12px)로 보이게 합니다 (2026-09-26 사용자 "같은 크기로" — 조직도만 줄어 작아 보였음).
                */}
                <div
                  style={
                    fitScale < 1
                      ? ({
                          transform: `scale(${fitScale})`,
                          transformOrigin: "center",
                          transition: `transform ${TURN_MS}ms ${TURN_EASE}`,
                          "--fit-scale": fitScale,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                {/* 뒤에 종이가 한두 장 더 깔려 있는 것처럼 보이던 그림은 뺐습니다 (2026-09-23 사용자 요청). */}
                {/*
                  뒤집히는 카드 (2026-09-22 사용자 요청 — 한 번 누르면 뒤집혀 세부 설명).
                  세로 가운데 축으로 180° 돕니다. 앞면·뒷면 모두 backface-hidden이고 뒷면은 미리 180° 돌려 둬서,
                  돌고 나면 뒷면이 바로 읽힙니다. 뒷면은 앞면과 같은 크기(absolute inset-0)라 카드 크기가 안 바뀝니다.
                  perspective는 transform 안에 적습니다 — 부모의 perspective 속성은 바로 아래 자식에게만 걸려서입니다.
                */}
                <div
                  data-album-card
                  ref={isCurrent ? measureCard : undefined}
                  className="relative [transform-style:preserve-3d]"
                  style={{
                    transform: `perspective(1600px) rotateY(${flipped ? 180 : 0}deg)`,
                    transition: "transform 520ms cubic-bezier(0.2, 0.7, 0.2, 1)",
                  }}
                >
                  <div className="[backface-visibility:hidden]">
                    {album ? (
                      <AlbumCard
                        album={album}
                        author={authors.get(album.createdBy)}
                        // 멈춰 있을 때 지금 카드에만 ⋯ 를 답니다.
                        onMore={
                          isCurrent && !turn && canManage(album)
                            ? () => setManaging(album)
                            : undefined
                        }
                      />
                    ) : (
                      /*
                        앱에 적어 둔 카드(위원회 조직도·위원회별 인원, 2026-09-23).
                        fit일 때는 길이를 그대로 두어 카드 안에서 굴리지 않아도 다 보입니다(사용자 요청).
                      */
                      <div
                        className={fit ? "" : "overflow-y-auto overscroll-contain rounded-card"}
                        style={fit ? undefined : { maxHeight: "var(--card-max, var(--frame-h))" }}
                      >
                        {slide.node}
                      </div>
                    )}
                  </div>
                  {album || slide.back ? (
                    <div
                      className="absolute inset-0 [backface-visibility:hidden]"
                      style={{ transform: "rotateY(180deg)" }}
                      aria-hidden={!flipped}
                    >
                      {album ? (
                        <AlbumCardBack album={album} author={authors.get(album.createdBy)} />
                      ) : (
                        slide.back
                      )}
                    </div>
                  ) : null}
                </div>
                </div>
              </div>

            </div>
          );
        })}

        {/*
          순번 "지금 카드 / 전체 카드 수" — 카드 바로 밑 8px, 가운데 (2026-09-23).
          ★ 카드마다 한 줄씩 두지 않고 여기 한 줄만 둡니다. 카드 높이(cardHeight)로 자리를 잡고 transition을
            걸어, 길이가 다른 카드로 넘어가도 뚝 끊기지 않고 부드럽게 따라옵니다
            (사용자 "n/n이 너무 부자연스럽게 이동해 — 카드 크기에 따라 자연스럽게").
          자리 셈: 카드 자리(위 40px 뺀 칸)의 한가운데 + 카드 절반 + 8px.
        */}
        <p
          className="pointer-events-none absolute inset-x-0 flex h-8 items-center justify-center text-[14px] font-bold text-ink-muted tabular-nums"
          style={{
            top: `calc((100% - 40px) / 2 + ${(cardHeight * fitScale) / 2 + 8}px)`,
            transition: `top ${TURN_MS}ms ${TURN_EASE}`,
          }}
          aria-live="polite"
        >
          {current + 1} / {slides.length}
        </p>

        {/*
          양옆 화살표 ‹ › — "옆으로 넘기는 카드"라는 표시 겸 누르면 한 장 넘기는 단추.
          2026-09-22 사용자 요청으로 처음 넣었고(24px), 같은 날 "크게"로 36px·선 굵기 2.4·진한 회색으로 키웠습니다.
          카드 바깥 40px 자리(ARROW_GUTTER)의 세로 가운데. 누르면 손으로 민 것과 똑같이 넘어가고(turnBy),
          더 넘길 장이 없는 쪽은 흐리게 보이며 누르면 살짝 끌렸다 돌아옵니다 — 밀 때의 고무줄과 같은 뜻.
          onPointerDown을 멈추는 이유는 카드의 ⋯ 단추와 같습니다(틀이 포인터를 붙잡으면 click이 안 일어남).
          ★ 2026-09-23 사용자 요청 "게시물 박스가 차지하고 남은 공간 만큼만의 사이즈로 확 줄여줘":
            카드가 폭을 다 쓰게 되어, 화살표는 카드 바깥 화면 끝 16px(소식 탭 px-4) 안에 섭니다.
            단추 폭 16px(w-4, -left-4·-right-4로 그 자리로 내보냄), 아이콘 16px(예전 36px).
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
              aria-label={mode === "next" ? "다음 소식" : "앞 소식"}
              // 더 넘길 장이 없는 쪽은 흐리게만 보이고 눌리기는 합니다(누르면 살짝 끌렸다 돌아옴 — turnBy).
              // top-[calc(50%-20px)] — 카드 세로 가운데. 카드가 밑의 순번 줄(띄움 8px + 32px = 40px)과 한 덩어리로 가운데에 서서 20px 위에 있습니다.
              // 색은 ink-faint — 2026-09-23 사용자 "조금만 더 연하게"(ink-soft에서). 토큰 중 가장 연한 회색입니다.
              className={`absolute top-[calc(50%-20px)] z-10 flex h-16 w-4 -translate-y-1/2 items-center justify-center text-ink-faint transition active:scale-90 ${
                enabled ? "" : "opacity-30"
              } ${mode === "next" ? "-right-4" : "-left-4"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.4} />
            </button>
          );
        })}
      </div>

  );

  const sheets = (
    <>
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
    </>
  );

  /*
   * 틀 — 늘 화면에 딱 맞는 크기라 카드가 화면 한가운데에 섭니다(2026-09-23 사용자 "카드가 화면 정가운데에").
   * ★ 2026-09-25 사용자 "위원회창 만큼은 위아래로 스크롤 안 되게": 예전엔 fit(위원회)에서 카드가 화면보다 길면
   *   틀이 그만큼 늘어나 탭 전체를 굴려 읽었습니다. 이제 틀은 늘리지 않고, 긴 카드는 fitScale로 줄여 화면에 맞춥니다.
   *   (화면 스크롤 잠금은 news/page.tsx의 data-lock-scroll.)
   */
  return (
    <BookFrame
      // 위원회 칸에는 "소식 올리기" 알약이 없어 그만큼 자리를 더 씁니다 — 카드가 화면 한가운데에 섭니다.
      bottomReservePx={bottomReservePx ?? (fit ? 90 : 157)}
    >
      {deck}
      {sheets}
    </BookFrame>
  );
}

/**
 * 게시물 카드 한 장.
 *
 * ★ 글과 사진을 겹치지 않고 위아래로 나눕니다 (2026-09-22 사용자 요청 — "제목이랑 본문이 더 잘 보이게").
 *   처음엔 사진이 카드를 다 덮고 그 위 어두운 막에 흰 글씨를 얹었는데, 사진에 따라 글씨가 묻혔습니다.
 *   이제 흰 칸에 먹색으로 씁니다. 순서는 위에서부터 올린 사람(사진·이름·날짜) → 사진 → 제목(18px 굵게, 2026-09-24 20px에서)·본문(15px).
 *   제목·본문은 처음엔 사진 위였는데 같은 날 사용자 요청으로 사진 아래로 옮겼습니다.
 *   "소식 올리기" 알약이 아래 글을 가리지 않도록 틀(BookFrame)이 알약 위에서 끝납니다.
 * ★ 본문은 넉 줄까지만 보이고 넘치면 "…"(line-clamp-4) — 다 쓰면 사진 자리가 없어집니다.
 *   (카드를 눌러 앨범 화면에서 전문을 보던 길은 2026-09-22 사용자 요청으로 없앴습니다.)
 */
function AlbumCard({
  album,
  author,
  onMore,
}: {
  album: PhotoAlbumDoc;
  /** 올린 원우(명단에서 찾은 것). 없으면 앨범에 적힌 이름만 씁니다. */
  author: UserDoc | undefined;
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
      className="relative flex w-full flex-col overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)]"
      style={{ maxHeight: "var(--card-max, var(--frame-h))" }}
    >
      {/* pt-3 — 카드 위 흰 여백 12px (2026-09-25 사용자 "상단 여백 좀 줄여줘", 16px에서). 뒷면도 같이. */}
      <div className="shrink-0 px-5 pt-3 pb-3.5">
        {/*
          올린 원우 — 이름, 그 아래 날짜 (2026-09-22 사용자 요청 "업로드한 원우가 누군지").
          이름은 원우수첩의 지금 이름을 먼저 씁니다(이름을 고치면 따라옵니다). 명단에 없으면 올릴 때 적어 둔 이름.
          제목·본문은 같은 날 사용자 요청으로 사진 아래로 옮겼습니다(머리 → 사진 → 글).
          ★ 이름 왼쪽의 동그란 프로필 사진(36px)은 같은 날 사용자 요청으로 뺐고, 이름을 14 → 17 → 20px로 키웠습니다.
        */}
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            {/*
              이름 20px + 호칭 "원우" (2026-09-22 사용자 요청 — 17px에서 키우고 호칭을 붙임).
              → 18.5px (2026-09-25 사용자 "1.5px 줄여줘"). 뒷면도 같이. 호칭 "원우"(17px)는 그대로.
              호칭은 한 단 작고 옅게(17px·보통 굵기·ink-muted) 두어 이름이 먼저 읽힙니다.
              이름을 모를 때(authorName이 "원우")는 "원우 원우"가 되지 않게 호칭을 붙이지 않습니다.
            */}
            <p className="truncate text-[18.5px] font-bold text-ink">
              {authorName}
              {authorName !== "원우" ? (
                <span className="ml-1 text-[17px] font-medium text-ink-muted">원우</span>
              ) : null}
            </p>
            {/*
              날짜만 — "사진 N장"은 카드에 사진이 한 장뿐이라(2026-09-22) 뺐습니다.
              14px 먹색 — 2026-09-22 사용자 요청(12px 옅은 회색에서). 뒷면(AlbumCardBack)도 같게 맞춥니다.
            */}
            {date ? <p className="text-[14px] text-ink">{date}</p> : null}
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
              aria-label={`${album.title} 수정·지우기`}
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
            style={{ maxHeight: `calc(var(--card-max, var(--frame-h)) - ${textReserve}px)` }}
          />
        ) : (
          <span
            className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(to_bottom,#e7e5e4,#a8a29e)] text-[48px]"
            aria-hidden="true"
          >
            📷
          </span>
        )}
        {/* 사진 오른쪽 위 "3 / 10" 표시는 2026-09-22 사용자 요청으로 없앴습니다. */}
      </div>

      {/* 제목·본문 — 사진 아래 (2026-09-22 사용자 요청, 그 전엔 올린 사람 줄 바로 아래·사진 위). */}
      <div className="shrink-0 px-5 pt-3.5 pb-5">
        {/* 제목 18px — 2026-09-24 사용자 요청 "제목 글씨 사이즈 좀 줄여줘"(20px에서). 뒷면(AlbumCardBack)도 같게 맞춥니다. */}
        <h2 className="text-[18px] leading-snug font-bold break-keep text-ink [overflow-wrap:anywhere]">
          {album.title}
        </h2>
        {/* mt-1 — 제목과 본문 사이 4px (2026-09-25 사용자 "간격 좀 줄여줘", 8px에서). 뒷면도 같이. */}
        {body ? (
          <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line break-keep text-ink-soft">
            {body}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * 카드 뒷면 — 세부 설명 (2026-09-22 사용자 요청 "한 번 클릭하면 카드가 뒤집히면서 세부 설명이").
 *
 * 앞면에는 넉 줄까지만 보이는 본문을 여기서 전부 보여 줍니다. 위에 올린 원우·날짜, 그 아래 제목, 본문.
 * 크기는 앞면과 같아서(사진 비율로 정해진 높이), 본문이 길면 이 안에서 위아래로 굴려 읽습니다.
 * 맨 아래 작은 안내 "다시 누르면 앞면으로".
 */
function AlbumCardBack({ album, author }: { album: PhotoAlbumDoc; author: UserDoc | undefined }) {
  const date = album.eventDate ? dotDate(new Date(`${album.eventDate}T00:00:00`)) : "";
  const body = album.body?.trim();
  const authorName = author?.name || album.createdByName || "원우";

  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)]">
      {/* pt-3 — 앞면과 같게 (2026-09-25, 16px에서). */}
      <div className="shrink-0 px-5 pt-3">
        <p className="truncate text-[18.5px] font-bold text-ink">
          {authorName}
          {authorName !== "원우" ? (
            <span className="ml-1 text-[17px] font-medium text-ink-muted">원우</span>
          ) : null}
        </p>
        {/* 날짜 14px 먹색 — 앞면과 같게(2026-09-22). */}
        {date ? <p className="text-[14px] text-ink">{date}</p> : null}
        {/* 18px — 앞면 제목과 같게(2026-09-24, 20px에서). */}
        <h2 className="mt-4 text-[18px] leading-snug font-bold break-keep text-ink [overflow-wrap:anywhere]">
          {album.title}
        </h2>
      </div>

      {/* pt-1 — 제목과 본문 사이 4px, 앞면과 같게 (2026-09-25, 8px에서). */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-2">
        {body ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-line break-keep text-ink-soft">
            {body}
          </p>
        ) : (
          <p className="text-[14px] text-ink-faint">적힌 설명이 없어요.</p>
        )}
      </div>

      <p className="shrink-0 px-5 pt-2 pb-4 text-center text-[12px] text-ink-faint">
        다시 누르면 앞면으로
      </p>
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
  // 위쪽 회색 손잡이를 끌어내려 닫기 (2026-09-24 사용자 요청) — 다른 시트(SessionEditSheet 등)와 같은 손짓. 올리는 중엔 안 닫힘.
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(() => {
    if (!saving) onClose();
  });

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
          // 어느 주(화~월)에 올렸는지 — 원우 소식 칸이 이번 주 것만 먼저 보여주는 데 씁니다(lib/week.ts).
          weekId: currentWeekId(),
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
        saveErrorMessage(caught, editing ? "소식을 수정하지 못했어요." : "소식을 올리지 못했어요."),
      );
      setSaving(false);
      setProgress(null);
    }
  }

  const heading = editing ? "소식 수정" : "소식 올리기";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={saving ? undefined : onClose}
    >
      {/*
        흰 바탕(bg-surface) + 옅은 회색 칸(flatInputClassName, 사진 고르기 칸 bg-fill) + "취소"는 흰색에 회색 테두리
        (2026-09-23 사용자 요청 — 예전엔 회색 바탕에 흰 칸, 취소는 회색 칸).
      */}
      {/*
        회색 손잡이 (2026-09-24 사용자 요청 "이 창 상단에도 회색 조절 바"). 끌어내리면 닫힙니다.
        손잡이는 굴러가는 칸 밖에 따로 둡니다 — 이유는 MemberEditSheet의 같은 자리 설명. 그래서 바깥 상자가
        시트 모양을 맡고 form이 안에서 굴러갑니다. form의 pt-7(28px)은 손잡이 칸(12 + 6 + 8 = 26px)이 생겨
        pt-1로 줄였습니다 — 제목까지의 거리는 거의 같습니다.
      */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-surface sm:rounded-[16px]"
        style={sheetStyle}
      >
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-1 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7"
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
                  className={`flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-fill text-ink-muted ${
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
            className={flatInputClassName}
          />
        </div>

        <div className="mb-5">
          <FieldLabel htmlFor="album-date">날짜</FieldLabel>
          <input
            id="album-date"
            type="date"
            value={eventDate}
            onChange={(changed) => setEventDate(changed.target.value)}
            className={flatInputClassName}
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
            className={`${flatInputClassName} resize-none leading-relaxed`}
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
            className="shrink-0 rounded-2xl bg-surface px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted shadow-[var(--shadow-card-flat)] disabled:opacity-50"
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
      aria-label="소식 수정·지우기"
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
            {/* "고치기" → "수정" (2026-09-22 사용자 요청). 이어 뜨는 창 제목도 "소식 수정"으로 맞췄습니다. */}
            수정
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

/**
 * 지난 소식 — 이번 주 뒤로 접힌 지난 주들의 목록 (2026-09-24 사용자 요청).
 *
 * 주 목록(그 주의 날짜 범위 · 게시물 수)이 최근 순으로 서고, 한 주를 누르면 그 주 화면(/news/week/…)으로 갑니다.
 * (같은 날 처음엔 이 창 안에서 카드를 넘겨 보게 했다가, 링크로 보낼 주소가 필요해 화면으로 옮겼습니다.)
 */
function PastWeeksSheet({
  weekIds,
  albumsByWeek,
  onClose,
}: {
  /** 최근 주가 먼저 */
  weekIds: string[];
  albumsByWeek: Map<string, PhotoAlbumDoc[]>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="지난 소식"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[80dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
      >
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />
        <h2 className="mt-5 mb-1 text-[18px] font-bold text-ink">지난 소식</h2>

        <div className="mt-3 flex flex-col gap-2">
          {weekIds.map((weekId) => {
            const count = albumsByWeek.get(weekId)?.length ?? 0;
            return (
              <Link
                key={weekId}
                href={`/news/week/${weekId}`}
                className="flex w-full items-center justify-between rounded-2xl bg-fill px-5 py-4 text-left transition active:opacity-70"
              >
                <span className="text-[16px] font-bold text-ink">{weekRangeLabel(weekId)}</span>
                <span className="text-[14px] text-ink-muted">게시물 {count}개</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 text-[15px]! font-bold text-ink-soft"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
