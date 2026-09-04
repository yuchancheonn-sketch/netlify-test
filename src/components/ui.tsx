import type { ReactNode } from "react";

/** 흰 배경 + 둥근 모서리 + 은은한 그림자. 앱 전체 카드의 기본형입니다. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-white shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

/** 목록 위에 붙는 작은 제목 */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[17px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** 목록이 비었을 때 보여주는 안내. 모든 목록 화면에서 씁니다. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon ? <div className="mb-1 text-brand-300">{icon}</div> : null}
      <p className="text-[15px] font-bold text-ink-soft">{title}</p>
      {description ? (
        <p className="max-w-[26ch] text-[13px] leading-relaxed text-ink-faint">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** 데이터를 불러오는 동안 자리를 잡아주는 회색 블록 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />;
}

/** 에러 상황 안내 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-[14px] leading-relaxed text-ink-soft">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-brand-50 px-4 py-2 text-[14px] font-bold text-brand-500"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

/** 가로로 꽉 차는 기본 버튼 */
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  loading,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-4 text-[16px] font-bold text-white transition active:scale-[0.99] disabled:bg-brand-200 disabled:text-white ${className}`}
    >
      {loading ? <Spinner className="h-5 w-5" /> : null}
      {children}
    </button>
  );
}

/** 원우 구분(일반/청년) 같은 짧은 상태 표시 */
export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "neutral";
}) {
  const styles =
    tone === "brand"
      ? "bg-brand-50 text-brand-500"
      : "bg-stone-100 text-ink-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${styles}`}
    >
      {children}
    </span>
  );
}

/** 로딩 스피너 */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 폼 입력 위에 붙는 라벨 */
export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[15px] font-bold text-ink">
        {children}
      </label>
      {hint ? <span className="text-[12px] text-ink-faint">{hint}</span> : null}
    </div>
  );
}

/** 흰 카드형 입력창. 참고 디자인의 입력 필드 스타일입니다. */
export const inputClassName =
  "w-full rounded-2xl border border-transparent bg-white px-5 py-4 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:ring-4 focus:ring-brand-100";

/** 폼 아래에 뜨는 오류 문구 */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-[13px] font-medium text-red-600">
      {children}
    </p>
  );
}
