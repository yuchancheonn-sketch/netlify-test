"use client";

import { useRef, useState } from "react";
import { CheckIcon, XMarkIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { cropImageRect } from "@/lib/image";

/**
 * 사진 편집 — 한 손가락으로 끌어 옮기고 두 손가락(또는 컴퓨터 휠)으로 확대·축소해, 정해진 비율의 틀 안에 원하는 부분을 담습니다.
 * 2026-10-06: 정사각형(프로필)뿐 아니라 aspect(가로÷세로)를 받아 4:5 같은 틀로도 씁니다 — 뉴웨이브앱 삶나눔 사진 편집을 옮김(원우소식 올리기).
 * 안 넘기면 예전처럼 정사각형·동그라미(프로필)입니다.
 */

/** 가장 크게 당길 수 있는 배율 (정사각형에 꼭 맞는 크기의 몇 배까지) */
const MAX_ZOOM = 4;

/**
 * 보이는 모양. 모두 틀의 가로 폭을 1로 본 비율입니다(틀의 세로는 1/aspect).
 *   zoom   1 = 사진이 틀을 꼭 덮는 가장 작은 크기(cover), MAX_ZOOM까지
 *   x, y   사진 왼쪽 위 모서리의 틀 안 자리 (0 이하 — 틀 밖으로 비는 곳이 생기지 않게 가둡니다)
 */
interface View {
  zoom: number;
  x: number;
  y: number;
}

/** zoom 1일 때 사진이 그려지는 가로 폭(틀 폭 = 1) — 틀을 빈틈없이 덮는 크기 */
function baseWidth(width: number, height: number, aspect: number) {
  return Math.max(1, width / height / aspect);
}

function clampView(view: View, width: number, height: number, aspect: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const drawnWidth = baseWidth(width, height, aspect) * zoom;
  const drawnHeight = (drawnWidth * height) / width;
  return {
    zoom,
    x: Math.min(0, Math.max(1 - drawnWidth, view.x)),
    y: Math.min(0, Math.max(1 / aspect - drawnHeight, view.y)),
  };
}

/** 틀 안의 한 점(anchorX, anchorY)을 제자리에 두고 배율을 바꿉니다 — 두 손가락 가운데·휠을 굴린 자리. */
function zoomAround(view: View, nextZoom: number, anchorX: number, anchorY: number): View {
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
}

export default function PhotoCropSheet({
  src,
  size,
  aspect = 1,
  shape = "circle",
  title = "프로필 사진 편집",
  onCancel,
  onDone,
}: {
  /** 고른 사진의 objectURL — 만들고 치우는 일은 부르는 쪽이 합니다 */
  src: string;
  /** 잘라 낸 사진의 가로(px) — 세로는 가로 ÷ aspect */
  size: number;
  /** 틀의 가로÷세로. 1이면 정사각형(프로필), 0.8이면 4:5(삶나눔) */
  aspect?: number;
  /** 틀 모양 — circle은 동그라미로 비춰 보여 주고, rect는 틀 전체를 그대로 */
  shape?: "circle" | "rect";
  title?: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
    setNatural({ width, height });
    const drawnWidth = baseWidth(width, height, aspect);
    const drawnHeight = (drawnWidth * height) / width;
    setView({ zoom: 1, x: (1 - drawnWidth) / 2, y: (1 / aspect - drawnHeight) / 2 });
  }

  function update(next: (previous: View) => View) {
    if (!natural) return;
    setView((previous) => clampView(next(previous), natural.width, natural.height, aspect));
  }

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
      const { width } = toFrame(0, 0);
      const dx = (current.x - previous.x) / width;
      const dy = (current.y - previous.y) / width;
      update((view) => ({ ...view, x: view.x + dx, y: view.y + dy }));
    } else if (pointers.current.size === 2) {
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
      // 틀 가로 1 = 원본 가로 natural.width ÷ drawnWidth 픽셀
      const drawnWidth = baseWidth(natural.width, natural.height, aspect) * view.zoom;
      const unit = natural.width / drawnWidth;
      const blob = await cropImageRect(image, -view.x * unit, -view.y * unit, unit, unit / aspect, size, Math.round(size / aspect));
      onDone(blob);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "사진을 자르지 못했어요.");
      setWorking(false);
    }
  }

  const drawnWidth = natural ? baseWidth(natural.width, natural.height, aspect) * view.zoom : 1;
  const drawnHeight = natural ? (drawnWidth * natural.height) / natural.width : 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface text-ink" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-3" style={{ paddingTop: "calc(10px + env(safe-area-inset-top))" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          aria-label="닫기"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)] transition active:scale-95 disabled:opacity-50"
        >
          <XMarkIcon className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <span className="text-[17px] font-bold">{title === "프로필 사진 편집" ? "사진 편집" : title}</span>
        <button
          type="button"
          onClick={handleDone}
          disabled={!natural || working}
          aria-label="이 사진으로 하기"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white shadow-[var(--shadow-float)] transition active:scale-95 disabled:opacity-50"
        >
          {working ? <Spinner className="h-5 w-5" /> : <CheckIcon className="h-6 w-6" />}
        </button>
      </div>

      <div
        className="mx-auto flex w-full max-w-[520px] flex-1 touch-none items-center overflow-hidden"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div
          ref={frameRef}
          className="relative mx-auto cursor-grab overflow-hidden bg-fill select-none active:cursor-grabbing"
          style={{ aspectRatio: String(aspect), width: `min(100%, calc((100dvh - 190px) * ${aspect}))` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            key={src}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleLoad}
            className="pointer-events-none absolute max-w-none"
            style={
              natural
                ? {
                    left: `${view.x * 100}%`,
                    top: `${view.y * aspect * 100}%`,
                    width: `${drawnWidth * 100}%`,
                    height: `${drawnHeight * aspect * 100}%`,
                  }
                : { opacity: 0 }
            }
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${shape === "circle" ? "rounded-full" : ""}`}
            style={{ boxShadow: "0 0 0 9999px color-mix(in srgb, var(--color-surface) 72%, transparent)" }}
          />
          {natural ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/60" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/60" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/60" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/60" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="h-7 w-7" />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="shrink-0 px-5 pt-3 text-center text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
