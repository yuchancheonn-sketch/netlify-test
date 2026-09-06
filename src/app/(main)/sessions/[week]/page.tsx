"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SessionComments from "@/components/SessionComments";
import SessionEditSheet from "@/components/SessionEditSheet";
import { Skeleton } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import { COURSE_TOTAL_SESSIONS } from "@/lib/constants";

/**
 * 한 주차 수업 화면 — 주제·강사·영상, 그리고 원우들의 느낀점.
 *
 * 예전에는 홈에서 바텀시트로 열었습니다. 느낀점이 본인만 보는 한 칸일 때는
 * 그만해도 됐지만, 여럿이 주고받는 자리가 되면서 시트로는 좁아졌습니다.
 */
export default function SessionPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekParam } = use(params);
  const week = Number(weekParam);
  const router = useRouter();
  const { data: session, loading } = useSession(week);
  const [editing, setEditing] = useState(false);

  /*
   * 오른쪽으로 밀어서 홈으로 — 왼쪽 위 < 버튼과 같은 곳으로 갑니다.
   *
   * router.back()이 아니라 홈으로 못 박는 이유: 이 화면은 홈의 수업 기록
   * 목록에서만 들어옵니다. 갈 곳이 하나뿐이라 기록을 되짚을 필요가 없고,
   * 알림을 눌러 바로 들어온 경우에도 나갈 자리가 생깁니다.
   */
  const swipe = useSwipeBack({ onCommit: () => router.push("/home") });

  const videoLink = parseVideoLink(session?.videoUrl ?? "");
  const isValidWeek =
    Number.isInteger(week) && week >= 1 && week <= COURSE_TOTAL_SESSIONS;

  if (!isValidWeek) {
    return (
      <div className="bg-canvas">
        <PageHeader title="수업" backHref="/home" />
        <p className="px-4 py-10 text-center text-[14px] text-ink-muted">
          없는 주차예요.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      {/*
        backHref로 홈을 못 박습니다. back(기록 되돌리기)을 쓰면, 알림이나
        주소로 바로 들어온 원우는 되돌아갈 자리가 없어 앱 밖으로 나갑니다.
      */}
      <PageHeader
        title={`${week}주차 수업`}
        backHref="/home"
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

      <div className="px-4 pb-6">
        {loading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : (
          <div className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            {/* 수업 영상 — 누르기 전에는 썸네일만 두어 유튜브를 부르지 않습니다. */}
            {videoLink?.id ? <SessionVideo link={videoLink} week={week} /> : null}

            <div className="px-5 py-4">
              <h2 className="text-[18px] leading-snug font-bold text-ink">
                {session?.topic || `${week}주차`}
              </h2>
              <p className="mt-1 text-[14px] text-ink-muted">
                {session?.instructor
                  ? `${session.instructor} 강사님`
                  : "강사를 아직 안 적었어요"}
              </p>

              {/* 누가 마지막으로 채웠는지 — 원우수첩과 같은 방식입니다. */}
              {session?.updatedByName ? (
                <p className="mt-2.5 text-[12px] text-ink-faint">
                  {session.updatedByName} 원우가 정리했어요
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <SessionComments week={week} />

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
}: {
  link: NonNullable<ReturnType<typeof parseVideoLink>>;
  week: number;
}) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = videoThumbnail(link);

  return (
    <div className="bg-black">
      {playing ? (
        <iframe
          src={videoEmbedUrl(link) ?? ""}
          title={`${week}주차 수업 영상`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${week}주차 수업 영상 재생`}
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
