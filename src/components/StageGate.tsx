"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, type AuthStage } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { APP_NAME } from "@/lib/constants";
import { rememberReturnPath, takeReturnPath } from "@/lib/login-return";
import { useSplashHoldDone } from "@/lib/use-splash-hold";
import { warmCohortDirectory, warmHomeData } from "@/lib/hooks";
import { cohortOf } from "@/lib/cohort";

/**
 * 각 단계에서 사용자가 있어야 할 화면.
 * signedOut은 홈 — 로그인 없이도 둘러볼 수 있습니다(2026-09-24 사용자 요청 "보는 것만큼 로그인 없이").
 * 로그인은 올리기·수정처럼 로그인이 필요한 일을 할 때 LoginRequired가 안내합니다.
 */
const STAGE_PATH: Record<Exclude<AuthStage, "loading">, string> = {
  signedOut: "/home",
  needsSignUp: "/join",
  pending: "/pending",
  needsOnboarding: "/onboarding",
  ready: "/home",
};

/**
 * 로그인·가입 단계에 맞지 않는 화면에 들어오면 알맞은 화면으로 돌려보냅니다.
 *
 * 이 가드는 "길 안내"일 뿐이고, 실제 데이터 접근 차단은 Firestore 보안 규칙이
 * 담당합니다. 브라우저에서 코드를 고쳐 화면을 열더라도 데이터는 내려오지 않습니다.
 */
export default function StageGate({
  allow,
  children,
}: {
  allow: AuthStage[];
  children: ReactNode;
}) {
  const { stage, user, profile } = useAuth();
  const router = useRouter();
  const allowed = allow.includes(stage);

  /*
   * 로딩 화면이 떠 있는 동안 홈 일정과 내 기수 원우수첩을 미리 받기 시작합니다
   * (2026-09-26 사용자 "홈 일정 칸이랑 원우탭이 너무 로딩이 오래 걸려"). 예전엔 로딩 화면(1초)이 끝나
   * 화면이 그려진 뒤에야 받기 시작했습니다. 받은 것은 앱이 켜져 있는 동안 들고 있습니다(lib/live-list.ts).
   * 구독을 거는 것뿐이라 effect 안에서 setState는 하지 않습니다.
   */
  useEffect(() => {
    warmHomeData();
  }, []);
  const myCohort = profile?.cohort;
  useEffect(() => {
    if (stage === "ready" && user) warmCohortDirectory("member", user.uid, cohortOf(myCohort));
  }, [stage, user, myCohort]);
  /*
   * 앱을 연 뒤 1.5초는 무조건 로딩 화면 (2026-09-26 사용자 요청, lib/use-splash-hold.ts).
   * 그동안은 다른 화면으로 보내지도(redirect), 화면을 그리지도 않습니다.
   */
  const splashDone = useSplashHoldDone();

  useEffect(() => {
    if (!splashDone || stage === "loading" || allowed) return;
    /*
     * 로그인을 마치면 기억해 둔 주소(lib/login-return.ts)로 보냅니다 (2026-09-24). 로그인하러 가기 전의 화면이나
     * 로그인 없이 못 여는 주소로 들어왔던 곳 — 카카오톡 안에서 링크를 열면 대개 로그아웃 상태라서입니다.
     */
    if (stage === "signedOut") rememberReturnPath();
    router.replace(stage === "ready" ? (takeReturnPath() ?? STAGE_PATH.ready) : STAGE_PATH[stage]);
  }, [splashDone, stage, allowed, router]);

  /*
   * 로딩 화면은 뚝 끊지 않고 화면 위에서 0.3초 옅어지며 걷힙니다 — 앱을 연 뒤 처음 한 번만
   * (2026-09-26 사용자 "로딩 화면이 사라지는 속도랑 아이폰 맨 위 주황이 사라지는 속도가 안 맞아", globals.css splash-out).
   * 시작 주소(/)의 로딩 화면이 끝나면 홈 쪽 StageGate가 이어받아 옅어지게 하므로 모듈 값으로 한 번만 셉니다.
   */
  const [exitPlayed, setExitPlayed] = useState(() => splashExitDone);

  if (!isFirebaseConfigured) return <SetupNotice />;
  if (!splashDone || !allowed) return <SplashScreen />;
  return (
    <>
      {children}
      {exitPlayed ? null : (
        <SplashScreen
          exiting
          onExited={() => {
            splashExitDone = true;
            setExitPlayed(true);
          }}
        />
      )}
    </>
  );
}

/** 이번에 앱을 연 뒤 로딩 화면이 옅어지며 걷히는 것을 이미 보여 줬는지 (위 exitPlayed). */
let splashExitDone = false;

/**
 * 인증 상태를 확인하는 동안 잠깐 보이는 화면.
 *
 * 주황 바탕(bg-brand-500) 한가운데에 흰색 도산아카데미 로고만 둡니다 (2026-09-25부터).
 * 도는 동그라미도, 점도, 글씨도 없습니다 — 잠깐 스쳐 가는 화면이라 조용할수록 좋습니다.
 *
 * (예전엔 바탕이 bg-canvas 회색이라 로딩이 끝나 탭이 나타날 때 바탕색이 바뀌지 않았습니다.
 *  홈 화면에 추가한 앱의 스플래시(manifest의 BRAND_BACKGROUND)는 아직 그 회색 그대로입니다.)
 *
 * 로고는 public/brand/goose.png입니다. 파일 이름이 로고 같지 않은 것은
 * 앱 아이콘의 기러기 무늬를 이 그림에서 따내느라 먼저 들어온 파일이기
 * 때문입니다(scripts/generate-icons.mjs). 같은 그림을 두 벌 두면 언젠가
 * 한쪽만 바뀌므로 그대로 함께 씁니다.
 */
/** 이번에 앱을 연 뒤 로딩 화면 로고가 한 번이라도 떠올랐는지 (아래 SplashScreen의 replay). */
let logoShownOnce = false;

export function SplashScreen({
  exiting = false,
  onExited,
}: {
  /** 화면 위에 덮인 채 옅어지며 걷히는 중 — 다 걷히면 onExited (StageGate). */
  exiting?: boolean;
  onExited?: () => void;
} = {}) {
  /** 로고 그림을 다 받았는지 — 받은 뒤에 떠오르는 애니메이션을 겁니다(아래 Image 주석). */
  const [logoReady, setLogoReady] = useState(false);
  /*
   * ★ 떠오르는 애니메이션은 앱을 연 뒤 처음 한 번만 (2026-09-26 사용자 "로딩 화면이 사라질 때 깜빡여").
   *   시작 주소(/)의 로딩 화면이 끝나고 홈 쪽 로딩 화면이 새로 그려지는 일이 있는데, 그때마다 로고가
   *   투명에서 다시 떠올라 한 번 깜빡였습니다. 두 번째부터는 로고를 처음부터 그대로 보여 줍니다.
   */
  const [replay] = useState(() => logoShownOnce);
  return (
    /*
      ★ fixed inset-0 — 로고를 **보이는 화면의 정가운데**에 둡니다 (2026-09-15 사용자 요청).
        예전에는 min-h-dvh 상자 안에서 가운데 정렬했는데, 설정의 글씨 크기가 "크게"(html zoom 1.15)나
        "작게"(0.9)이면 그 100dvh 높이까지 함께 1.15배·0.9배로 늘거나 줄어, 상자가 화면보다 길어지거나
        짧아지면서 상자 가운데(= 로고)가 화면 가운데에서 수십 px 아래·위로 밀렸습니다.
        fixed + inset 0은 화면 네 끝에 붙어 zoom·body 높이와 상관없이 화면과 크기가 같으므로,
        그 안의 flex 가운데 정렬이 곧 화면 정가운데입니다.
      (로고 그림 goose.png 자체는 700×700 안에 좌우 26/27px·위아래 30/29px 여백으로 이미 가운데입니다.)
    */
    /*
      바탕은 앱 주황(bg-brand-500), 로고는 완전 흰색 (2026-09-25 사용자 요청 — 예전엔 bg-canvas 회색 바탕에 파란 로고).
      주황은 어두운 화면에서도 같은 색이라 테마와 상관없이 똑같이 보입니다.
    */
    /*
      ★ 브라우저(카카오톡·Safari 안)에서는 위아래 안전 영역을 빼고 가운데를 잡습니다 (2026-09-26 사용자 "카톡에서 로딩 화면이
        버퍼링 같다"). 카카오톡 창이 자리를 잡으면서 화면 아래쪽이 도구줄 밑까지 늘어나, 로고가 늘어난 영역의 가운데로 뚝
        떨어졌습니다. 도구줄에 가려지는 몫(safe-area-inset-bottom)을 padding으로 빼면 보이는 주황 영역의 가운데에 섭니다.
        홈 화면 앱(standalone)은 예전 자리 그대로라 이 padding을 걸지 않습니다.
    */
    // exiting — 탭바·제목 줄보다 위(z-[100])에 덮인 채 옅어지고, 그동안 누르는 것은 아래 화면으로 통과시킵니다.
    <div
      className={`fixed inset-0 flex items-center justify-center px-8 [@media(display-mode:browser)]:pt-[env(safe-area-inset-top)] [@media(display-mode:browser)]:pb-[env(safe-area-inset-bottom)] ${
        exiting ? "animate-splash-out pointer-events-none z-[100]" : "bg-brand-500"
      }`}
      onAnimationEnd={(event) => {
        // 로고의 떠오르는 애니메이션이 끝난 것도 여기로 올라오므로 이 상자 자신의 것만 봅니다.
        if (exiting && event.target === event.currentTarget) onExited?.();
      }}
    >
      {/*
        ★ 걷히는 동안에는 주황을 시계 줄 아래부터만 칠합니다 (2026-09-26 사용자 "옅어지게 했더니 오히려 위 주황이 더 오래 남아").
          아이폰은 맨 위에 주황 상자가 남아 있는 한 시계 줄을 주황으로 두고, 상자가 다 사라진 뒤에야 색을 옮기기 시작했습니다.
          걷히기 시작하는 순간 시계 줄 자리에서 주황을 빼면 그때부터 함께 옮겨 갑니다.
          바깥 상자는 그대로 화면 전체라 로고 자리는 움직이지 않습니다.
      */}
      {exiting ? (
        <div aria-hidden="true" className="absolute inset-x-0 top-[env(safe-area-inset-top)] bottom-0 bg-brand-500" />
      ) : null}
      {/*
        원본이 700×700이라 화면에 그리는 150px의 네 배가 넘습니다.
        고해상도 화면에서도 또렷하고, next/image가 알아서 줄여 내보냅니다.

        w-[140px] h-auto로 크기를 다시 잡아, 나중에 정사각형이 아닌 그림으로
        바뀌더라도 눌리거나 늘어나지 않고 비율을 지킵니다.
      */}
      <Image
        src="/brand/goose.png"
        alt="도산아카데미"
        width={700}
        height={700}
        priority
        // brightness-0 invert — 투명 PNG의 그림 부분(기러기·글씨)을 모두 흰색으로 칠합니다. 그림 파일은 그대로 둡니다.
        // w-[150px] — 로고 크기 (2026-09-25 사용자 요청: 140px → 160px로 키웠다가 150px로 줄임).
        // -mt-5 — 로고를 화면 정가운데보다 10px 위로 (2026-09-25 사용자 요청). flex 가운데 정렬이라
        //   위 여백 -20px이면 그림이 절반인 10px만큼 올라갑니다. 등장 애니메이션(transform)과 겹치지 않게 margin으로 뺍니다.
        //   ★ 홈 화면에 추가한 앱(display-mode: standalone)에서만 올립니다 (2026-09-26 사용자 "카카오톡에서 열면 정가운데로").
        //     카카오톡·Safari 안에서는 위아래 주소창·도구줄 사이가 기준이라 올리지 않아야 정가운데로 보입니다.
        /*
          ★ 등장 애니메이션(animate-splash-in, 아래에서 8px 떠오르며 나타남)은 그림이 다 받아진 뒤에 시작합니다
            (2026-09-26 사용자 "전 버전처럼 로고가 자연스럽게 살짝 올라오게"). 처음부터 걸어 두면 그림을 받는 동안
            0.5초짜리 애니메이션이 먼저 끝나 버려, 그림이 뒤늦게 뚝 나타나 보였습니다.
            받기 전에는 투명(opacity-0). 이미 받아 둔 그림은 ref에서 complete로 바로 알아챕니다.
        */
        onLoad={() => {
          logoShownOnce = true;
          setLogoReady(true);
        }}
        ref={(image) => {
          if (image?.complete && image.naturalWidth > 0) {
            logoShownOnce = true;
            setLogoReady(true);
          }
        }}
        // relative — 걷힐 때 깔리는 주황 판(absolute)보다 위에 그려지도록.
        className={`relative h-auto w-[150px] brightness-0 invert [@media(display-mode:standalone)]:-mt-5 ${
          replay ? "" : logoReady ? "animate-splash-in" : "opacity-0"
        }`}
      />
      {/*
        (같은 날 잠깐 홈 화면 앱의 시계 줄 자리를 회색 줄로 덮었다가 뺐습니다 — 사용자가 시계 줄은 주황 그대로 두고
         로딩 화면과 함께 사라지게 맞추길 원했습니다. 지금은 로딩 화면이 0.3초 옅어지며 걷힙니다 — splash-out.)
      */}
      <span className="sr-only">불러오는 중이에요</span>
    </div>
  );
}

/** .env.local을 아직 채우지 않았을 때 원인을 알려주는 화면 (개발 편의용) */
function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-3xl bg-surface p-7 shadow-[var(--shadow-card)]">
        <h1 className="text-[18px] font-bold text-ink">Firebase 설정이 필요해요</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          {APP_NAME} 앱을 실행하려면 프로젝트 루트에{" "}
          <code className="rounded bg-fill px-1.5 py-0.5 text-[13px]">.env.local</code>{" "}
          파일을 만들고 Firebase 설정값을 넣어야 합니다.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          <code className="rounded bg-fill px-1.5 py-0.5 text-[13px]">
            .env.local.example
          </code>{" "}
          파일을 복사해서 값을 채운 뒤 개발 서버를 다시 시작해 주세요. 자세한 절차는
          README의 &ldquo;처음 한 번만 해야 하는 설정&rdquo;에 정리해 두었습니다.
        </p>
      </div>
    </div>
  );
}
