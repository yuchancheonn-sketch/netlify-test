"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
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
import { db } from "@/lib/firebase";
import { thumbnailUrl } from "@/lib/cloudinary";
import { formatDotDate, todayString } from "@/lib/format";
import { useAlbums } from "@/lib/hooks";

/**
 * 자료 탭 — "복습 영상"과 "행사 사진"을 서브탭으로 묶습니다.
 * 복습 영상 목록은 다음 단계에서 채웁니다.
 */
const SUBTABS = [
  { value: "videos", label: "복습 영상" },
  { value: "photos", label: "행사 사진" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function LibraryPage() {
  const [subtab, setSubtab] = useState<Subtab>("photos");

  return (
    <>
      <PageHeader title="자료" right={<ProfileAvatarButton />} />

      <div className="px-5 pb-8">
        <div className="flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {SUBTABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtab(value)}
              aria-pressed={subtab === value}
              className={`flex-1 rounded-full py-2.5 text-[14px] font-bold transition ${
                subtab === value ? "bg-brand-500 text-white" : "text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {subtab === "videos" ? (
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<span className="text-[40px]">🎬</span>}
                title="복습 영상은 곧 열려요"
                description="회차별 수업 영상을 운영진이 올리면 여기에서 다시 볼 수 있어요."
              />
            </div>
          ) : (
            <AlbumList />
          )}
        </div>
      </div>
    </>
  );
}

/** 행사(앨범) 목록 */
function AlbumList() {
  const { isAdmin } = useAuth();
  const { data: albums, loading, error } = useAlbums();
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <ul className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-[4/3] rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {albums.length === 0 ? (
        <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📸</span>}
            title="아직 앨범이 없어요"
            description={
              isAdmin
                ? "아래 '앨범 만들기'로 첫 행사 앨범을 만들어 보세요."
                : "운영진이 행사 앨범을 만들면 여기에 표시됩니다."
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/albums/${album.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition active:scale-[0.98]"
              >
                <div className="aspect-[4/3] w-full bg-brand-50">
                  {album.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl(album.coverImageUrl, 500)}
                      alt={`${album.title} 대표 사진`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center text-[32px]"
                      aria-hidden="true"
                    >
                      📷
                    </span>
                  )}
                </div>
                <div className="px-3.5 py-3">
                  <p className="truncate text-[15px] font-bold text-ink">{album.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    {formatDotDate(album.eventDate)} · {album.photoCount ?? 0}장
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 앨범 만들기는 운영진만 */}
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-4 text-[15px] font-bold text-brand-700 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          <PlusIcon className="h-5 w-5" />
          앨범 만들기
        </button>
      ) : null}

      {creating ? <AlbumCreateSheet onClose={() => setCreating(false)} /> : null}
    </>
  );
}

/** 새 행사 앨범을 만드는 바텀시트 */
function AlbumCreateSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
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
    try {
      await addDoc(collection(db, "photoAlbums"), {
        title: title.trim(),
        eventDate,
        coverImageUrl: null,
        photoCount: 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch {
      setError("앨범을 만들지 못했어요. 운영진 권한인지 확인해 주세요.");
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
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[28px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-7"
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
            placeholder="예: 10기 수료식"
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
            className="rounded-2xl bg-stone-100 px-6 py-4 text-[15px] font-bold text-ink-muted"
          >
            취소
          </button>
          <PrimaryButton type="submit" loading={saving}>
            만들기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
