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
  { href: "/home", label: "홈", Icon: HomeIcon, backToTop: true },
  { href: "/members", label: "원우", Icon: UsersIcon, backToTop: true },
  { href: "/library", label: "자료", Icon: LibraryIcon, backToTop: true },
  // 채팅만 예외입니다. 채팅은 늘 맨 아래(가장 최근 메시지)를 보는 화면이라,
  // 맨 위로 올리면 옛날 메시지로 튕겨 나가 오히려 불편합니다.
  { href: "/chat", label: "채팅", Icon: ChatIcon, backToTop: false },
  { href: "/news", label: "소식", Icon: MegaphoneIcon, backToTop: true },
] as const;

/**
 * 화면을 맨 위로 부드럽게 올립니다.
 * 다만 "동작 줄이기"를 켜 둔 원우에게는 애니메이션 없이 곧바로 올립니다.
 */
function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[560px] items-stretch">
        {TABS.map(({ href, label, Icon, backToTop }) => {
          // /events 같은 하위 화면에서도 관련 탭이 켜져 보이도록 접두사로 비교합니다.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          // 탭의 첫 화면에 이미 서 있는지 (하위 화면에 들어와 있는 것과 구분합니다)
          const atTabRoot = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  // 인스타그램처럼, 지금 보고 있는 탭을 한 번 더 누르면 맨 위로 올라갑니다.
                  // 앨범 상세 같은 하위 화면에서는 그대로 두어, 원래대로 탭의
                  // 첫 화면으로 돌아가게 합니다.
                  if (!backToTop || !atTabRoot) return;
                  event.preventDefault();
                  scrollToTop();
                }}
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
