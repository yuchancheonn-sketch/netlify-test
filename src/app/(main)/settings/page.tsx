"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { CheckIcon } from "@/components/icons";
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
  const { textScale, theme, setTextScale, setTheme } = useDisplaySettings();
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
    <div
      className="bg-canvas"
      {...swipe.handlers}
      style={{ ...swipe.touchAction, ...swipe.slideStyle }}
    >
      <PageHeader title="설정" back />

      <div className="flex flex-col gap-7 px-4 pb-10">
        <PushSection uid={user?.uid} />

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
                      : "bg-surface text-ink-soft shadow-[var(--shadow-card)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>화면</SectionTitle>
          {/*
            세 칸. 위 글씨 크기와 같은 모양으로 두어, 설정 화면 안에서
            고르는 방식이 하나로 읽히게 했습니다.

            "시스템"이 기본입니다 — 폰에서 다크 모드를 켜면 앱도 함께 어두워지고,
            폰이 시간대에 따라 자동으로 바뀌면 앱도 따라 바뀝니다.
            앱만 따로 두고 싶을 때만 밝게·어둡게를 고르면 됩니다.
          */}
          <div className="flex gap-2.5">
            {THEMES.map(({ value, label }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={selected}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-[17px] font-bold transition active:scale-[0.98] ${
                    selected
                      ? "bg-brand-500 text-white"
                      : "bg-surface text-ink-soft shadow-[var(--shadow-card)]"
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
 * 알림 켜기/끄기 — 글씨 크기·화면과 같은 모양의 두 칸입니다.
 *
 * 이 설정은 **기기마다 따로**입니다. 폰에서 켜도 태블릿에서는 따로 켜야 합니다.
 * 브라우저 권한이 기기 단위로 주어지기 때문입니다.
 */
function PushSection({ uid }: { uid: string | undefined }) {
  const { on, blocked } = usePushState();
  /** 지금 켜는/끄는 중인 쪽. 그 칸에만 스피너가 돕니다. */
  const [pending, setPending] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(next: boolean) {
    if (pending !== null || !uid || next === on) return;
    setPending(next);
    setProblem(null);
    try {
      if (next) {
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

  return (
    <section>
      <SectionTitle>알림</SectionTitle>
      <div className="flex gap-2.5">
        {[
          { value: false, label: "끄기" },
          { value: true, label: "켜기" },
        ].map(({ value, label }) => {
          const selected = on === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => choose(value)}
              disabled={pending !== null || blocked !== null}
              aria-pressed={selected}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${
                selected
                  ? "bg-brand-500 text-white"
                  : "bg-surface text-ink-soft shadow-[var(--shadow-card)]"
              }`}
            >
              {pending === value ? (
                <Spinner className="h-[18px] w-[18px]" />
              ) : selected ? (
                <CheckIcon className="h-[18px] w-[18px]" />
              ) : null}
              {label}
            </button>
          );
        })}
      </div>
      {message ? (
        <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
