"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { downloadUrl, viewerUrl } from "@/lib/cloudinary";
import type { PhotoDoc } from "@/lib/types";

/**
 * 사진을 눌렀을 때 뜨는 전체화면 뷰어.
 * 좌우로 밀거나(모바일), 화살표 키·버튼(데스크톱)으로 넘길 수 있습니다.
 */
export default function PhotoViewer({
  photos,
  startIndex,
  onClose,
  onDelete,
  canDelete,
}: {
  photos: PhotoDoc[];
  startIndex: number;
  onClose: () => void;
  /** 사진 지우기. 본인이 올린 사진과 운영진에게만 보입니다. */
  onDelete?: (photoId: string) => void;
  canDelete?: (photo: PhotoDoc) => boolean;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const photo = photos[index];

  const goPrevious = useCallback(() => {
    setIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => (current < photos.length - 1 ? current + 1 : current));
  }, [photos.length]);

  // 키보드로도 넘기고 닫을 수 있게 합니다.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrevious, goNext]);

  // 뷰어가 떠 있는 동안에는 뒤쪽 목록이 같이 스크롤되지 않게 막습니다.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        // 살짝 스친 것과 넘기려는 동작을 구분하려고 최소 이동 거리를 둡니다.
        if (delta > 60) goPrevious();
        else if (delta < -60) goNext();
        touchStartX.current = null;
      }}
    >
      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[26px] leading-none active:bg-white/15"
        >
          ×
        </button>
        <span className="text-[14px] font-medium text-white/80">
          {index + 1} / {photos.length}
        </span>
        <a
          href={downloadUrl(photo.imageUrl)}
          className="rounded-full px-3 py-2 text-[14px] font-bold text-white active:bg-white/15"
        >
          저장
        </a>
      </div>

      {/* 사진 */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={viewerUrl(photo.imageUrl)}
          alt={photo.caption || `${index + 1}번째 사진`}
          className="max-h-full max-w-full object-contain"
        />

        {index > 0 ? (
          <button
            type="button"
            onClick={goPrevious}
            aria-label="이전 사진"
            className="absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white sm:flex"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 사진"
            className="absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white sm:flex"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      {/* 하단 정보 */}
      <div
        className="px-5 py-4 text-center"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        {photo.caption ? (
          <p className="mb-1 text-[15px] text-white">{photo.caption}</p>
        ) : null}
        <p className="text-[13px] text-white/60">{photo.uploadedByNickname} 올림</p>

        {onDelete && canDelete?.(photo) ? (
          <button
            type="button"
            onClick={() => onDelete(photo.id)}
            className="mt-3 rounded-full px-4 py-2 text-[13px] font-bold text-red-400 active:bg-white/10"
          >
            이 사진 지우기
          </button>
        ) : null}
      </div>
    </div>
  );
}
