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
import { useAuth } from "@/lib/auth-context";
import { useUnreadChatCount } from "@/lib/hooks";
import { UNREAD_BADGE_MAX } from "@/lib/constants";

/**
 * 하단 탭 5개 (기획서 A안).
 *
 * 6탭(B안)으로 바꾸고 싶으면 이 배열에 아래 항목을 추가하면 됩니다.
 *   { href: "/events", label: "일정", Icon: CalendarIcon }
 * 다만 360px 화면에서는 라벨이 좁아지므로 A안을 권장합니다.
 * (A안에서 모임 일정은 홈 대시보드의 D-day 카드로 들어갑니다.)
 */
/**
 * 다섯 탭 모두, 보고 있는 탭을 한 번 더 누르면 맨 위로 올라갑니다.
 *
 * 채팅도 마찬가지입니다. 예전에는 채팅 탭이 곧 대화 화면이라 늘 맨 아래
 * (가장 최근 메시지)를 봐야 해서 예외로 두었지만, 지금 채팅 탭은 방 목록이고
 * 대화는 따로 떨어진 화면(거기서는 이 탭바가 아예 없습니다)이라 예외가
 * 필요 없어졌습니다.
 */
const TABS = [
  { href: "/home", label: "홈", Icon: HomeIcon },
  { href: "/members", label: "원우", Icon: UsersIcon },
  { href: "/library", label: "자료", Icon: LibraryIcon },
  { href: "/chat", label: "채팅", Icon: ChatIcon },
  { href: "/news", label: "소식", Icon: MegaphoneIcon },
] as const;

/**
 * 화면을 맨 위로 부드럽게 올립니다.
 * 다만 "동작 줄이기"를 켜 둔 원우에게는 애니메이션 없이 곧바로 올립니다.
 */
function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

  try {
    window.scrollTo({ top: 0, behavior });
  } catch {
    // 옵션 방식을 못 알아듣는 오래된 브라우저를 위한 대비책입니다.
    window.scrollTo(0, 0);
  }
}

export default function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadChatCount = useUnreadChatCount(user?.uid);

  return (
    /*
     * 당근처럼 화면 아래에 떠 있는 가로로 긴 알약 모양입니다.
     * 화면 맨 아래에 붙이지 않고 조금 띄워야 알약으로 보이므로,
     * 아이폰 홈 바(safe-area) 위로 한 뼘 더 올려 둡니다.
     *
     * 좌우 여백은 px-5 — 화면 안쪽 카드들과 같은 값이라, 알약의 양 끝이
     * 원우수첩 카드의 양 끝과 정확히 맞아떨어집니다.
     * 폭 상한 520px은 본문 최대폭 560px에서 이 여백(20px씩)을 뺀 값입니다.
     */
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 z-30 px-5"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      {/* 알약을 낮게 눌러 담으려고 안쪽 여백을 최소로 둡니다. */}
      <ul className="mx-auto flex w-full max-w-[520px] items-stretch rounded-full bg-white p-1 shadow-[var(--shadow-float)]">
        {TABS.map(({ href, label, Icon }) => {
          // /events 같은 하위 화면에서도 관련 탭이 켜져 보이도록 접두사로 비교합니다.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          // 탭의 첫 화면에 이미 서 있는지 (하위 화면에 들어와 있는 것과 구분합니다)
          const atTabRoot = pathname === href;
          /*
           * 안 읽은 개수 배지는 채팅에만 답니다. 모든 방을 통틀어 센 개수입니다.
           * 대화방 안에서는 탭바 자체가 없으므로(MainShell) 여기서 가릴 일은 없고,
           * 채팅 목록에서는 어느 방이 안 읽혔는지 줄마다 따로 표시됩니다.
           */
          const badge = href === "/chat" ? unreadChatCount : 0;
          /*
           * 고른 탭은 아이콘과 글씨가 함께 브랜드 주황이 되고,
           * 아이콘은 속까지 꽉 찹니다. 뒤에 깔던 회색 알약은 없앴습니다.
           * 색 하나로 어디에 있는지 알 수 있으면 그게 가장 조용합니다.
           */
          const itemClassName = active ? "text-brand-500" : "text-ink-muted";
          /*
           * 탭 한 칸의 위아래 여백은 알약 높이와 덩어리의 위치를 함께 정합니다.
           * 위 6px(pt-1.5) + 아래 10px(pb-2.5).
           *  - 두 값의 합(16px)이 알약 높이를 정합니다. 같이 키우면 높아집니다.
           *  - 두 값의 차(4px) 때문에 아이콘과 글씨를 합친 덩어리가
           *    수학적 한가운데보다 2px 위에 섭니다. 눈으로는 이쪽이 가운데로
           *    보입니다. 정확히 가운데로 되돌리려면 두 값을 같게 두면 됩니다.
           */
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  // 인스타그램처럼, 지금 보고 있는 탭을 한 번 더 누르면 맨 위로 올라갑니다.
                  // 앨범 상세 같은 하위 화면에서는 그대로 두어, 원래대로 탭의
                  // 첫 화면으로 돌아가게 합니다.
                  if (!atTabRoot) return;
                  event.preventDefault();
                  scrollToTop();
                }}
                className={`flex h-full flex-col items-center justify-center rounded-full pt-1.5 pb-2.5 transition ${itemClassName}`}
              >
                <span className="relative flex items-center justify-center">
                  <Icon
                    className="h-[27px] w-[27px]"
                    strokeWidth={active ? 2 : 1.7}
                    filled={active}
                  />

                  {badge > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 left-[calc(50%+6px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums"
                    >
                      {badge > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : badge}
                    </span>
                  ) : null}
                </span>
                {/*
                  아이콘 SVG는 24 단위 도형을 27px 상자에 그려서 아래쪽에 4px쯤
                  빈 공간이 딸려 옵니다. 그래서 여기 간격이 0이어도 눈에는
                  4px쯤 떨어져 보입니다. 더 붙이려면 -mt-, 더 벌리려면 mt-.
                */}
                <span
                  className={`text-[13px] leading-none ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  {label}
                  {/* 배지 숫자는 눈으로만 보이므로, 화면 낭독기에는 말로 알려줍니다. */}
                  {badge > 0 ? (
                    <span className="sr-only">, 안 읽은 메시지 {badge}개</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
