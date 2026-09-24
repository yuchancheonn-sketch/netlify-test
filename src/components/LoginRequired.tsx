"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { rememberReturnPath } from "@/lib/login-return";

/**
 * 로그인 없이 둘러보기 (2026-09-24 사용자 요청 "보는 것만큼 로그인 없이, 수정이나 올리기는 그때서야 로그인").
 *
 *  - LoginRequired      — 원우마다 다르게 보이는 화면(채팅·알림·내 프로필 등) 자리에 세우는 안내 상자.
 *  - useRequireLogin()  — 올리기·수정 같은 행동의 맨 앞에서 부릅니다. 로그인 안 했으면 안내 창을 띄우고 true.
 *                         `if (requireLogin()) return;`
 * 두 곳 모두 "로그인" 단추를 누르면 지금 주소를 기억하고 로그인 화면으로 갑니다 — 로그인을 마치면 이 화면으로
 * 돌아옵니다(lib/login-return.ts, StageGate).
 *
 * ★ 화면에서 막는 것은 안내일 뿐이고, 실제로 쓰기를 막는 것은 여전히 firestore.rules입니다(로그인 안 하면 쓰기 불가).
 */

export const LOGIN_REQUIRED_TEXT = "로그인 하여야 이용가능한 기능입니다";

/** 로그인 안 하고 둘러보는 중인지. 로그인 확인이 끝나기 전(loading)에는 false. */
export function useIsGuest(): boolean {
  return useAuth().stage === "signedOut";
}

/** 지금 주소(또는 path)를 기억하고 로그인 화면으로 갑니다. */
export function useGoToLogin() {
  const router = useRouter();
  return useCallback(
    (path?: string) => {
      rememberReturnPath(path);
      router.push("/login");
    },
    [router],
  );
}

/**
 * 화면 자리에 세우는 안내 상자 — 사용자가 정한 문구 그대로.
 * compact: 입력줄 자리(느낀점 등)에 들어가는 한 줄짜리 — 글 옆에 작은 "로그인" 단추.
 */
export function LoginRequired({
  message = LOGIN_REQUIRED_TEXT,
  returnPath,
  compact = false,
  onBack,
}: {
  message?: string;
  returnPath?: string;
  compact?: boolean;
  /** 주면 로그인 단추 아래에 "되돌아가기"를 답니다 — 알림·내 프로필처럼 제목 줄 아이콘으로 들어온 화면(2026-09-25). */
  onBack?: () => void;
}) {
  const goToLogin = useGoToLogin();
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface py-2.5 pr-2.5 pl-4 shadow-[var(--shadow-card)]">
        <p className="min-w-0 text-[14px] font-medium break-keep text-ink-soft">{message}</p>
        <button
          type="button"
          onClick={() => goToLogin(returnPath)}
          className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-[14px]! font-bold text-white transition active:scale-95"
        >
          {/* 글씨만 1px 위로 (2026-09-25 사용자 요청 — 이 파일의 로그인 단추 셋 모두). 단추가 flex가 아니라 inline-block이 있어야 transform이 먹습니다. */}
          <span className="inline-block -translate-y-px">로그인</span>
        </button>
      </div>
    );
  }
  return (
    <>
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-10 text-center shadow-[var(--shadow-card)]">
      <p className="text-[15px] leading-relaxed font-bold break-keep text-ink-soft">{message}</p>
      {/*
        폭 가득 긴 단추 (2026-09-25 사용자 요청 "가로로 긴 로그인 버튼으로" — 예전엔 글씨만큼 짧은 단추).
        높이는 field(위아래 13px, 약 50px). 이 상자를 쓰는 채팅·설정·원우수첩 등이 모두 함께 바뀝니다.
      */}
      <PrimaryButton size="field" onClick={() => goToLogin(returnPath)}>
        {/* 글씨만 1px 위로 (2026-09-25 사용자 요청). PrimaryButton이 flex라 span에 transform이 먹습니다. */}
        <span className="-translate-y-px">로그인</span>
      </PrimaryButton>
    </div>
    {/*
      되돌아가기 (2026-09-25 사용자 요청) — 로그인하지 않고 원래 보던 탭으로. 글자만 있는 단추.
      흰 상자 밖 아래, 회색 바탕 위에 둡니다(같은 날 사용자 "흰색 박스 아래에 그냥 회색 배경 위에" — 처음엔 상자 안 로그인 단추 밑).
      상자와 사이 8px(mt-2) + 단추 위아래 12px(py-3) — 손끝 닿는 자리를 넉넉히.
    */}
    {onBack ? (
      <button
        type="button"
        onClick={onBack}
        // 얇은 회색 밑줄 (2026-09-25 사용자 요청) — 글씨보다 옅은 ink-faint.
        // 굵기 1.25px·글씨에서 4.25px 아래 (같은 날 "0.25px씩 더 떨어뜨리고 더 굵게", 1px·4px에서).
        className="mt-2 w-full py-3 text-[15px]! font-bold text-ink-soft underline decoration-ink-faint decoration-[1.25px] underline-offset-[4.25px]"
      >
        되돌아가기
      </button>
    ) : null}
    </>
  );
}

type Prompt = { message: string; returnPath?: string };
const PromptContext = createContext<((prompt: Prompt) => void) | null>(null);

/** 행동을 막았을 때 띄우는 아래 창. (main) 레이아웃이 한 번 깔아 둡니다. */
export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const goToLogin = useGoToLogin();

  return (
    <PromptContext.Provider value={setPrompt}>
      {children}
      {prompt ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
          role="dialog"
          aria-modal="true"
          aria-label="로그인 안내"
          onClick={() => setPrompt(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="animate-sheet-up w-full max-w-[480px] rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
          >
            <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
            <p className="mt-6 text-center text-[16px] leading-relaxed font-bold break-keep text-ink">
              {prompt.message}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <PrimaryButton
                onClick={() => {
                  const returnPath = prompt.returnPath;
                  setPrompt(null);
                  goToLogin(returnPath);
                }}
              >
                {/* 글씨만 1px 위로 (2026-09-25 사용자 요청). */}
                <span className="-translate-y-px">로그인</span>
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setPrompt(null)}
                className="w-full py-3 text-[15px]! font-bold text-ink-soft"
              >
                둘러보기 계속
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PromptContext.Provider>
  );
}

/**
 * 행동 맨 앞에서: `if (requireLogin()) return;`
 * 로그인했으면 false(그대로 진행), 안 했으면 안내 창을 띄우고 true.
 * returnPath를 주면 로그인 뒤 그 주소로 돌아옵니다(기본은 지금 주소).
 */
export function useRequireLogin() {
  const isGuest = useIsGuest();
  const open = useContext(PromptContext);
  return useCallback(
    (options?: { message?: string; returnPath?: string }) => {
      if (!isGuest) return false;
      open?.({ message: options?.message ?? LOGIN_REQUIRED_TEXT, returnPath: options?.returnPath });
      return true;
    },
    [isGuest, open],
  );
}
