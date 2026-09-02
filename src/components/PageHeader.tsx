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
    <header className="flex items-start gap-3 px-5 pt-5 pb-4">
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

      {right ? <div className="mt-1 shrink-0">{right}</div> : null}
    </header>
  );
}

/** 헤더 오른쪽에 놓는 내 프로필 진입 버튼 */
export function ProfileAvatarButton() {
  const { profile, user } = useAuth();
  const name = profile?.nickname || profile?.name || user?.displayName || "나";

  return (
    <Link
      href="/profile"
      aria-label="내 프로필 열기"
      className="block rounded-full ring-2 ring-white transition active:scale-95"
    >
      <Avatar src={profile?.photoURL} name={name} seed={profile?.uid} size={44} />
    </Link>
  );
}
