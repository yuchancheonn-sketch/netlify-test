"use client";

import type { ReactNode } from "react";

/**
 * 상자 하나 안에서 주황 상자가 고른 칸으로 미끄러지는 고르개.
 *
 * 설정 화면의 세 줄(알림 · 글씨 크기 · 화면)이 이걸 함께 씁니다.
 * 세 벌로 따로 적어두면 한쪽만 다듬어져 줄마다 모양이 어긋나기 마련입니다.
 *
 * 고른 칸에 체크 표시는 두지 않습니다. 주황 상자가 이미 그 일을 하고,
 * 아이콘까지 넣으면 "라이트 모드"처럼 긴 글씨가 두 줄로 접힙니다.
 */

/** 바깥 상자와 주황 상자 사이에 두는 간격(px). 사방 모두 이 값입니다. */
const PADDING = 4;

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** 칸마다 글씨 크기를 달리하고 싶을 때 (글씨 크기 줄이 미리보기로 씁니다) */
  textClassName?: string;
  /** 글씨 앞에 붙는 것 — 지금은 알림 줄의 스피너뿐입니다. */
  icon?: ReactNode;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  /*
   * 칸 하나의 폭을 CSS로 적습니다.
   * 바깥 상자의 좌우 여백(PADDING씩)을 뺀 나머지를 칸 수로 나눕니다.
   * 픽셀로 재지 않고 calc에 맡기는 이유: 글씨 크기를 바꾸면 zoom이 걸려
   * 상자 폭 자체가 달라지는데, CSS로 두면 다시 잴 필요가 없습니다.
   */
  const slot = `((100% - ${PADDING * 2}px) / ${options.length})`;

  return (
    <div
      className={`relative flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-card)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {/*
        고른 칸 위로 미끄러지는 주황 상자.

        칸(버튼)보다 아래에 깔립니다. 그래야 상자가 지나가는 동안 글씨가
        덮이지 않고 그대로 읽힙니다. 움직임은 left에만 겁니다 —
        폭은 늘 같아서 흔들릴 것이 없습니다.
      */}
      <div
        aria-hidden="true"
        className="absolute top-1 bottom-1 rounded-xl bg-brand-500"
        style={{
          left: `calc(${PADDING}px + ${index} * ${slot})`,
          width: `calc(${slot})`,
          transition: "left 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={selected}
            /*
             * relative로 주황 상자보다 위에 세웁니다. 바탕색은 주지 않습니다 —
             * 칠하면 뒤에서 미끄러져 오는 주황 상자를 가려 버립니다.
             */
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 font-bold whitespace-nowrap transition-colors ${
              option.textClassName ?? "text-[15px]"
            } ${selected ? "text-white" : "text-ink-soft"}`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
