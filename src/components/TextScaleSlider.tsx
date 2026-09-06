"use client";

import { useRef, useState } from "react";
import { TEXT_SCALES, type TextScale } from "@/lib/display-settings";

/**
 * 글씨 크기 슬라이더 — 아이폰 제어센터의 "가 —○— 가" 와 같은 방식입니다.
 *
 * 왼쪽 끝이 작게, 오른쪽 끝이 크게이고 가운데가 보통입니다. 알약을 끌거나
 * 막대 아무 곳이나 눌러 옮길 수 있고, 세 자리 중 가까운 쪽에 딱 붙습니다.
 *
 * 단계 수는 TEXT_SCALES 길이를 그대로 따릅니다. 나중에 네 단계로 늘리면
 * 눈금과 알약 자리는 저절로 따라옵니다.
 */

/** 알약의 가로 길이(px). 자리 계산이 전부 이 값에 걸려 있습니다. */
const THUMB = 34;

const LAST = TEXT_SCALES.length - 1;

/** 단계 번호를 막대 위의 비율(0~100)로 */
function percentOf(index: number): number {
  return (index / LAST) * 100;
}

/**
 * 그 비율에서 알약 왼쪽 끝이 놓일 자리.
 *
 * 그냥 left:50% 로 두면 양 끝에서 알약이 막대 밖으로 반쯤 삐져나갑니다.
 * 비율만큼 알약 길이를 덜어내면, 0%에서는 왼쪽 끝에 딱 붙고 100%에서는
 * 오른쪽 끝에 딱 붙습니다.
 */
function thumbLeft(percent: number): string {
  return `calc(${percent}% - ${(percent / 100) * THUMB}px)`;
}

/** 알약 한가운데까지의 거리 — 채워진 막대와 눈금이 이 자리를 씁니다. */
function centerLeft(percent: number): string {
  return `calc(${percent}% - ${(percent / 100) * THUMB}px + ${THUMB / 2}px)`;
}

export default function TextScaleSlider({
  value,
  onChange,
}: {
  value: TextScale;
  onChange: (next: TextScale) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  /*
   * 잡는 순간의 막대 크기를 적어 둡니다.
   *
   * ★ 이걸 안 하면 끄는 도중에 값이 튑니다.
   *   글씨 크기는 :root에 zoom을 걸어 화면 전체를 확대·축소하는 방식이라,
   *   단계가 바뀌는 순간 이 슬라이더 자신의 폭도 함께 달라집니다. 그때마다
   *   다시 재면 손가락은 그대로인데 계산된 비율만 바뀌어, 알약이 제멋대로
   *   한 칸 더 가거나 되돌아옵니다.
   */
  const grabbed = useRef<{ left: number; width: number } | null>(null);

  const index = Math.max(
    0,
    TEXT_SCALES.findIndex((scale) => scale.value === value),
  );
  const percent = percentOf(index);
  const current = TEXT_SCALES[index];

  /** 손가락(또는 마우스) 가로 위치를 가장 가까운 단계로 */
  function stopAt(clientX: number): TextScale {
    const box = grabbed.current;
    if (!box || box.width <= THUMB) return value;
    // 알약이 움직일 수 있는 구간은 양쪽으로 알약 반 길이씩 좁습니다.
    const ratio = (clientX - box.left - THUMB / 2) / (box.width - THUMB);
    const stop = Math.round(Math.min(1, Math.max(0, ratio)) * LAST);
    return TEXT_SCALES[stop].value;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const element = trackRef.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    grabbed.current = { left: box.left, width: box.width };

    // 끌던 손가락이 막대 밖으로 나가도 계속 따라오게 붙잡아 둡니다.
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);

    const next = stopAt(event.clientX);
    if (next !== value) onChange(next);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const next = stopAt(event.clientX);
    if (next !== value) onChange(next);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    grabbed.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /** 화살표 키로도 옮길 수 있게 합니다. */
  function handleKeyDown(event: React.KeyboardEvent) {
    const move =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 1
          : event.key === "Home"
            ? -LAST
            : event.key === "End"
              ? LAST
              : 0;
    if (!move) return;
    event.preventDefault();
    const next = Math.min(LAST, Math.max(0, index + move));
    if (next !== index) onChange(TEXT_SCALES[next].value);
  }

  return (
    /*
     * 아래 두 줄(라이트/다크 모드 고르기)과 같은 흰 카드 위에 얹습니다.
     * 좌우의 "가"는 크기만 다른 같은 글자라, 이 슬라이더가 무엇을 바꾸는지
     * 따로 설명하지 않아도 보입니다.
     */
    <div className="flex items-center gap-4 rounded-2xl bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
      {/*
        양 끝 글자는 폭을 못 박아 둡니다. 안 그러면 글씨 크기를 바꿀 때마다
        (zoom이 걸리므로) 이 글자들의 폭도 달라져 막대 길이가 흔들립니다.
      */}
      <span
        aria-hidden="true"
        className="w-5 shrink-0 text-center text-[15px] font-bold text-ink-soft"
      >
        가
      </span>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="글씨 크기"
        aria-valuemin={0}
        aria-valuemax={LAST}
        aria-valuenow={index}
        aria-valuetext={current.label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        /* 세로 스크롤은 브라우저에 맡기고, 가로는 알약 끌기에 씁니다. */
        style={{ touchAction: "pan-y" }}
        /*
          높이 36px은 손가락이 닿는 넓이입니다. 막대(6px)만큼만 두면 누르기
          어렵습니다. 안의 네 겹은 이 높이 안에서 자리를 나눠 갖습니다.
            막대  13~19   (한가운데 16)
            알약   4~28   (막대 한가운데에 맞춰 세움)
            눈금  30~34   (알약 아래 — 겹치면 지저분해집니다)
        */
        className="relative h-9 flex-1 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      >
        {/* 바탕 막대 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[13px] h-1.5 rounded-full bg-fill"
        />

        {/* 지나온 만큼 주황으로 채웁니다. */}
        <div
          aria-hidden="true"
          className="absolute top-[13px] left-0 h-1.5 rounded-full bg-brand-500"
          style={{ width: centerLeft(percent) }}
        />

        {/*
          단계마다 찍는 눈금. 알약 아래에 두어 가리지 않게 합니다.
          몇 자리에 설 수 있는지 눈으로 셀 수 있어야, 끌기 전에도 세 단계임을 압니다.
        */}
        {TEXT_SCALES.map((scale, tick) => (
          <span
            key={scale.value}
            aria-hidden="true"
            className="absolute top-[30px] h-1 w-1 -translate-x-1/2 rounded-full bg-ink-faint"
            style={{ left: centerLeft(percentOf(tick)) }}
          />
        ))}

        {/* 흰 알약. 끌지 않을 때만 부드럽게 움직입니다. */}
        <div
          aria-hidden="true"
          className="absolute top-1 h-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.06)]"
          style={{
            width: THUMB,
            left: thumbLeft(percent),
            transition: dragging ? undefined : "left 160ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      <span
        aria-hidden="true"
        className="w-7 shrink-0 text-center text-[24px] font-bold text-ink-soft"
      >
        가
      </span>
    </div>
  );
}
