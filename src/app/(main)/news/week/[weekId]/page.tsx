"use client";

import { use, useEffect } from "react";
import { WeekAlbumBook } from "@/components/AlbumList";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { weekRangeLabel } from "@/lib/week";

/**
 * 한 주(화~월)의 원우 소식 — /news/week/2026-09-22 (그 주 화요일) (2026-09-24 사용자 요청).
 *
 * 소식 탭 "지난 소식"에서 주를 누르면 옵니다. 로그인한 원우용 화면입니다.
 * 단톡방에 올라가는 "이번주 원우 소식" 링크도 이 화면입니다 (2026-09-25 사용자 요청 — 그 전엔 로그인 없이 보는
 * 소식지 app/letter/[slug]였습니다).
 * 뒤로(‹)는 소식 탭으로 갑니다 — 카톡에서 바로 연 경우 돌아갈 앞 화면이 없어서입니다.
 */
export default function WeekNewsPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(weekId);

  // 원우 소식 칸처럼 카드가 화면에 딱 맞게 서서 위아래로 굴리지 않습니다(news/page.tsx와 같은 까닭).
  useEffect(() => {
    document.body.dataset.lockScroll = "yes";
    return () => {
      delete document.body.dataset.lockScroll;
    };
  }, []);

  return (
    <>
      <PageHeader
        title={valid ? `${weekRangeLabel(weekId)} 원우 소식` : "원우 소식"}
        backHref="/news"
        right={<HeaderActions />}
      />
      <div className="px-4 pt-4">
        {valid ? (
          <WeekAlbumBook weekId={weekId} />
        ) : (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<span className="text-[40px]">📸</span>}
              title="주소가 올바르지 않아요"
              description="소식 탭에서 이번 주 소식과 지난 소식을 볼 수 있어요."
            />
          </div>
        )}
      </div>
    </>
  );
}
