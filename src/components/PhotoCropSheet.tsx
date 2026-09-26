"use client";

import { useRef, useState } from "react";
import { CheckIcon, XMarkIcon } from "@/components/icons";
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

/** 틀 안의 한 점(anchorX, anchorY)을 제자리에 두고 배율을 바꿉니다 — 두 손가락 가운데·휠을 굴린 자리. */
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
 * 짜임 — 사진 한 장만 편집합니다 (2026-09-27 사용자 요청 "고른 사진은 없애고 사진 편집만").
 * - 위: 닫기(X) · 제목 · 체크.
 * - 가운데: 정사각형 틀(화면 폭 가득, 남은 높이의 가운데). 한 손가락으로 끌어 옮기고, 두 손가락으로 벌려
 *   크게·작게. 컴퓨터는 휠. 3등분 기준선이 있고, 동그란 부분이 프로필에 보이는 곳입니다
 *   (올라가는 사진은 그 둘레의 정사각형).
 * - 오른쪽 위 체크를 누르면 고른 부분을 size×size로 잘라 onDone에 넘깁니다. 올리기는 ProfileForm이 합니다.
 * 지나온 모양(같은 날): 크기 막대·안내 문구 → 빼고 아래에 고른 사진 격자 → 격자도 뺌.
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
      {/* 상단 바 — 왼쪽 닫기(동그란 흰 단추), 가운데 제목, 오른쪽 체크(주황 동그라미) */}
      <div
        className="flex shrink-0 items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(10px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          aria-label="닫기"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)] transition active:scale-95 disabled:opacity-50"
        >
          <XMarkIcon className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <span className="text-[17px] font-bold">사진 편집</span>
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

      {/*
        정사각형 틀 — 화면 폭 가득, 남은 높이의 가운데. 동그라미 밖은 흐린 막(surface 72%)으로 덮습니다.
        색은 앱 테마를 따릅니다(2026-09-27 사용자 "다크모드 아닐 때는 흰색 테마로").
        touch-none — 손가락 움직임을 화면 스크롤·확대 대신 사진 편집에 씁니다.
        아래 여백은 위 제목 줄만큼(약 64px + 홈 바) 두어, 틀이 눈으로 볼 때 화면 가운데쯤 섭니다.
      */}
      <div
        className="mx-auto flex w-full max-w-[520px] flex-1 touch-none items-center overflow-hidden"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div
          ref={frameRef}
          className="relative aspect-square w-full cursor-grab overflow-hidden bg-fill select-none active:cursor-grabbing"
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
                    top: `${view.y * 100}%`,
                    width: `${(natural.width / shortSide) * view.zoom * 100}%`,
                    height: `${(natural.height / shortSide) * view.zoom * 100}%`,
                  }
                : { opacity: 0 }
            }
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 9999px color-mix(in srgb, var(--color-surface) 72%, transparent)" }}
          />
          {/*
            기준선 — 정사각형을 가로세로 3등분하는 얇은 흰 선 (2026-09-27 사용자 요청, 사진 앱 자르기 화면처럼).
            얼굴을 가운데 칸에 맞추기 쉽게 합니다. 사진 위에서 보이도록 흰색 반투명.
          */}
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
