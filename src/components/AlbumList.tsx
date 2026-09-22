"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
import { thumbnailUrl } from "@/lib/cloudinary";
import { todayString } from "@/lib/format";
import { useAlbums } from "@/lib/hooks";

/**
 * 행사(앨범) 목록 — 소식 탭의 "행사 사진" 칸.
 *
 * (2026-09-22 사용자 요청으로 자료 탭에서 소식 탭으로 옮기며 이 파일로 떼어 냈습니다.
 *  자리를 맞바꾼 복습 영상은 components/VideoList.tsx.)
 *
 * 오른쪽 아래에 떠 있는 "앨범 만들기" 알약이 마지막 줄을 가리지 않도록,
 * 이 목록을 담는 상자는 밑을 pb-24만큼 비워야 합니다(셈법은 news/page.tsx 주석).
 */
export default function AlbumList() {
  const { data: allAlbums, loading, error } = useAlbums();
  /** 보고 있는 기수의 앨범만. 만들 때도 이 기수로 적습니다. */
  const { cohort } = useViewCohort();
  const albums = allAlbums.filter((album) => inCohort(album, cohort));
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <ul className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-square rounded-[20px]" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {albums.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📸</span>}
            title="아직 앨범이 없어요"
            description="아래 '앨범 만들기'로 첫 행사 앨범을 만들어 보세요."
          />
        </div>
      ) : (
        /*
          앨범 칸 — 아이폰 사진 앱 "고정됨" 모음 모양 (2026-09-14, 사용자가 보여 준 화면을 따름).
          정사각형 칸을 대표 사진이 가득 채우고, 아래쪽만 어둡게 번지는 막 위에
          흰 굵은 제목을 왼쪽 아래에 얹습니다. 칸 아래에 따로 있던 흰 글씨 상자
          (제목 + 날짜 · N장)는 걷었습니다 — 그림에 제목 말고는 글이 없어서입니다.

          - aspect-square: 예전 4:3 → 정사각형. 그림의 칸이 정사각형입니다.
          - rounded-[20px]: 그림의 둥글기. 앱의 다른 카드(12~16px)보다 둥급니다.
          - shadow-card-glow: 헤어라인 없는 옅은 그림자만. 사진이 칸 끝까지 차므로
            회색 테두리를 두르면 사진 가장자리에 선이 낍니다.
          - 제목은 **자르지 않습니다** (2026-09-14 사용자 요청). 처음엔 17px 한 줄 + 말줄임(…)이었는데
            긴 행사 이름이 잘려서, 15px로 줄이고 필요한 만큼 여러 줄로 접습니다(보통 두 줄 안).
            break-keep으로 낱말 중간에서 끊지 않고, 낱말 하나가 칸보다 길 때만 글자 사이에서 넘깁니다.
            줄 수를 묶는 line-clamp는 일부러 안 겁니다 — 걸면 세 줄째부터 다시 잘립니다.
            제목은 bottom-3에 붙어 있어 줄이 늘면 위로 자랍니다.
          - 어두운 막: 아래에서 위로 60% 높이까지 검정 60% → 0. 제목이 두세 줄로 위로
            자라도 흰 글씨 뒤가 어둡도록 처음(45%·55%)보다 넓고 조금 짙게 했습니다.
            사진 윗부분은 어둡게 하지 않습니다.
          - 대표 사진이 없는 앨범은 그림의 "최근 삭제된 항목"처럼 위는 옅고 아래로
            짙어지는 회색 칸에 📷을 가운데 둡니다. 흰 제목이 앉을 아래쪽이 짙어야 해서
            단색 fill이 아니라 흐름(gradient)입니다.
        */
        <ul className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/albums/${album.id}`}
                className="relative block aspect-square overflow-hidden rounded-[20px] bg-[linear-gradient(to_bottom,#e7e5e4,#a8a29e)] shadow-[var(--shadow-card-glow)] transition active:scale-[0.98]"
              >
                {album.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl(album.coverImageUrl, 500)}
                    alt={`${album.title} 대표 사진`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-[36px]"
                    aria-hidden="true"
                  >
                    📷
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),rgba(0,0,0,0)_60%)]"
                />
                <p className="absolute right-3 bottom-3 left-3.5 text-[15px] leading-snug font-bold break-keep text-white [overflow-wrap:anywhere]">
                  {album.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/*
        앨범 만들기 — 자료 탭 "파일 올리기"와 같은 자리·같은 모양의 떠 있는 주황 알약입니다 (2026-09-14).
        bottom의 92px는 하단 탭 알약 위로 올리는 높이입니다.

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
        앨범 만들기
      </button>

      {creating ? <AlbumCreateSheet onClose={() => setCreating(false)} /> : null}
    </>
  );
}

/** 새 행사 앨범을 만드는 바텀시트 */
function AlbumCreateSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  /** 새 앨범이 올라갈 기수 — 운영진이 제목 옆에서 고른 기수입니다. */
  const { cohort } = useViewCohort();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayString());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    if (!title.trim()) {
      setError("행사 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    // 응답을 잠깐만 기다리고 창을 닫습니다 — 이유는 lib/firestore-commit.ts에.
    try {
      await commitWrite(
        addDoc(collection(db, "photoAlbums"), {
          title: title.trim(),
          eventDate,
          coverImageUrl: null,
          photoCount: 0,
          cohort,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        }),
      );
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "앨범을 만들지 못했어요."));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="새 앨범 만들기"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">새 앨범 만들기</h2>

        <div className="mb-5">
          <FieldLabel htmlFor="album-title">행사 이름</FieldLabel>
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

        <div className="mb-6">
          <FieldLabel htmlFor="album-date">행사 날짜</FieldLabel>
          <input
            id="album-date"
            type="date"
            value={eventDate}
            onChange={(changed) => setEventDate(changed.target.value)}
            className={inputClassName}
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
            만들기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
