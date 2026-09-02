"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import PageHeader from "@/components/PageHeader";
import PhotoViewer from "@/components/PhotoViewer";
import { ErrorState, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { isCloudinaryConfigured, thumbnailUrl, uploadImage } from "@/lib/cloudinary";
import { resizeImage } from "@/lib/image";
import { formatDotDate } from "@/lib/format";
import { useAlbum, useAlbumPhotos } from "@/lib/hooks";
import { PHOTO_MAX_DIMENSION } from "@/lib/constants";

export default function AlbumPage() {
  const params = useParams<{ albumId: string }>();
  const albumId = params.albumId;
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();

  const { album, loading, notFound } = useAlbum(albumId);
  const photos = useAlbumPhotos(albumId);

  /** 참고 디자인처럼 원본을 그대로 올릴지 고를 수 있게 합니다. */
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || !user) return;

    setUploading({ done: 0, total: files.length });
    setUploadError(null);

    let firstUrl: string | null = null;
    let succeeded = 0;

    for (const [position, file] of files.entries()) {
      try {
        // 원본을 끄면 긴 변을 줄여서 올립니다. 용량과 로딩 속도가 크게 달라집니다.
        const payload = keepOriginal ? file : await resizeImage(file, PHOTO_MAX_DIMENSION);
        const uploaded = await uploadImage(payload, file.name);

        await addDoc(collection(db, "photoAlbums", albumId, "photos"), {
          imageUrl: uploaded.url,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          caption: "",
          uploadedBy: user.uid,
          uploadedByNickname: profile?.nickname || profile?.name || "원우",
          uploadedAt: serverTimestamp(),
          likes: [],
        });

        if (!firstUrl) firstUrl = uploaded.url;
        succeeded += 1;
      } catch (caught) {
        setUploadError(
          caught instanceof Error
            ? `${file.name}: ${caught.message}`
            : "사진을 올리지 못했어요.",
        );
      } finally {
        setUploading({ done: position + 1, total: files.length });
      }
    }

    // 대표 이미지가 없으면 이번에 올린 첫 사진으로 채웁니다.
    if (succeeded > 0) {
      try {
        await updateDoc(doc(db, "photoAlbums", albumId), {
          photoCount: increment(succeeded),
          ...(album?.coverImageUrl ? {} : { coverImageUrl: firstUrl }),
        });
      } catch {
        // 대표 이미지 갱신은 실패해도 사진 자체는 이미 올라갔으므로 넘어갑니다.
      }
    }

    setUploading(null);
  }

  async function handleDeletePhoto(photoId: string) {
    if (!window.confirm("이 사진을 앨범에서 지울까요?")) return;
    try {
      await deleteDoc(doc(db, "photoAlbums", albumId, "photos", photoId));
      await updateDoc(doc(db, "photoAlbums", albumId), { photoCount: increment(-1) });
      setViewerIndex(null);
    } catch {
      setUploadError("사진을 지우지 못했어요.");
    }
  }

  async function handleDeleteAlbum() {
    if (
      !window.confirm(
        "앨범을 통째로 지울까요?\n앨범 안의 사진 목록도 함께 사라집니다. 되돌릴 수 없어요.",
      )
    ) {
      return;
    }
    try {
      // 사진 문서를 먼저 지우고 앨범을 지웁니다.
      await Promise.all(
        photos.data.map((photo) =>
          deleteDoc(doc(db, "photoAlbums", albumId, "photos", photo.id)),
        ),
      );
      await deleteDoc(doc(db, "photoAlbums", albumId));
      router.replace("/library");
    } catch {
      setUploadError("앨범을 지우지 못했어요.");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="앨범" back />
        <div className="grid grid-cols-3 gap-1.5 px-5">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="aspect-square rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  if (notFound || !album) {
    return (
      <>
        <PageHeader title="앨범" back />
        <ErrorState message="앨범을 찾을 수 없어요. 삭제되었을 수 있습니다." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={album.title}
        eyebrow={`${formatDotDate(album.eventDate)} · 사진 ${photos.data.length}장`}
        back
      />

      <div className="px-5 pb-8">
        {/* 원본 그대로 올리기 토글 */}
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="min-w-0">
            <span className="block text-[16px] font-bold text-ink">원본 그대로 올리기</span>
            <span className="block text-[13px] text-ink-faint">
              끄면 긴 변 {PHOTO_MAX_DIMENSION}px으로 줄여서 올립니다
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              checked={keepOriginal}
              onChange={(event) => setKeepOriginal(event.target.checked)}
              className="peer sr-only"
            />
            <span className="block h-8 w-14 rounded-full bg-stone-200 transition peer-checked:bg-brand-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
            <span className="pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-6" />
          </span>
        </label>

        {/* 업로드 진행 상황 */}
        {uploading ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-card)]">
            <Spinner className="h-5 w-5 text-brand-600" />
            <span className="text-[14px] font-bold text-ink">
              올리는 중 {uploading.done}/{uploading.total}
            </span>
          </div>
        ) : null}

        {uploadError ? (
          <p role="alert" className="mt-3 text-[13px] font-medium text-red-600">
            {uploadError}
          </p>
        ) : null}

        {!isCloudinaryConfigured ? (
          <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-800">
            사진 보관소(Cloudinary) 설정이 아직 안 되어 있어요. README의 &ldquo;행사 사진
            보관소 연결하기&rdquo;를 참고해 주세요.
          </p>
        ) : null}

        {/* 사진 그리드 */}
        <div className="mt-5">
          {photos.loading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <Skeleton key={key} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : photos.error ? (
            <ErrorState message={photos.error} />
          ) : photos.data.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
              <p className="text-[40px]" aria-hidden="true">
                📸
              </p>
              <p className="mt-2 text-[15px] font-bold text-ink-soft">
                아직 사진이 없어요
              </p>
              <p className="mt-1 text-[13px] text-ink-faint">
                아래 &lsquo;사진 올리기&rsquo;로 그날의 기록을 남겨보세요
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5">
              {photos.data.map((photo, position) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setViewerIndex(position)}
                    className="block w-full overflow-hidden rounded-xl bg-stone-100 transition active:scale-[0.98]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailUrl(photo.imageUrl)}
                      alt={photo.caption || `${album.title} 사진`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={handleDeleteAlbum}
            className="mt-8 w-full rounded-2xl bg-white py-3.5 text-[14px] font-bold text-red-600 shadow-[var(--shadow-card)]"
          >
            앨범 삭제하기
          </button>
        ) : null}
      </div>

      {/* 사진 올리기 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePickFiles}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={Boolean(uploading) || !isCloudinaryConfigured}
        className="fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95 disabled:opacity-60"
      >
        <PhotoPlusIcon />
        사진 올리기
      </button>

      {viewerIndex !== null ? (
        <PhotoViewer
          photos={photos.data}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={
            // 본인이 올린 사진과 운영진만 지울 수 있습니다.
            (photoId) => handleDeletePhoto(photoId)
          }
          canDelete={(photo) => photo.uploadedBy === user?.uid || isAdmin}
        />
      ) : null}
    </>
  );
}

/** 사진 추가 아이콘 (이 화면에서만 쓰여서 여기에 둡니다) */
function PhotoPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M20.5 13.5V7.4a1.9 1.9 0 0 0-1.9-1.9H5.4a1.9 1.9 0 0 0-1.9 1.9v9.2a1.9 1.9 0 0 0 1.9 1.9h8.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m3.8 15.6 3.6-3.3a1.6 1.6 0 0 1 2.2 0l3.5 3.3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 16v5M15.5 18.5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
