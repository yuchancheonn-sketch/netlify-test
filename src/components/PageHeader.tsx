"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeftIcon, PersonIcon, SettingsIcon } from "@/components/icons";

/**
 * 화면 상단 제목 줄.
 * 참고 디자인처럼 큰 제목 + 오른쪽에 보조 요소(프로필 아바타 등)를 둡니다.
 */
export default function PageHeader({
  title,
  eyebrow,
  right,
  back,
  backHref,
  wordmark,
}: {
  title: ReactNode;
  /** 제목 위에 작게 붙는 문구 */
  eyebrow?: ReactNode;
  right?: ReactNode;
  /**
   * 제목을 앱 로고처럼 보이게 합니다. 홈에서만 씁니다.
   *
   * 홈은 "여기가 무슨 화면인가"를 알려줄 필요가 없는 자리라, 제목 칸을
   * 앱의 이름 그 자체로 내줍니다.
   *
   * 다른 화면 제목(22px·700)보다 오히려 작고 옅게 씁니다. 여기서 이름은
   * 무언가를 알려주는 제목이 아니라 그저 어느 앱인지 알려주는 표시라,
   * 아래 일정 카드보다 앞서 나오지 않는 편이 낫습니다.
   *
   * 굵기 600은 layout.tsx에서 이 한 곳을 위해 따로 불러옵니다. 500은 옅고
   * 700은 다른 화면 제목과 같아져서, 그 사이 한 단계가 필요했습니다.
   * (불러오지 않은 굵기를 적으면 브라우저가 억지로 만들어내며 획이 뭉갭니다.)
   */
  wordmark?: boolean;
  /** 뒤로가기 화살표를 보여줄지 (브라우저 기록을 한 칸 되돌립니다) */
  back?: boolean;
  /**
   * 뒤로가기가 갈 곳을 못 박고 싶을 때.
   *
   * 기록을 되돌리는 대신 이 주소로 갑니다. 여러 곳에서 들어올 수 있는 화면인데
   * 돌아갈 자리는 하나로 정해두고 싶을 때 씁니다. (예: 모임 → 홈)
   */
  backHref?: string;
}) {
  const router = useRouter();
  const showBack = back || !!backHref;

  return (
    /*
     * 좌우 여백은 각 화면의 본문(px-4)과 같은 값이라 제목과 카드의 왼쪽 끝이 맞습니다.
     *
     * 위 여백은 최소한만 둡니다. 브라우저에서는 6px,
     * 홈 화면에 추가한 앱에서는 노치·상태바 높이를 더해 제목이 가리지 않게 합니다.
     * (viewport-fit: cover 라서 안전 영역을 직접 챙겨야 합니다.)
     */
    <header
      className="flex items-start gap-3 px-4 pb-3"
      style={{ paddingTop: "calc(6px + env(safe-area-inset-top))" }}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          aria-label="뒤로 가기"
          className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-stone-100"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[13px] font-medium text-ink-faint">{eyebrow}</p>
        ) : null}
        <h1
          className={`truncate tracking-tight text-ink ${
            wordmark ? "text-[20px] font-semibold" : "text-[22px] font-bold"
          }`}
        >
          {title}
        </h1>
      </div>

      {right ? <div className="mt-0.5 shrink-0">{right}</div> : null}
    </header>
  );
}

/**
 * 헤더 오른쪽에 놓는 단추 두 개 — 내 프로필과 설정.
 *
 * 예전에는 내 프로필 사진을 동그랗게 띄웠습니다. 사람 아이콘으로 바꾼 이유:
 * 사진은 사람마다 색과 밝기가 제각각이라 제목 줄에서 혼자 튀고, 옆에 설정
 * 아이콘이 서면 둘의 결이 맞지 않습니다.
 */
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <HeaderIconLink href="/profile" label="내 프로필 열기">
        <PersonIcon className="h-[23px] w-[23px]" />
      </HeaderIconLink>
      <HeaderIconLink href="/settings" label="설정 열기">
        <SettingsIcon className="h-[23px] w-[23px]" />
      </HeaderIconLink>
    </div>
  );
}

/**
 * 헤더 아이콘 단추 한 개.
 *
 * 아이콘은 23px이지만 단추는 40px입니다. 손끝이 닿는 자리는 아이콘보다
 * 넉넉해야 합니다. -mr-2는 오른쪽 끝 단추의 그 여백만큼을 도로 당겨,
 * 아이콘이 화면 가장자리에서 제목과 같은 거리에 서게 합니다.
 */
function HeaderIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition last:-mr-2 active:bg-stone-100 active:scale-95"
    >
      {children}
    </Link>
  );
}
