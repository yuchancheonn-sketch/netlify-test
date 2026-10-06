"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog, Sheet, SheetActions } from "@/components/Sheet";
import { PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { blockUser, REPORT_REASONS, submitReport, type ReportTarget } from "@/lib/moderation";

/**
 * 신고하기·차단하기 창 (사용자 요청 2026-10-06, 구글 플레이 출시 준비 — 뉴웨이브앱 ModerationDialogs를 애기애타 색·공용 Sheet로 옮김).
 * 쓰는 화면은 useModeration()을 한 번 부르고, 반환된 dialogs를 화면 안 어디든 한 번 그린 다음,
 * 메뉴에서 openReport(...) / askBlock(...)만 부르면 됩니다.
 * 신고하면 운영진 화면 "신고" 탭에 쌓이고 운영진에게 폰 알림이 갑니다.
 */
export function useModeration(): {
  openReport: (target: ReportTarget) => void;
  askBlock: (uid: string, name: string) => void;
  dialogs: ReactNode;
} {
  const { user, profile } = useAuth();
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<{ uid: string; name: string } | null>(null);

  const dialogs = (
    <>
      {report && user ? (
        <ReportSheet
          target={report}
          reporter={{ uid: user.uid, name: profile?.name ?? "" }}
          onClose={() => setReport(null)}
          onBlock={() => {
            setBlock({ uid: report.uid, name: report.name });
            setReport(null);
          }}
        />
      ) : null}
      {block && user ? (
        <ConfirmDialog
          title={`${block.name}님을 차단할까요?`}
          description="차단하면 이 사람의 소식·채팅 등이 내 화면에서 보이지 않아요. 설정의 '차단한 사용자'에서 언제든 풀 수 있어요."
          confirmLabel="차단하기"
          onConfirm={() => blockUser(user.uid, block.uid)}
          onClose={() => setBlock(null)}
        />
      ) : null}
    </>
  );
  return { openReport: setReport, askBlock: (uid, name) => setBlock({ uid, name }), dialogs };
}

function ReportSheet({
  target,
  reporter,
  onClose,
  onBlock,
}: {
  target: ReportTarget;
  reporter: { uid: string; name: string };
  onClose: () => void;
  onBlock: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitReport(reporter, target, reason, detail);
      setDone(true);
    } catch {
      setError("신고하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Sheet title="신고가 접수됐어요" onClose={onClose} footer={<PrimaryButton size="sm" onClick={onClose}>확인</PrimaryButton>}>
        <p className="break-keep text-[15px] leading-relaxed text-ink-soft">운영진이 내용을 확인하고 조치할게요. 알려 줘서 고마워요.</p>
        {target.uid && target.uid !== reporter.uid ? (
          <button type="button" onClick={onBlock} className="mt-4 mb-4 text-[14px]! font-bold text-ink-muted underline underline-offset-4">
            {`${target.name}님 차단하기`}
          </button>
        ) : null}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="신고하기"
      onClose={onClose}
      footer={<SheetActions onCancel={onClose} confirmLabel={busy ? "보내는 중…" : "신고하기"} disabled={!reason || busy} loading={busy} onConfirm={() => void submit()} />}
    >
      <p className="mb-3 text-[13px] text-ink-muted">
        {target.type === "user"
          ? `${target.name}님을 신고하는 이유를 골라 주세요. 신고한 사람은 상대에게 알려지지 않아요.`
          : target.name
            ? `${target.name}님의 글을 신고하는 이유를 골라 주세요. 신고한 사람은 상대에게 알려지지 않아요.`
            : "이 글을 신고하는 이유를 골라 주세요. 신고한 사람은 알려지지 않아요."}
      </p>
      <div role="radiogroup" aria-label="신고 이유" className="flex flex-col gap-2">
        {REPORT_REASONS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={reason === item}
            onClick={() => setReason(item)}
            className={`rounded-2xl border-[1.5px] px-4 py-3 text-left text-[15px]! font-medium transition ${
              reason === item ? "border-brand-500 bg-brand-50 text-brand-500" : "border-transparent bg-fill text-ink-soft"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-4 mb-2">
        <label htmlFor="report-detail" className="mb-1.5 block text-[13px] font-bold text-ink-soft">
          자세한 내용 <span className="font-medium text-ink-faint">(선택)</span>
        </label>
        <textarea
          id="report-detail"
          rows={3}
          maxLength={300}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          className="block w-full resize-none rounded-2xl bg-fill px-4 py-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      {error ? (
        <p role="alert" className="mb-2 text-[12px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
