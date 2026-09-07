"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
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
 */
export default function SettingsPage() {
  const { textScale, resolved, setTextScale, setTheme } = useDisplaySettings();
  const { user } = useAuth();
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
