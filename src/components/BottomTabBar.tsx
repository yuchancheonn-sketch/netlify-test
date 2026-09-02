"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatIcon,
  HomeIcon,
  LibraryIcon,
  MegaphoneIcon,
  UsersIcon,
} from "@/components/icons";

/**
 * 하단 탭 5개 (기획서 A안).
 *
 * 6탭(B안)으로 바꾸고 싶으면 이 배열에 아래 항목을 추가하면 됩니다.
 *   { href: "/events", label: "일정", Icon: CalendarIcon }
 * 다만 360px 화면에서는 라벨이 좁아지므로 A안을 권장합니다.
 * (A안에서 모임 일정은 홈 대시보드의 D-day 카드로 들어갑니다.)
 */
const TABS = [
  { href: "/home", label: "홈", Icon: HomeIcon },
  { href: "/members", label: "원우", Icon: UsersIcon },
  { href: "/library", label: "자료", Icon: LibraryIcon },
  { href: "/chat", label: "채팅", Icon: ChatIcon },
  { href: "/news", label: "소식", Icon: MegaphoneIcon },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[560px] items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          // /events 같은 하위 화면에서도 관련 탭이 켜져 보이도록 접두사로 비교합니다.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                    active ? "bg-brand-50 text-brand-700" : "text-ink-faint"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.7} />
                </span>
                <span
                  className={`text-[11px] ${
                    active ? "font-bold text-brand-700" : "font-medium text-ink-faint"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
