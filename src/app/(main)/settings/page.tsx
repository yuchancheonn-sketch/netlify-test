"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ToggleRow from "@/components/ToggleRow";
import { ChevronRightIcon } from "@/components/icons";
import { LoginRequired, useIsGuest } from "@/components/LoginRequired";
import { SectionTitle, Spinner } from "@/components/ui";
import { withdrawMyAccount } from "@/lib/account-link";
import { useAuth } from "@/lib/auth-context";
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
 * 로그아웃, 탈퇴하기가 모여 있습니다(2026-09-14~15에 내 프로필·설정 곳곳에서 옮겨 옴. 탈퇴는 2026-09-25에
 * "운영진에게 알려주세요" 안내에서 직접 하는 단추로 바뀜).
 */
export default function SettingsPage() {
  const { textScale, resolved, setTextScale, setTheme } = useDisplaySettings();
  const { user, profile, isAdmin, logOut } = useAuth();
  const router = useRouter();
  /*
   * 로그인 안 하고 둘러보는 사람 (2026-09-24) — 글씨 크기·화면 밝기는 기기에 적는 것이라 그대로 쓰고,
   * 알림·계정 칸 자리에는 로그인 안내 상자를 둡니다.
   */
  const isGuest = useIsGuest();
  /** "로그아웃 하시겠어요?" 시트가 떠 있는지 */
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  /** "정말 탈퇴할까요?" 시트가 떠 있는지 */
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

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

      {/*
        칸 사이 20px(gap-5) — 2026-09-25 사용자 "박스 부분들 사이 간격 좁혀줘", 28px(gap-7)에서.
        pt-3 — 제목 "설정"과 첫 칸 사이 12px 더 (2026-09-25 사용자 "설정이랑 글씨 크기 사이에 공백 더").
      */}
      <div className="flex flex-col gap-5 px-4 pt-3 pb-10">
        {isGuest ? null : <PushSection uid={user?.uid} />}

        {/*
          글씨 크기·화면은 켜기/끄기 스위치 줄입니다 (2026-09-24 사용자 요청 — 아이폰 "사운드 및 햅틱"처럼).
          예전엔 작게·중간·크게 / 라이트·다크 고르개였습니다.
        */}
        <section>
          <SectionTitle>글씨 크기</SectionTitle>
          {/*
            켜면 크게, 끄면 보통. 스위치는 둘뿐이라 "작게"는 없어졌습니다 —
            예전에 작게를 고른 원우는 꺼진 채로 보이고, 한 번 켰다 끄면 보통이 됩니다.
          */}
          <ToggleRow
            label="큰 글씨"
            checked={textScale === "large"}
            onChange={(on) => setTextScale(on ? "large" : "normal")}
          />
        </section>

        <section>
          <SectionTitle>화면</SectionTitle>
          {/*
            켜짐 여부는 "고른 값"이 아니라 **지금 실제로 보이는 밝기(resolved)** 입니다.
            아무것도 안 고른 원우는 폰을 따르므로, 폰에서 다크 모드를 켜면 스위치도 저절로 켜집니다.
            누르면 그때부터 이 앱만 그 밝기로 굳습니다(폰 설정이 바뀌면 풀림 — display-settings.ts).
          */}
          <ToggleRow
            label="다크 모드"
            checked={resolved === "dark"}
            onChange={(on) => setTheme(on ? "dark" : "light")}
          />
        </section>

        {/*
          로그아웃 — 설정 맨 아래, 원우 누구에게나 보입니다 (2026-09-14 사용자 요청으로 내 프로필에서 옮김).
          위에 "계정" 제목을 답니다 — 알림·글씨 크기·화면처럼 칸마다 제목이 있는 짜임에 맞춰
          (2026-09-15 사용자 요청). 위아래 간격은 이 목록의 gap-7이 줍니다.
          단추는 주황 채움·폭 가득, 위아래 12px(py-3) — 위 고르개들과 같은 약 48px 높이(2026-09-15에 py-4에서 줄임).
          나간 뒤 기록에 설정 화면이 남지 않도록 push가 아니라 replace로 로그인 화면에 갑니다.
          (가입 대기 화면 /pending에는 따로 로그아웃이 있습니다 — 그 화면엔 설정으로 가는 길이 없어서입니다.)
        */}
        {isGuest ? (
          <section>
            <SectionTitle>계정</SectionTitle>
            <LoginRequired />
          </section>
        ) : (
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

          {/* 누르면 바로 나가지 않고 "로그아웃 하시겠어요?" 시트를 띄웁니다(2026-09-22 사용자 요청 — 아래 LogoutSheet). */}
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            className="w-full rounded-2xl bg-brand-500 py-3 text-[15px] font-bold text-white shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            {/*
              글씨만 2px 위로 (2026-09-15, 위 고르개들과 같이). 이 단추는 flex가 아니라서 그냥 span에는
              transform이 안 먹습니다(글줄 안 인라인 요소) — inline-block이 꼭 필요합니다.
            */}
            {/* 1.75px — 2026-09-25 사용자 "0.25px 만큼 아래로" (2px에서). */}
            <span className="inline-block -translate-y-[1.75px]">로그아웃</span>
          </button>

          {/*
            탈퇴하기 — 로그아웃 아래 작은 회색 글씨 단추 (2026-09-25 사용자 요청. 그 전엔 "운영진에게 알려주세요" 안내만).
            누르면 바로 지우지 않고 경고가 담긴 확인 시트(WithdrawSheet)를 띄웁니다.
          */}
          <button
            type="button"
            onClick={() => setConfirmingWithdraw(true)}
            // 모양은 로그인 안내 상자의 "되돌아가기"와 같게 (2026-09-25 사용자가 그 캡처를 보내며 요청):
            // 굵은 ink-soft 15px 글씨 + 옅은 ink-faint 밑줄(1.25px, 글씨에서 4.25px 아래). 누르는 자리는 위아래 py-3.
            className="mt-2 w-full py-3 text-[15px]! font-bold text-ink-soft underline decoration-ink-faint decoration-[1.25px] underline-offset-[4.25px]"
          >
            탈퇴하기
          </button>
        </section>
        )}
      </div>

      {confirmingLogout ? (
        <LogoutSheet
          onClose={() => setConfirmingLogout(false)}
          onConfirm={async () => {
            await logOut();
            router.replace("/login");
          }}
        />
      ) : null}

      {confirmingWithdraw ? (
        <WithdrawSheet
          onClose={() => setConfirmingWithdraw(false)}
          onDone={() => router.replace("/login")}
        />
      ) : null}
    </div>
  );
}

/**
 * 탈퇴 확인 시트 (2026-09-25 사용자 요청 — "정말 탈퇴할까요?"와 함께 정보가 사라진다는 경고 문구).
 * 겉모양은 아래 LogoutSheet와 같고, 제목 아래 옅은 주황 경고 상자를 둡니다. 경고 상자·탈퇴 단추는 처음엔
 * 빨강(danger)이었는데 같은 날 사용자 요청으로 앱 주황으로 바꿨습니다. 경고 문구는 서버가 실제로 지우는 것과 맞춰 둡니다(lib/account-withdraw-server.ts).
 */
function WithdrawSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function withdraw() {
    setBusy(true);
    setFailed(false);
    try {
      await withdrawMyAccount();
      onDone();
    } catch {
      // 로그아웃은 이미 됐을 수 있어, 다시 로그인해서 시도하도록 안내합니다.
      setFailed(true);
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="탈퇴 확인"
      onClick={busy ? undefined : onClose}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(2px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
      >
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />

        <h2 className="mt-5 text-[24px] font-bold tracking-tight text-ink">정말 탈퇴할까요?</h2>

        {/* 경고 상자·탈퇴 단추는 앱 주황 (2026-09-25 사용자 "여기도 주황색 테마로" — 처음엔 빨강 danger). */}
        <div className="mt-4 rounded-2xl bg-brand-500/10 px-4 py-3.5 text-[14px] leading-relaxed text-brand-500">
          <p className="font-bold">⚠️ 탈퇴하면 되돌릴 수 없어요</p>
          <ul className="mt-1.5 list-disc pl-5">
            <li>로그인 계정이 바로 삭제되고, 합쳐 둔 구글·카카오·휴대폰 로그인도 모두 지워져요.</li>
            <li>프로필 사진, 생일, 알림 설정 같은 내 계정 정보가 모두 사라져요.</li>
            <li>다시 쓰려면 처음부터 새로 가입해야 해요.</li>
          </ul>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          원우수첩의 이름·회사·연락처와 그동안 쓴 글·사진·채팅은 남아요.
        </p>

        {failed ? (
          <p role="alert" className="mt-3 text-[13px] leading-relaxed text-danger">
            탈퇴하지 못했어요. 다시 로그인한 뒤 한 번 더 시도해 주세요.
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={withdraw}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-[13px] text-[16px] font-bold text-white transition active:scale-[0.99]"
        >
          {busy ? <Spinner className="h-5 w-5" /> : null}
          탈퇴하기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-2 w-full py-3 text-[15px]! font-bold text-ink-soft"
        >
          취소
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 로그아웃 확인 시트 (2026-09-22 사용자 요청 — 사용자가 보낸 캡처처럼).
 * 화면 아래에서 올라오는 흰 시트: 위 가운데 손잡이 막대 · 큰 제목 "로그아웃 하시겠어요?" ·
 * 폭 가득 주황 "로그아웃" · 그 아래 글씨만 있는 "취소". 뒤는 어둡게 덮고, 어두운 곳을 눌러도 닫힙니다.
 * 캡처는 보라색이지만 앱 브랜드색(주황)으로 맞췄습니다. 겉모양 짜임은 AccountMergeSheet와 같습니다.
 * 시트 아래 여백은 홈 인디케이터 자리 + 2px (2026-09-25 사용자 요청: "취소 밑에 흰색 공백 좀 줄여줘" 20px → 4px → 2px).
 * "취소" 단추 자체의 아래 12px(py-3)이 더해집니다. 탈퇴 시트(WithdrawSheet)도 같은 값입니다.
 */
function LogoutSheet({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="로그아웃 확인"
      onClick={busy ? undefined : onClose}
      /*
        포털이어도 React 이벤트는 설정 화면 상자까지 올라가, 시트 위를 옆으로 문지르면 "밀어서 뒤로"가
        움직입니다. 시트에서 시작한 손짓은 여기서 막습니다.
      */
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[24px] bg-surface px-6 pt-3 pb-[calc(2px+env(safe-area-inset-bottom))] sm:rounded-[24px] sm:pb-6"
      >
        {/* 손잡이 막대 — 시트라는 걸 알려 주는 표시입니다. */}
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />

        {/* mt-5 — 손잡이 막대와 제목 사이 20px (2026-09-25 사용자 요청: 28px → 16px → 20px). 탈퇴 시트도 같이. */}
        <h2 className="mt-5 text-[24px] font-bold tracking-tight text-ink">로그아웃 하시겠어요?</h2>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-[13px] text-[16px] font-bold text-white transition active:scale-[0.99]"
        >
          {busy ? <Spinner className="h-5 w-5" /> : null}
          로그아웃
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-2 w-full py-3 text-[15px]! font-bold text-ink-soft"
        >
          취소
        </button>
      </div>
    </div>,
    document.body,
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
 * 알림 켜기/끄기 — 글씨 크기·화면과 같은 모양의 스위치 줄입니다.
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

  return (
    <section>
      <SectionTitle>알림</SectionTitle>
      {/* 끄기·켜기 고르개였던 것을 스위치 줄로 (2026-09-24 사용자 요청). 켜고 끄는 동안 스위치 옆에 스피너가 돕니다. */}
      <ToggleRow
        label="알림 받기"
        checked={on}
        onChange={(next) => choose(next ? "on" : "off")}
        disabled={pending !== null || blocked !== null}
        icon={pending !== null ? <Spinner className="h-[18px] w-[18px]" /> : null}
      />
      {message ? (
        <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
