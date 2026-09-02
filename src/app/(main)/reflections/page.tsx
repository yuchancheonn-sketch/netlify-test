"use client";

import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { ReflectionIcon } from "@/components/icons";

/**
 * 소감 나눔 게시판.
 * 글쓰기·목록·회차 필터는 Phase 2에서 채웁니다.
 */
export default function ReflectionsPage() {
  return (
    <>
      <PageHeader title="소감 나눔" right={<ProfileAvatarButton />} />

      <div className="px-5">
        <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<ReflectionIcon className="h-10 w-10" />}
            title="소감 나눔은 곧 열려요"
            description="오늘 배운 수업의 소감을 회차별로 남기고 함께 볼 수 있는 공간이에요."
          />
        </div>
      </div>
    </>
  );
}
