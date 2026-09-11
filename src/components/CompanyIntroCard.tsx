"use client";

import { useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { FieldError, FieldLabel, PrimaryButton, Skeleton, inputClassName } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cohortOf, inCohort } from "@/lib/cohort";
import { displayUrl, normalizeCompanyUrl, orderForDay } from "@/lib/company-intros";
import {
  COMPANY_INTRO_MAX_LENGTH,
  COMPANY_MAX_LENGTH,
  COMPANY_URL_MAX_LENGTH,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { useCompanyIntros } from "@/lib/hooks";
import type { CompanyIntroDoc } from "@/lib/types";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useKstDay } from "@/lib/use-kst-day";
import { useViewCohort } from "@/lib/use-view-cohort";

/**
 * 홈의 "원우 회사" 카드 — 원우들이 서로의 회사를 알리는 자리 (2026-09-11).
 *
 * 수익 광고를 넣는 대신, 광고 자리를 원우 회사 소개로 씁니다. 돈은 오가지 않고
 * 원우가 자기 회사를 직접 올립니다(회사 이름 · 한 줄 소개 · 홈페이지).
 *
 *  - 하루에 한 곳씩 맨 앞에 섭니다(lib/company-intros.ts의 orderForDay). ‹ ›로 다른 회사도 넘겨 봅니다.
 *  - 홈의 다른 칸처럼 보고 있는 기수의 회사만 보입니다.
 *  - 아직 아무도 안 올렸으면 "우리 회사 알리기" 단추 하나만 둡니다.
 *  - 본인 것만 올리고 고치고 내립니다(보안 규칙). 운영진은 내리기만 됩니다 — 콘솔 또는 규칙상.
 */
export default function CompanyIntroCard() {
  const { user } = useAuth();
  const { cohort } = useViewCohort();
  const day = useKstDay();
  const intros = useCompanyIntros();
  /** 오늘 맨 앞에서부터 몇 번 넘겼는지. 뒤로 넘기면 음수가 됩니다. */
  const [step, setStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const ordered = orderForDay(
    intros.data.filter((entry) => inCohort(entry, cohort)),
    day,
  );
  const count = ordered.length;
  const current = count > 0 ? ordered[((step % count) + count) % count] : null;
  /** 내 것은 기수와 관계없이 찾습니다 — 올렸는지는 기수를 바꿔 봐도 같아야 합니다. */
  const mine = intros.data.find((entry) => entry.uid === user?.uid) ?? null;

  return (
    <>
      <section className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold text-ink">원우 회사</h2>
          {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
          {current ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex shrink-0 items-center gap-0.5 text-[14px]! font-medium text-ink-muted"
            >
              {mine ? "내 회사 수정" : "내 회사 알리기"}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {intros.loading ? (
          <Skeleton className="mt-4 h-[88px] rounded-2xl" />
        ) : intros.error ? (
          <p className="mt-4 text-center text-[13px] font-medium text-danger">{intros.error}</p>
        ) : current ? (
          <>
            <div className="mt-4">
              <p className="text-[20px] leading-snug font-bold break-keep text-ink">
                {current.company}
              </p>
              {current.intro ? (
                <p className="mt-1.5 text-[15px] leading-relaxed break-keep text-ink-soft">
                  {current.intro}
                </p>
              ) : null}
              <p className="mt-3 text-[13px] font-medium text-ink-muted">
                {current.name}
                {current.position ? ` · ${current.position}` : ""}
              </p>
            </div>

            {current.url || count > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                {current.url ? (
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-0.5 text-[14px] font-bold text-brand-500"
                  >
                    <span className="truncate">{displayUrl(current.url)}</span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0" />
                  </a>
                ) : (
                  <span />
                )}

                {count > 1 ? (
                  /* -mr-1.5: 손끝 자리(32px)는 넉넉히 두고, 화살표 끝은 카드 오른쪽 여백 줄에 맞춥니다. */
                  <div className="-mr-1.5 flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => setStep((previous) => previous - 1)}
                      aria-label="이전 회사"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition active:bg-fill"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="min-w-[3ch] text-center text-[13px] font-medium text-ink-muted tabular-nums">
                      {((step % count) + count) % count + 1} / {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep((previous) => previous + 1)}
                      aria-label="다음 회사"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition active:bg-fill"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-4">
            <PrimaryButton size="compact" onClick={() => setSheetOpen(true)}>
              {mine ? "내 회사 수정" : "우리 회사 알리기"}
            </PrimaryButton>
          </div>
        )}
      </section>

      {sheetOpen ? <CompanyIntroSheet current={mine} onClose={() => setSheetOpen(false)} /> : null}
    </>
  );
}

/** 내 회사를 올리고·고치고·내리는 시트. 이름·직책·기수는 내 프로필에서 가져옵니다. */
function CompanyIntroSheet({
  current,
  onClose,
}: {
  current: CompanyIntroDoc | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  // 처음 올릴 때는 수첩에 적어 둔 회사 이름으로 채워 둡니다.
  const [company, setCompany] = useState(current?.company ?? profile?.company ?? "");
  const [intro, setIntro] = useState(current?.intro ?? "");
  const [url, setUrl] = useState(current?.url ?? "");
  const [saving, setSaving] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);

  async function save() {
    if (!user || !profile) return;
    const trimmedCompany = company.trim();
    if (!trimmedCompany) {
      setError("회사 이름을 적어 주세요.");
      return;
    }
    const normalizedUrl = normalizeCompanyUrl(url);
    if (normalizedUrl === null || normalizedUrl.length > COMPANY_URL_MAX_LENGTH) {
      setError("홈페이지 주소를 다시 확인해 주세요.");
      return;
    }

    setSaving("save");
    setError(null);
    try {
      // 응답을 잠깐만 기다리고 닫습니다 — 이유는 lib/firestore-commit.ts에.
      await commitWrite(
        setDoc(doc(db, "companyIntros", user.uid), {
          uid: user.uid,
          company: trimmedCompany,
          intro: intro.trim(),
          url: normalizedUrl,
          name: profile.name || profile.nickname || "원우",
          position: profile.position ?? "",
          cohort: cohortOf(profile.cohort),
          updatedAt: serverTimestamp(),
        }),
      );
      onClose();
    } catch (caught) {
      setError(
        saveErrorMessage(
          caught,
          "저장 권한이 없어요. 운영진에게 알려주세요. (Firestore 보안 규칙 게시 필요 · permission-denied)",
        ),
      );
      setSaving(null);
    }
  }

  async function remove() {
    if (!user) return;
    setSaving("remove");
    setError(null);
    try {
      await commitWrite(deleteDoc(doc(db, "companyIntros", user.uid)));
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught));
      setSaving(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="내 회사 알리기"
      onClick={onClose}
    >
      {/* 손잡이는 스크롤 밖에 따로 둡니다 — 이유는 MemberEditSheet의 같은 자리 설명을 참고하세요. */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-canvas sm:rounded-[16px]"
        style={sheetStyle}
      >
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7">
          <h2 className="mb-5 text-[19px] font-bold text-ink">
            {current ? "내 회사 수정" : "내 회사 알리기"}
          </h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <FieldLabel
                htmlFor="company-intro-company"
                hint={`${company.length}/${COMPANY_MAX_LENGTH}`}
              >
                회사 이름
              </FieldLabel>
              <input
                id="company-intro-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                maxLength={COMPANY_MAX_LENGTH}
                autoComplete="organization"
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel
                htmlFor="company-intro-text"
                hint={`${intro.length}/${COMPANY_INTRO_MAX_LENGTH}`}
              >
                한 줄 소개
              </FieldLabel>
              <input
                id="company-intro-text"
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                maxLength={COMPANY_INTRO_MAX_LENGTH}
                placeholder="어떤 일을 하는 회사인가요?"
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel htmlFor="company-intro-url">홈페이지</FieldLabel>
              {/* type="url"은 https://까지 적어야 통과시켜서, 글자 칸으로 받고 앱이 붙입니다. */}
              <input
                id="company-intro-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={COMPANY_URL_MAX_LENGTH}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="www.example.com"
                className={inputClassName}
              />
            </div>

            <div>
              {error ? <FieldError>{error}</FieldError> : null}
              <PrimaryButton
                type="submit"
                loading={saving === "save"}
                disabled={saving !== null}
                className={error ? "mt-3" : ""}
              >
                {current ? "저장" : "올리기"}
              </PrimaryButton>
            </div>
          </form>

          {current ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving !== null}
              className="mt-5 w-full py-2 text-[14px]! font-bold text-danger"
            >
              {saving === "remove" ? "내리는 중…" : "내 회사 내리기"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-2xl py-3 text-[15px] font-bold text-ink-faint"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
