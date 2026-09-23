"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PrimaryButton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { calendarSubscribeLinks, markCalendarLinked } from "@/lib/calendar-client";
import { enablePush, rememberPushAsked } from "@/lib/push";
import { refreshPushState, useShouldAskPush } from "@/lib/use-push";

/**
 * 처음 설정 창 — 앱에 처음 들어온 기기에 한 번, 알림 받기와 폰 캘린더 연결을 한자리에서 (2026-09-23 사용자 요청
 * "처음 앱을 깔았을 때 알람 설정이나 캘린더 연동이나 모두 수락할 수 있도록"). 예전 PushPermissionPrompt(알림만)를 넓혔습니다.
 *
 * ★ 왜 저절로 켜지 않고 줄마다 단추를 누르게 하는가
 *   아이폰·안드로이드는 알림 권한도, 캘린더 구독도 **폰 주인이 직접 눌러 허락**해야만 합니다.
 *   특히 아이폰은 Notification.requestPermission()을 손가락으로 누른 그 순간에 불러야 창을 띄웁니다 —
 *   화면이 열리자마자 코드로 부르거나, 그 앞에 기다리는 일(await)을 두면 조용히 무시됩니다.
 *   그래서 "알림 켜기"·"캘린더 연결"이 각자 단추이고, 한 단추가 두 가지를 같이 하지 않습니다.
 *
 * ★ 캘린더 구독 주소는 창이 열릴 때 미리 받아 둡니다 — 누른 뒤에 받으면 구글 캘린더 새 창이 팝업 차단에 걸립니다.
 *
 * 언제 뜨나: 알림을 아직 안 물어봤거나(shouldAskPush) 캘린더를 아직 안 물어봤을 때(이 기기 localStorage).
 * "완료"를 누르면 둘 다 물어본 것으로 적고 다시 뜨지 않습니다. 그 뒤로는 알림은 설정 화면에서,
 * 캘린더는 홈 캘린더 맨 아래 "내 폰 캘린더에 연결"에서 할 수 있습니다.
 * 이미 이 창(알림만)을 본 기존 원우도 캘린더 줄 때문에 한 번 더 봅니다 — 그때는 캘린더 줄만 섭니다.
 */

const CALENDAR_ASKED_KEY = "calendar-subscribe-asked";

function readCalendarAsked(): boolean {
  try {
    return localStorage.getItem(CALENDAR_ASKED_KEY) === "yes";
  } catch {
    // 저장할 수 없는 곳(시크릿 모드 등)에서는 묻지 않습니다 — 매번 뜨면 잔소리입니다.
    return true;
  }
}

function rememberCalendarAsked() {
  try {
    localStorage.setItem(CALENDAR_ASKED_KEY, "yes");
  } catch {
    // 저장이 막힌 곳 — 위 readCalendarAsked가 어차피 묻지 않습니다.
  }
}

const noopSubscribe = () => () => {};

/** 아이폰·아이패드인지 — 캘린더 단추 순서를 정하는 데만 씁니다. */
function isApplePhone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
}

type Links = { webcal: string; google: string };

export default function FirstRunSetupPrompt() {
  const { user } = useAuth();
  const uid = user?.uid;
  const askPush = useShouldAskPush();
  // 브라우저에서만 읽습니다(서버 그림에서는 "이미 물어봄"으로 두어 창을 그리지 않음).
  const calendarAsked = useSyncExternalStore(noopSubscribe, readCalendarAsked, () => true);
  const apple = useSyncExternalStore(noopSubscribe, isApplePhone, () => false);

  const [closed, setClosed] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "working" | "on" | "failed">("idle");
  const [calendarOpened, setCalendarOpened] = useState(false);
  const [links, setLinks] = useState<Links | null>(null);
  const [linkError, setLinkError] = useState(false);

  // 알림을 켜고 나면 askPush가 거짓이 되지만, 줄은 남겨 "알림을 켰어요"를 보여 줍니다.
  const showPush = askPush || pushState !== "idle";
  // 캘린더는 "완료"를 누를 때만 물어본 것으로 적으므로, 그때까지 줄이 남습니다.
  const showCalendar = !calendarAsked;
  const visible = Boolean(uid) && !closed && (showPush || showCalendar);

  // 캘린더 구독 주소를 미리 받아 둡니다(위 ★). 받은 뒤에 상태를 바꿉니다 — 효과 안에서 곧바로 바꾸지는 않습니다.
  useEffect(() => {
    if (!visible || !showCalendar) return;
    let alive = true;
    calendarSubscribeLinks()
      .then((next) => alive && setLinks(next))
      .catch(() => alive && setLinkError(true));
    return () => {
      alive = false;
    };
  }, [visible, showCalendar]);

  if (!visible) return null;

  async function turnOnPush() {
    if (!uid || pushState === "working") return;
    setPushState("working");
    try {
      // 여기서 곧바로 아이폰 알림창이 뜹니다. 그 앞에 await를 두지 마세요(위 ★).
      const permission = await enablePush(uid);
      setPushState(permission === "granted" ? "on" : "failed");
    } catch {
      setPushState("failed");
    } finally {
      rememberPushAsked();
      refreshPushState();
    }
  }

  function openCalendar(kind: "webcal" | "google") {
    if (!links) return;
    setCalendarOpened(true);
    // 홈 캘린더의 "내 폰 캘린더에 연결" 단추를 감춥니다 — 여기서 이미 연결했으니까요 (2026-09-23).
    markCalendarLinked();
    if (kind === "webcal") window.location.assign(links.webcal);
    else window.open(links.google, "_blank", "noopener");
  }

  function finish() {
    if (showPush) {
      rememberPushAsked();
      refreshPushState();
    }
    if (showCalendar) rememberCalendarAsked();
    setClosed(true);
  }

  const calendarButtons = [
    { kind: "webcal" as const, label: "아이폰 캘린더" },
    { kind: "google" as const, label: "구글 캘린더" },
  ];
  if (!apple) calendarButtons.reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6"
      role="dialog"
      aria-modal="true"
      aria-label="처음 설정"
    >
      <div className="animate-sheet-up w-full max-w-[380px] rounded-[16px] bg-surface px-6 pt-7 pb-6">
        <h2 className="text-[19px] leading-snug font-bold text-ink">
          {/* 한 줄만 설 때(이미 알림을 물어본 기존 원우 등)는 그 한 가지로 묻습니다. */}
          {showPush && showCalendar
            ? "시작하기 전에 두 가지만 설정할까요?"
            : showPush
              ? "알림을 받을까요?"
              : "폰 캘린더에 연결할까요?"}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed break-keep text-ink-muted">
          지금 안 해도 나중에 설정·홈 캘린더에서 할 수 있어요.
        </p>

        {showPush ? (
          <div className="mt-5 rounded-2xl bg-fill px-4 py-4">
            <p className="text-[16px] font-bold text-ink">알림 받기</p>
            <p className="mt-0.5 text-[13px] leading-relaxed break-keep text-ink-muted">
              새 채팅·새 일정·새 소식을 알려 드려요.
            </p>
            <div className="mt-3">
              {pushState === "on" ? (
                <p className="text-[14px] font-bold text-brand-500">알림을 켰어요</p>
              ) : pushState === "failed" ? (
                <p className="text-[13px] leading-relaxed break-keep text-ink-muted">
                  알림을 켜지 못했어요. 나중에 설정 화면에서 다시 켤 수 있어요.
                </p>
              ) : (
                <PrimaryButton size="sm" loading={pushState === "working"} onClick={turnOnPush}>
                  알림 켜기
                </PrimaryButton>
              )}
            </div>
          </div>
        ) : null}

        {showCalendar ? (
          <div className={`${showPush ? "mt-3" : "mt-5"} rounded-2xl bg-fill px-4 py-4`}>
            <p className="text-[16px] font-bold text-ink">폰 캘린더에 연결</p>
            <p className="mt-0.5 text-[13px] leading-relaxed break-keep text-ink-muted">
              우리 기수 모임과 도산아카데미 일정이 폰 캘린더에 저절로 들어와요.
            </p>
            <div className="mt-3 flex gap-2">
              {linkError ? (
                <p className="text-[13px] text-ink-muted">
                  지금은 연결할 수 없어요. 나중에 홈 캘린더에서 해 주세요.
                </p>
              ) : (
                calendarButtons.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => openCalendar(kind)}
                    disabled={!links}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface py-2.5 text-[14px] font-bold whitespace-nowrap text-ink shadow-[var(--shadow-card-flat)] disabled:opacity-60"
                  >
                    {links ? null : <Spinner className="h-4 w-4" />}
                    {label}
                  </button>
                ))
              )}
            </div>
            {calendarOpened ? (
              <p className="mt-2 text-[12px] leading-relaxed break-keep text-ink-muted">
                캘린더 앱에서 &lsquo;구독&rsquo; 또는 &lsquo;추가&rsquo;를 누르면 연결돼요.
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={finish}
          disabled={pushState === "working"}
          className="mt-5 w-full rounded-2xl bg-surface py-3 text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card-flat)] disabled:opacity-50"
        >
          {pushState === "on" || calendarOpened ? "완료" : "나중에 할게요"}
        </button>
      </div>
    </div>
  );
}
