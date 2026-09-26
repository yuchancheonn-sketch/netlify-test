"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { cropImageSquare } from "@/lib/image";

/** 가장 크게 당길 수 있는 배율 (정사각형에 꼭 맞는 크기의 몇 배까지) */
const MAX_ZOOM = 4;

/**
 * 보이는 모양. 모두 정사각형 틀의 한 변을 1로 본 비율입니다.
 *   zoom   1 = 사진의 짧은 변이 틀에 꼭 맞음, MAX_ZOOM까지
 *   x, y   사진 왼쪽 위 모서리의 틀 안 자리 (0 이하 — 틀 밖으로 비는 곳이 생기지 않게 가둡니다)
 * px이 아니라 비율로 두어 화면 크기·회전과 상관없이 같은 계산을 씁니다.
 */
interface View {
  zoom: number;
  x: number;
  y: number;
}

/** 사진이 틀을 늘 가득 채우도록 자리를 가둡니다. */
function clampView(view: View, width: number, height: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const shortSide = Math.min(width, height);
  const drawnWidth = (width / shortSide) * zoom;
  const drawnHeight = (height / shortSide) * zoom;
  return {
    zoom,
    x: Math.min(0, Math.max(1 - drawnWidth, view.x)),
    y: Math.min(0, Math.max(1 - drawnHeight, view.y)),
  };
}

/** 틀 안의 한 점(anchorX, anchorY)을 제자리에 두고 배율을 바꿉니다 — 두 손가락 가운데·막대는 틀 가운데. */
function zoomAround(view: View, nextZoom: number, anchorX: number, anchorY: number): View {
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
}

/**
 * 프로필 사진 편집 — 정사각형은 그대로, 어느 부분을 쓸지 원우가 고릅니다 (2026-09-27 사용자 요청).
 * 예전엔 사진 가운데를 자동으로 정사각형으로 잘랐습니다.
 *
 * - 한 손가락(마우스)으로 끌면 사진이 옮겨지고, 두 손가락으로 벌리거나 아래 막대로 크게·작게 합니다.
 *   컴퓨터에서는 마우스 휠로도 됩니다.
 * - 동그란 구멍 안이 프로필에 보이는 부분이고, 올라가는 사진은 그 둘레의 정사각형입니다
 *   (프로필 사진은 앱 어디서나 동그랗게 잘려 보입니다).
 * - "완료"를 누르면 고른 부분을 size×size로 잘라 onDone에 넘깁니다. 올리기는 부르는 쪽(ProfileForm)이 합니다.
 */
export default function PhotoCropSheet({
  src,
  size,
  onCancel,
  onDone,
}: {
  /** 고른 사진의 objectURL — 만들고 치우는 일은 부르는 쪽이 합니다 */
  src: string;
  /** 잘라 낸 사진의 한 변(px) */
  size: number;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  /** 화면에 닿아 있는 손가락들의 지금 자리 (pointerId → 좌표) */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
    setNatural({ width, height });
    // 처음엔 가운데 — 예전 자동 자르기와 같은 자리에서 시작합니다.
    const shortSide = Math.min(width, height);
    setView({ zoom: 1, x: (1 - width / shortSide) / 2, y: (1 - height / shortSide) / 2 });
  }

  function update(next: (previous: View) => View) {
    if (!natural) return;
    setView((previous) => clampView(next(previous), natural.width, natural.height));
  }

  /** 화면 좌표를 틀 안 비율 좌표로 */
  function toFrame(clientX: number, clientY: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: 0.5, y: 0.5, width: 1 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.width,
      width: rect.width,
    };
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };

    if (pointers.current.size === 1) {
      // 한 손가락 — 옮기기
      const { width } = toFrame(0, 0);
      const dx = (current.x - previous.x) / width;
      const dy = (current.y - previous.y) / width;
      update((view) => ({ ...view, x: view.x + dx, y: view.y + dy }));
    } else if (pointers.current.size === 2) {
      // 두 손가락 — 벌린 만큼 크게, 가운데가 움직인 만큼 옮기기
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(current.x - other.x, current.y - other.y);
        const midBefore = toFrame((previous.x + other.x) / 2, (previous.y + other.y) / 2);
        const midAfter = toFrame((current.x + other.x) / 2, (current.y + other.y) / 2);
        if (before > 0) {
          update((view) => {
            const zoomed = zoomAround(
              view,
              Math.min(MAX_ZOOM, Math.max(1, view.zoom * (after / before))),
              midBefore.x,
              midBefore.y,
            );
            return {
              ...zoomed,
              x: zoomed.x + (midAfter.x - midBefore.x),
              y: zoomed.y + (midAfter.y - midBefore.y),
            };
          });
        }
      }
    }
    pointers.current.set(event.pointerId, current);
  }

  function handlePointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
  }

  function handleWheel(event: React.WheelEvent) {
    const anchor = toFrame(event.clientX, event.clientY);
    update((view) =>
      zoomAround(
        view,
        Math.min(MAX_ZOOM, Math.max(1, view.zoom * Math.exp(-event.deltaY * 0.002))),
        anchor.x,
        anchor.y,
      ),
    );
  }

  async function handleDone() {
    const image = imageRef.current;
    if (!image || !natural || working) return;
    setWorking(true);
    setError(null);
    try {
      // 틀 한 변 = 원본 사진의 몇 픽셀인지
      const side = Math.min(natural.width, natural.height) / view.zoom;
      const blob = await cropImageSquare(image, -view.x * side, -view.y * side, side, size);
      onDone(blob);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message ? caught.message : "사진을 자르지 못했어요.",
      );
      setWorking(false);
    }
  }

  const shortSide = natural ? Math.min(natural.width, natural.height) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface text-ink"
      role="dialog"
      aria-modal="true"
      aria-label="프로필 사진 편집"
    >
      {/* 상단 바 — 사진 크게 보기(PhotoViewer)와 같은 자리·여백 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          className="rounded-full px-3 py-2 text-[15px] font-medium text-ink-soft active:bg-fill disabled:opacity-50"
        >
          취소
        </button>
        <span className="text-[16px] font-bold">사진 편집</span>
        <button
          type="button"
          onClick={handleDone}
          disabled={!natural || working}
          className="flex min-w-[52px] items-center justify-center rounded-full px-3 py-2 text-[15px] font-bold text-brand-500 active:bg-fill disabled:opacity-50"
        >
          {working ? <Spinner className="h-5 w-5" /> : "완료"}
        </button>
      </div>

      {/*
        가운데 정사각형 틀. 틀 밖으로 삐져나온 사진도 흐리게 보여 어디가 잘려 나가는지 알 수 있고,
        동그란 구멍 둘레의 큰 그림자가 그 흐린 막입니다. 바깥 상자의 overflow-hidden이 화면 밖을 자릅니다.
        ★ 색은 앱 테마를 따릅니다 (2026-09-27 사용자 "다크모드 아닐 때는 흰색 테마로") — 바탕 surface,
          막은 surface 72%. 밝은 화면에선 흰 바탕에 하얗게 흐린 막, 어두운 화면에선 예전처럼 어두운 막이 됩니다.
        touch-none — 손가락 움직임을 화면 스크롤·확대 대신 사진 편집에 씁니다.
      */}
      <div className="relative flex flex-1 touch-none items-center justify-center overflow-hidden px-6">
        <div
          ref={frameRef}
          className="relative aspect-square w-full max-w-[400px] cursor-grab select-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleLoad}
            className="pointer-events-none absolute max-w-none"
            style={
              natural
                ? {
                    left: `${view.x * 100}%`,
                    top: `${view.y * 100}%`,
                    width: `${(natural.width / shortSide) * view.zoom * 100}%`,
                    height: `${(natural.height / shortSide) * view.zoom * 100}%`,
                  }
                : { opacity: 0 }
            }
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-ink/25"
            style={{ boxShadow: "0 0 0 9999px color-mix(in srgb, var(--color-surface) 72%, transparent)" }}
          />
          {!natural ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="h-7 w-7" />
            </div>
          ) : null}
        </div>
      </div>

      {/* 아래 — 크기 막대와 안내 */}
      <div
        className="px-8 pt-4"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        {error ? (
          <p role="alert" className="mb-3 text-center text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-ink-muted" aria-hidden="true">
            작게
          </span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            disabled={!natural}
            aria-label="사진 크기"
            onChange={(event) => {
              const nextZoom = Number(event.target.value);
              update((previous) => zoomAround(previous, nextZoom, 0.5, 0.5));
            }}
            className="h-1 flex-1 accent-brand-500"
          />
          <span className="text-[13px] text-ink-muted" aria-hidden="true">
            크게
          </span>
        </div>
        <p className="mt-4 text-center text-[13px] text-ink-muted">
          끌어서 위치를, 두 손가락이나 막대로 크기를 맞춰 주세요
        </p>
      </div>
    </div>
  );
}
