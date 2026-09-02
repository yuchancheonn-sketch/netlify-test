"use client";

import { useState } from "react";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";

/**
 * 자료 탭 — "복습 영상"과 "행사 사진"을 서브탭으로 묶습니다.
 * 각 목록은 Phase 2에서 채웁니다. 지금은 탭 구조와 빈 상태만 세워 둡니다.
 */
const SUBTABS = [
  { value: "videos", label: "복습 영상" },
  { value: "photos", label: "행사 사진" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function LibraryPage() {
  const [subtab, setSubtab] = useState<Subtab>("videos");

  return (
    <>
      <PageHeader title="자료" right={<ProfileAvatarButton />} />

      <div className="px-5">
        <div className="flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {SUBTABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtab(value)}
              aria-pressed={subtab === value}
              className={`flex-1 rounded-full py-2.5 text-[14px] font-bold transition ${
                subtab === value ? "bg-brand-700 text-white" : "text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-3xl bg-white shadow-[var(--shadow-card)]">
          {subtab === "videos" ? (
            <EmptyState
              icon={<span className="text-[40px]">🎬</span>}
              title="복습 영상은 곧 열려요"
              description="회차별 수업 영상을 운영진이 올리면 여기에서 다시 볼 수 있어요."
            />
          ) : (
            <EmptyState
              icon={<span className="text-[40px]">📸</span>}
              title="행사 사진은 곧 열려요"
              description="행사별 앨범으로 사진을 모아두는 공간이에요."
            />
          )}
        </div>
      </div>
    </>
  );
}
