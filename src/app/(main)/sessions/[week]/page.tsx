"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import SessionComments from "@/components/SessionComments";
import SessionEditSheet from "@/components/SessionEditSheet";
import { EmptyState, Skeleton } from "@/components/ui";
import { LibraryIcon } from "@/components/icons";
import { useSession } from "@/lib/hooks";
import { SESSION_PERIODS, periodLabel, sessionVideoUrl } from "@/lib/sessions";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { useViewCohort } from "@/lib/use-view-cohort";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import { COURSE_TOTAL_SESSIONS } from "@/lib/constants";
import type { SessionPeriod } from "@/lib/types";

/**
 * 한 주차 수업 화면 — 교시별 영상과 원우들의 느낀점.
 *
 * 예전에는 홈에서 바텀시트로 열었습니다. 느낀점이 본인만 보는 한 칸일 때는
 * 그만해도 됐지만, 여럿이 주고받는 자리가 되면서 시트로는 좁아졌습니다.
 *
 * ★ 영상 칸에는 썸네일만 둡니다. 주제·강사 이름·"○○ 원우가 정리했어요"를
 *   함께 적던 시절이 있었는데, 그 내용은 이미 유튜브 썸네일 안에 적혀 있어서
 *   같은 말이 두 번 나왔습니다. 주제·강사는 홈의 수업 기록 목록에서 어느
 *   주인지 가려내는 데 여전히 쓰이므로, 적는 칸은 수정 시트에 그대로 둡니다.
 */
export default function SessionPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekParam } = use(params);
  const week = Number(weekParam);
  const router = useRouter();
  // 홈의 수업 기록 목록과 같은 기수의 그 주를 엽니다 (운영진이 고른 기수 포함).
  const { cohort } = useViewCohort();
  const { data: session, loading } = useSession(cohort, week);
  const [editing, setEditing] = useState(false);
  /*
   * 지금 보고 있는 교시. 영상도 느낀점도 이 값 하나를 따라 함께 바뀝니다.
   *
   * 두 교시를 위아래로 늘어놓지 않고 고르개로 나눈 이유: 느낀점 입력줄이
   * 화면 아래에 붙어 있는(sticky) 구조라, 두 벌을 한 화면에 두면 입력줄
   * 둘이 같은 자리를 두고 겹칩니다.
   */
  const [period, setPeriod] = useState<SessionPeriod>(1);

  /*
   * 오른쪽으로 밀어서 수업 기록 목록으로 — 왼쪽 위 < 버튼과 같은 곳으로 갑니다.
   *
   * router.back()이 아니라 목록으로 못 박는 이유: 이 화면은 수업 기록 목록(/sessions)
   * 에서만 들어옵니다. 갈 곳이 하나뿐이라 기록을 되짚을 필요가 없고,
   * 알림을 눌러 바로 들어온 경우에도 나갈 자리가 생깁니다.
   * (2026-09-11 전에는 목록이 홈에 있어서 홈으로 갔습니다.)
   */
  const swipe = useSwipeBack({ onCommit: () => router.push("/sessions") });

  const videoLink = parseVideoLink(sessionVideoUrl(session, period));
  const isValidWeek =
    Number.isInteger(week) && week >= 1 && week <= COURSE_TOTAL_SESSIONS;

  if (!isValidWeek) {
    return (
      <div className="bg-canvas">
        <PageHeader title="수업" backHref="/sessions" />
        <p className="px-4 py-10 text-center text-[14px] text-ink-muted">
          없는 주차예요.
        </p>
      </div>
    );
  }

  return (
    /*
      min-h-full: 아직 영상도 느낀점도 없는 주차는 내용이 짧습니다. 높이를
      주지 않으면 손짓을 받는 상자가 거기서 끝나, 그 아래 빈 자리에서 시작한
      넘기기가 먹지 않습니다. (dvh가 아닌 이유는 설정·프로필 화면의 주석 참고)
    */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      {/*
        backHref로 수업 기록 목록을 못 박습니다. back(기록 되돌리기)을 쓰면, 알림이나
        주소로 바로 들어온 원우는 되돌아갈 자리가 없어 앱 밖으로 나갑니다.
      */}
      <PageHeader
        title={`${week}주차 수업`}
        backHref="/sessions"
        right={
          /* 원우수첩의 수정 버튼과 같은 모양입니다 — 누구나 함께 채우는 자리라는 뜻. */
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="수업 정보 수정"
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold text-ink-muted transition active:scale-95"
          >
            ✎ 수정
          </button>
        }
      />

      {/* 교시 고르개. 아래 영상과 느낀점이 통째로 이 칸을 따라갑니다. */}
      <div className="px-4 pb-4">
        <SegmentedControl
          options={SESSION_PERIODS.map((value) => ({
            value: String(value),
            label: periodLabel(value),
          }))}
          value={String(period)}
          onChange={(next) => setPeriod(Number(next) as SessionPeriod)}
        />
      </div>

      <div className="px-4 pb-6">
        {loading ? (
          <Skeleton className="aspect-video rounded-3xl" />
        ) : videoLink?.id ? (
          /*
            영상 칸에는 썸네일만 둡니다 — 주제도 강사 이름도 그림 안에
            이미 적혀 있습니다. (파일 맨 위 설명 참고)
            key에 교시를 넣어, 1교시를 재생하다 2교시로 넘어가면 재생이
            멈추고 다시 썸네일로 돌아옵니다.
          */
          <div className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <SessionVideo key={period} link={videoLink} week={week} period={period} />
          </div>
        ) : (
          <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <EmptyState
              icon={<LibraryIcon className="h-10 w-10" />}
              title={`${periodLabel(period)} 영상이 아직 없어요`}
            />
          </div>
        )}
      </div>

      {/* 느낀점도 교시마다 따로 답니다. */}
      <SessionComments week={week} period={period} />

      {editing ? (
        <SessionEditSheet
          week={week}
          session={session}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

/** 썸네일을 누르면 그 자리에서 재생합니다. (원우 소개 영상과 같은 방식) */
function SessionVideo({
  link,
  week,
  period,
}: {
  link: NonNullable<ReturnType<typeof parseVideoLink>>;
  week: number;
  period: SessionPeriod;
}) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = videoThumbnail(link);
  /** 화면 낭독기용 이름 — 눈에 보이는 글씨는 아닙니다. */
  const name = `${week}주차 ${periodLabel(period)} 수업 영상`;

  return (
    <div className="bg-black">
      {playing ? (
        <iframe
          src={videoEmbedUrl(link) ?? ""}
          title={name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${name} 재생`}
          className="relative block aspect-video w-full transition active:scale-[0.99]"
        >
          {/*
            상자가 16:9여야 유튜브 썸네일의 검은 띠가 남지 않습니다.
            (자세한 이유는 lib/video.ts의 videoThumbnail 주석에)
          */}
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-[22px] text-white">
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
