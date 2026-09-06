"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { enablePush, rememberPushAsked } from "@/lib/push";
import { refreshPushState, useShouldAskPush } from "@/lib/use-push";

/**
 * 가입을 마치고 앱에 처음 들어온 기기에 딱 한 번 뜨는 알림 여쭙기.
 *
 * ★ 왜 아이폰 알림창을 바로 띄우지 않고 이 창을 한 번 거치는가
 *
 *   아이폰은 Notification.requestPermission()을 **손가락으로 누른 그 순간**에
 *   불러야만 창을 띄웁니다. 화면이 열리자마자 코드로 부르면 창이 뜨지 않고
 *   조용히 무시됩니다. 그래서 누를 것이 하나 필요합니다 — "허용"을 누르는
 *   그 손짓을 받아 곧바로 아이폰 알림창을 띄웁니다.
 *
 *   저장 버튼(가입 마치기) 쪽에 얹지 않은 것도 같은 이유입니다. 저장은 서버
 *   응답을 기다리는데, 기다리는 동안 그 손짓의 효력이 사라져서 아이폰이
 *   창을 띄우지 않습니다.
 *
 * 한 번 묻고 나면 다시 뜨지 않습니다. "나중에"를 골랐어도 마찬가지고,
 * 그다음부터는 설정 화면에서 켤 수 있습니다. 볼 때마다 물으면 잔소리입니다.
 */
export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const uid = user?.uid;
  const shouldAsk = useShouldAskPush();
  /** 이번 화면에서 답을 했는지 (localStorage와 별개로 곧바로 닫히게 합니다) */
  const [answered, setAnswered] = useState(false);
  const [working, setWorking] = useState(false);

  if (!uid || !shouldAsk || answered) return null;

  function close() {
    rememberPushAsked();
    refreshPushState();
    setAnswered(true);
  }

  async function allow() {
    if (working || !uid) return;
    setWorking(true);
    try {
      /*
       * 여기서 곧바로 아이폰 알림창이 뜹니다. 그 앞에 await를 하나라도 두면
       * 손짓의 효력이 사라져 창이 안 뜨니, 다른 일을 먼저 하지 마세요.
       */
      await enablePush(uid);
    } catch {
      // 켜지 못했어도 이 창은 닫습니다. 설정 화면에서 다시 켤 수 있습니다.
    } finally {
      close();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-sheet-up w-full max-w-[360px] rounded-[16px] bg-canvas px-6 pt-7 pb-6">
        <h2 className="text-[19px] leading-snug font-bold text-ink">
          새 채팅과 새 일정을 알림으로 받을까요?
        </h2>

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={close}
            disabled={working}
            className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted disabled:opacity-50"
          >
            나중에
          </button>
          <PrimaryButton size="sm" loading={working} onClick={allow}>
            받기
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
