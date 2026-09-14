"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { ChevronRightIcon } from "@/components/icons";
import { SectionTitle, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { TEXT_SCALES, THEMES } from "@/lib/display-settings";
import { disablePush, enablePush, type PushPermission } from "@/lib/push";
import { refreshPushState, usePushState } from "@/lib/use-push";
import { useDisplaySettings } from "@/lib/use-display-settings";
import { useSwipeBack } from "@/lib/use-swipe-back";

/**
 * 설정 화면 — 눈에 편한 대로 화면을 맞추는 곳.
 *
 * 여기서 고른 값은 이 기기에만 남습니다(localStorage). 다른 기기에서 열면
 * 그 기기의 설정을 따릅니다 — 폰은 보통, 집 태블릿은 크게 같은 식으로요.
 *
 * 맨 아래 "계정" 칸은 예외입니다 — 권한·로그인 계정, 운영진 화면으로 가는 문(운영진에게만 보임),
 * 로그아웃, 탈퇴 안내가 모여 있습니다(2026-09-14~15에 내 프로필·설정 곳곳에서 옮겨 옴).
 */
export default function SettingsPage() {
  const { textScale, resolved, setTextScale, setTheme } = useDisplaySettings();
  const { user, profile, isAdmin, logOut } = useAuth();
  const router = useRouter();

  /*
   * 오른쪽으로 밀어서 앞 화면으로 — 내 프로필 화면과 같은 손짓입니다.
   * router.back()을 쓰는 이유도 같습니다: 이 화면은 어느 탭에서든 제목 줄의
   * 톱니 아이콘으로 들어오므로, 갈 곳을 하나로 못 박으면 원우가 있던 탭이
   * 아니라 엉뚱한 탭으로 나가게 됩니다.
   */
  const swipe = useSwipeBack({ onCommit: () => router.back() });

  return (
    /*
      min-h-full: 손짓을 받는 상자가 화면 아래까지 내려와 있어야 합니다.
      이 화면은 내용이 짧아서, 높이를 주지 않으면 상자가 마지막 칸("화면")에서
      끝납니다. 그 아래 빈 자리는 상자 밖이라 거기서 시작한 손짓은 아무 데도
      닿지 않습니다 — 원우 눈에는 "여기서는 넘기기가 안 되네"로 보입니다.

      dvh가 아니라 full(=부모 높이의 100%)인 것이 중요합니다. MainShell의
      <main>이 이미 탭바 자리만큼 아래 여백을 두고 있어서, 여기에 화면 높이를
      또 못 박으면 그 둘이 더해져 내용이 짧아도 화면이 괜히 스크롤됩니다.
      부모의 안쪽 높이에 맞추면 그 여백을 빼고 딱 맞습니다.
    */
    <div
      className="min-h-full bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="설정" back />

      <div className="flex flex-col gap-7 px-4 pb-10">
        <PushSection uid={user?.uid} />

        <section>
          <SectionTitle>글씨 크기</SectionTitle>
          {/* 칸마다 그 크기로 글씨를 써서, 고르기 전에도 어떻게 될지 보입니다. */}
          <SegmentedControl
            options={TEXT_SCALES}
            value={textScale}
            onChange={setTextScale}
          />
        </section>

        <section>
          <SectionTitle>화면</SectionTitle>
          {/*
            두 칸뿐입니다. "시스템" 칸은 두지 않았습니다 —
            설명이 필요한 이름인 데다, 아무것도 안 고른 상태가 이미 시스템이라
            굳이 누를 일이 없습니다.

            그래서 주황 상자가 앉는 기준이 "고른 값"이 아니라 **지금 실제로
            보이는 밝기(resolved)** 입니다. 아직 아무것도 안 고른 원우에게도
            둘 중 하나에는 상자가 앉아 있고, 폰에서 다크 모드를 켜면 상자가
            저절로 옮겨갑니다. 하나를 누르면 그때부터 이 앱만 그 밝기로 굳습니다.
          */}
          <SegmentedControl options={THEMES} value={resolved} onChange={setTheme} />
        </section>

        {/*
          로그아웃 — 설정 맨 아래, 원우 누구에게나 보입니다 (2026-09-14 사용자 요청으로 내 프로필에서 옮김).
          위에 "계정" 제목을 답니다 — 알림·글씨 크기·화면처럼 칸마다 제목이 있는 짜임에 맞춰
          (2026-09-15 사용자 요청). 위아래 간격은 이 목록의 gap-7이 줍니다.
          단추는 주황 채움·폭 가득, 위아래 12px(py-3) — 위 고르개들과 같은 약 48px 높이(2026-09-15에 py-4에서 줄임).
          나간 뒤 기록에 설정 화면이 남지 않도록 push가 아니라 replace로 로그인 화면에 갑니다.
          (가입 대기 화면 /pending에는 따로 로그아웃이 있습니다 — 그 화면엔 설정으로 가는 길이 없어서입니다.)
        */}
        <section>
          <SectionTitle>계정</SectionTitle>
          {/*
            권한·로그인 계정 상자 — 2026-09-15 사용자 요청으로 내 프로필 화면에서 옮겨 왔습니다(모양 그대로).
            로그아웃 단추가 그 아래 12px(mt-3), 탈퇴 안내가 맨 아래에 옵니다 — 내 프로필에 있던 순서와 같습니다.
          */}
          <div className="mb-3 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <dl className="flex items-center justify-between text-[14px]">
              <dt className="text-ink-faint">권한</dt>
              <dd className="font-bold text-ink">{isAdmin ? "운영진" : "원우"}</dd>
            </dl>
            <dl className="mt-3 flex items-center justify-between gap-4 text-[14px]">
              <dt className="shrink-0 text-ink-faint">로그인 계정</dt>
              <dd className="truncate text-ink-soft">{profile?.email}</dd>
            </dl>
          </div>

          {/*
            관리자 화면(/admin) 입구 — 운영진에게만 보입니다. 원우 눈에는 이 자리가 아예 없습니다.
            줄 이름은 2026-09-15 사용자 요청으로 "운영진 화면" → "관리자 화면"으로 바꿨습니다.
            2026-09-15 사용자 요청으로 "화면" 칸 아래 따로 서 있던 줄을 "계정" 칸 안(권한 상자와 로그아웃 사이)으로 옮겼습니다.
            눌러서 넘어가는 문이라 칸에 적힌 이름이 곧 제목입니다. 아래 로그아웃과 12px(mb-3) 띄웁니다.
          */}
          {isAdmin ? (
            <Link
              href="/admin"
              className="mb-3 flex items-center justify-between rounded-2xl bg-surface px-5 py-3 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
            >
              {/* 글씨만 2px 위로 (2026-09-15, 설정의 다른 박스 글씨와 같이). 꺾쇠는 그대로. */}
              <span className="-translate-y-[2px] text-[17px] font-bold text-ink">관리자 화면</span>
              <ChevronRightIcon className="h-5 w-5 text-ink-faint" />
            </Link>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await logOut();
              router.replace("/login");
            }}
            className="w-full rounded-2xl bg-brand-500 py-3 text-[15px] font-bold text-white shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            {/*
              글씨만 2px 위로 (2026-09-15, 위 고르개들과 같이). 이 단추는 flex가 아니라서 그냥 span에는
              transform이 안 먹습니다(글줄 안 인라인 요소) — inline-block이 꼭 필요합니다.
            */}
            <span className="inline-block -translate-y-[2px]">로그아웃</span>
          </button>

          {/* 탈퇴 안내 — 내 프로필에서 함께 옮겨 왔습니다(2026-09-15). */}
          <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-faint">
            탈퇴를 원하시면 운영진에게 알려주세요.
            <br />
            작성한 글과 사진을 함께 정리해 드릴게요.
          </p>
        </section>
      </div>
    </div>
  );
}

/** 켤 수 없는 상태일 때 무엇이 막고 있는지 알려줍니다. */
function permissionProblem(permission: PushPermission): string {
  switch (permission) {
    case "denied":
      return "브라우저가 이 앱의 알림을 막아두었어요. 브라우저 설정에서 알림을 허용한 뒤 다시 켜주세요.";
    case "unsupported":
      return "이 브라우저에서는 알림을 받을 수 없어요. 아이폰은 홈 화면에 추가한 뒤 그 아이콘으로 열어야 합니다.";
    default:
      return "알림 허용을 눌러야 켜집니다.";
  }
}

/**
 * 알림 켜기/끄기 — 글씨 크기·화면과 같은 모양의 고르개입니다.
 *
 * 이 설정은 **기기마다 따로**입니다. 폰에서 켜도 태블릿에서는 따로 켜야 합니다.
 * 브라우저 권한이 기기 단위로 주어지기 때문입니다.
 *
 * 켜고 끄는 데 시간이 걸리고(브라우저에 권한을 묻고 토큰을 받아옵니다) 실패도
 * 하므로, 다른 두 줄과 달리 누르는 중임을 스피너로 알리고 막힌 이유를 아래에
 * 적습니다. 모양만은 세 줄이 같게 두었습니다.
 */
function PushSection({ uid }: { uid: string | undefined }) {
  const { on, blocked } = usePushState();
  /** 지금 켜는/끄는 중인 쪽. 그 칸에만 스피너가 돕니다. */
  const [pending, setPending] = useState<"on" | "off" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(next: "on" | "off") {
    const turningOn = next === "on";
    if (pending !== null || !uid || turningOn === on) return;
    setPending(next);
    setProblem(null);
    try {
      if (turningOn) {
        const permission = await enablePush(uid);
        if (permission !== "granted") setProblem(permissionProblem(permission));
      } else {
        await disablePush();
      }
    } catch (caught) {
      setProblem(
        (caught as Error)?.message || "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      refreshPushState();
      setPending(null);
    }
  }

  const message = blocked ?? problem;
  const spinner = <Spinner className="h-[18px] w-[18px]" />;

  return (
    <section>
      <SectionTitle>알림</SectionTitle>
      <SegmentedControl
        value={on ? "on" : "off"}
        onChange={choose}
        disabled={pending !== null || blocked !== null}
        options={[
          { value: "off", label: "끄기", icon: pending === "off" ? spinner : null },
          { value: "on", label: "켜기", icon: pending === "on" ? spinner : null },
        ]}
      />
      {message ? (
        <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
