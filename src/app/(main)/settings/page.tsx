"use client";

import PageHeader from "@/components/PageHeader";
import { CheckIcon } from "@/components/icons";
import { SectionTitle } from "@/components/ui";
import { TEXT_SCALES } from "@/lib/display-settings";
import { useDisplaySettings } from "@/lib/use-display-settings";

/**
 * 설정 화면 — 눈에 편한 대로 화면을 맞추는 곳.
 *
 * 여기서 고른 값은 이 기기에만 남습니다(localStorage). 다른 기기에서 열면
 * 그 기기의 설정을 따릅니다 — 폰은 보통, 집 태블릿은 크게 같은 식으로요.
 */
export default function SettingsPage() {
  const { textScale, mono, setTextScale, setMono } = useDisplaySettings();

  return (
    <>
      <PageHeader title="설정" back />

      <div className="flex flex-col gap-7 px-4 pb-10">
        <section>
          <SectionTitle>글씨 크기</SectionTitle>
          {/*
            세 칸이 한 줄에 나란히 섭니다. 고른 칸만 주황으로 칠해
            지금 무엇이 켜져 있는지 눈으로 바로 알 수 있게 합니다.
            글씨 크기 자체가 보기(미리보기)가 되도록 칸마다 그 크기로 씁니다.
          */}
          <div className="flex gap-2.5">
            {TEXT_SCALES.map(({ value, label }) => {
              const selected = textScale === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTextScale(value)}
                  aria-pressed={selected}
                  className={`flex-1 rounded-2xl py-4 font-bold transition active:scale-[0.98] ${
                    value === "small"
                      ? "text-[14px]"
                      : value === "large"
                        ? "text-[20px]"
                        : "text-[17px]"
                  } ${
                    selected
                      ? "bg-brand-500 text-white"
                      : "bg-white text-ink-soft shadow-[var(--shadow-card)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>흑백 모드</SectionTitle>
          {/*
            켬/끔 두 칸. 위 글씨 크기와 같은 모양으로 두어, 설정 화면 안에서
            고르는 방식이 하나로 읽히게 했습니다.
          */}
          <div className="flex gap-2.5">
            {[
              { value: false, label: "끄기" },
              { value: true, label: "켜기" },
            ].map(({ value, label }) => {
              const selected = mono === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMono(value)}
                  aria-pressed={selected}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-[17px] font-bold transition active:scale-[0.98] ${
                    selected
                      ? "bg-brand-500 text-white"
                      : "bg-white text-ink-soft shadow-[var(--shadow-card)]"
                  }`}
                >
                  {selected ? <CheckIcon className="h-[18px] w-[18px]" /> : null}
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
