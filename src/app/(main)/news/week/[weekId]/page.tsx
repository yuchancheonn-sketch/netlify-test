"use client";

import { use, useEffect } from "react";
import { WeekAlbumBook } from "@/components/AlbumList";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { weekRangeLabel } from "@/lib/week";

/**
 * 한 주(화~월)의 원우 소식 — /news/week/2026-09-22 (그 주 화요일) (2026-09-24 사용자 요청).
 *
 * 소식 탭 "지난 소식"에서 주를 누르면 오고, 매주 월요일 저녁 6시 카카오톡 채널로 나가는
 * "이번주 원우 소식이에요" 링크도 이 화면을 엽니다(/api/news/weekly-close).
 * 로그인 안 된 채 링크로 들어오면 로그인 뒤 이 화면으로 돌아옵니다(StageGate).
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
