"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { ChevronLeftIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";

/**
 * 화면 상단 제목 줄.
 * 참고 디자인처럼 큰 제목 + 오른쪽에 보조 요소(프로필 아바타 등)를 둡니다.
 */
export default function PageHeader({
  title,
  eyebrow,
  right,
  back,
}: {
  title: ReactNode;
  /** 제목 위에 작게 붙는 문구 */
  eyebrow?: ReactNode;
  right?: ReactNode;
  /** 뒤로가기 화살표를 보여줄지 */
  back?: boolean;
}) {
  const router = useRouter();

  return (
    /*
     * 위 여백은 최소한만 둡니다. 브라우저에서는 6px,
     * 홈 화면에 추가한 앱에서는 노치·상태바 높이를 더해 제목이 가리지 않게 합니다.
     * (viewport-fit: cover 라서 안전 영역을 직접 챙겨야 합니다.)
     */
    <header
      className="flex items-start gap-3 px-5 pb-3"
      style={{ paddingTop: "calc(6px + env(safe-area-inset-top))" }}
    >
      {back ? (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로 가기"
          className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-stone-100"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[13px] font-medium text-ink-faint">{eyebrow}</p>
        ) : null}
        <h1 className="truncate text-[24px] font-bold tracking-tight text-ink">{title}</h1>
      </div>

      {right ? <div className="mt-0.5 shrink-0">{right}</div> : null}
    </header>
  );
}

/** 헤더 오른쪽에 놓는 내 프로필 진입 버튼 */
export function ProfileAvatarButton() {
  const { profile, user } = useAuth();
  const name = profile?.nickname || profile?.name || user?.displayName || "나";

  /*
   * 사진은 제목보다 눈에 먼저 들어오지 않게 작게 두고,
   * 손가락으로 누르는 범위만 보이지 않는 여백(::before)으로 48px쯤 넓혀둡니다.
   */
  return (
    <Link
      href="/profile"
      aria-label="내 프로필 열기"
      className="relative block rounded-full ring-2 ring-white transition before:absolute before:-inset-[7px] before:content-[''] active:scale-95"
    >
      <Avatar src={profile?.photoURL} name={name} seed={profile?.uid} size={34} />
    </Link>
  );
}
