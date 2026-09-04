"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

/**
 * 회색 알약을 끌고 있는 동안의 상태.
 *
 * 알약은 평소에 지금 탭 자리에 가만히 있다가, 손가락을 따라 좌우로만 움직입니다.
 * 끌지 않을 때는 이 값이 null이고, 알약 자리는 주소(activeIndex)에서 바로 나옵니다.
 */
type PillDrag = {
  /** 손가락을 처음 댄 가로 위치 */
  startX: number;
  /** 탭 한 칸의 픽셀 폭. 끌기 시작할 때 한 번만 재둡니다. */
  slot: number;
  /** 지금 밀려난 거리(px). 탭바 밖으로는 못 나가게 잘라 둡니다. */
  dx: number;
  /** 손을 뗀 뒤 제자리를 찾아가는 중인지 (이때만 애니메이션을 켭니다) */
  settling: boolean;
  /**
   * 손을 떼면서 이동하기로 정한 탭.
   * 주소가 여기까지 따라오면 이 상태를 놓아주고 알약을 주소에 다시 맡깁니다.
   */
  target: number | null;
};

/**
 * 알약을 끈 거리가 몇 칸째인지.
 *
 * 지나온 칸 수만 셉니다 — 한 칸 반을 끌었으면 두 칸째에는 아직 못 닿았으므로
 * 방금 지나온 한 칸째로 봅니다. 반올림하지 않는 것이 중요합니다. 반올림하면
 * 한 칸 반에서 두 칸째로 튀어, 아직 닿지도 않은 탭으로 넘어가 버립니다.
 * (음수도 같습니다: 왼쪽으로 한 칸 반은 왼쪽 한 칸째입니다.)
 */
function passedSlots(dx: number, slot: number): number {
  return Math.trunc(dx / slot);
}

/** 알약 바깥 여백(p-1 = 4px). 칸 폭을 계산할 때 양쪽으로 빼줍니다. */
const BAR_PADDING = 4;

/**
 * 회색 알약이 한 칸보다 좌우로 더 나오는 길이(px).
 *
 * 칸 폭과 똑같으면 아이콘·글씨가 알약 가장자리에 닿아 답답해 보입니다.
 * 여기서 3px보다 키우면 양 끝 탭에서 알약이 탭바 테두리를 넘어갑니다
 * (칸 바깥으로 남은 여백이 BAR_PADDING뿐이라서요).
 */
const PILL_BLEED = 3;

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const unreadChatCount = useUnreadChatCount(user?.uid);

  const listRef = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<PillDrag | null>(null);
  /** 끌고 난 직후의 손뗌이 링크 이동으로 이어지지 않도록 막는 표시 */
  const draggedRef = useRef(false);

  // /events 같은 하위 화면에서도 관련 탭이 켜져 보이도록 접두사로 비교합니다.
  const activeIndex = TABS.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  /*
   * 주소가 목적지까지 따라왔으면 직접 잡고 있던 자리를 놓아줍니다.
   * 이 시점에 알약의 위치는 양쪽 계산이 똑같아서 화면은 꿈쩍도 하지 않습니다.
   * (효과가 아니라 렌더 중에 맞추는 이유는, 주소가 바뀌는 순간과 알약이 풀리는
   *  순간이 한 프레임이라도 어긋나면 알약이 한 칸 튀기 때문입니다.)
   */
  if (drag && drag.target !== null && drag.target === activeIndex) {
    setDrag(null);
  }

  /** 탭 한 칸의 픽셀 폭 */
  function slotWidth(): number {
    const width = listRef.current?.clientWidth ?? 0;
    if (!width) return 0;
    return (width - BAR_PADDING * 2) / TABS.length;
  }

  function handleTouchStart(event: React.TouchEvent) {
    draggedRef.current = false;
    if (activeIndex < 0 || event.touches.length !== 1) return;

    const list = listRef.current;
    const slot = slotWidth();
    if (!list || !slot) return;

    // 회색 알약을 짚었을 때만 끌기가 시작됩니다. 다른 탭을 누른 건 그냥 이동입니다.
    const touchX = event.touches[0].clientX - list.getBoundingClientRect().left - BAR_PADDING;
    const pillStart = activeIndex * slot;
    if (touchX < pillStart || touchX > pillStart + slot) return;

    setDrag({ startX: event.touches[0].clientX, slot, dx: 0, settling: false, target: null });
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (!drag || drag.settling) return;

    // 왼쪽 끝 탭보다 왼쪽으로, 오른쪽 끝 탭보다 오른쪽으로는 나가지 않습니다.
    const lowest = -activeIndex * drag.slot;
    const highest = (TABS.length - 1 - activeIndex) * drag.slot;
    const dx = Math.min(highest, Math.max(lowest, event.touches[0].clientX - drag.startX));

    // 조금이라도 끌었으면 손을 뗄 때 링크가 열리지 않게 막아둡니다.
    if (Math.abs(dx) > 4) draggedRef.current = true;
    setDrag({ ...drag, dx });
  }

  function handleTouchEnd() {
    if (!drag) return;

    /*
     * 지나온 칸까지만 갑니다.
     * 한 칸도 못 지났으면(반 칸쯤 끌다 말았으면) 아무 일 없이 제자리로 돌아갑니다.
     */
    const passed = passedSlots(drag.dx, drag.slot);
    const target = activeIndex + passed;

    if (passed !== 0 && TABS[target]) {
      // 그 탭 자리에 세워두고 이동합니다. 주소가 따라오면 위에서 풀어줍니다.
      setDrag({ ...drag, dx: passed * drag.slot, settling: true, target });
      router.push(TABS[target].href);
    } else {
      setDrag({ ...drag, dx: 0, settling: true, target: null });
    }
  }

  /*
   * 지금 주황으로 켜둘 탭 — 손을 떼면 가게 될 그 탭입니다.
   *
   * 손을 뗐을 때와 똑같은 셈법(지나온 칸까지만)을 씁니다. 여기만 반올림하면
   * 한 칸 반쯤 끌었을 때 두 칸째가 주황으로 켜졌다가 손을 떼면 한 칸째로
   * 가버려서, 보이는 것과 벌어지는 일이 어긋납니다.
   */
  const coveredIndex =
    drag && drag.slot
      ? Math.min(
          TABS.length - 1,
          Math.max(0, activeIndex + passedSlots(drag.dx, drag.slot)),
        )
      : activeIndex;

  /** 알약 한 칸의 폭을 CSS로 적은 것 (좌우 여백 4px씩을 뺀 나머지를 나눕니다) */
  const slotCss = `((100% - ${BAR_PADDING * 2}px) / ${TABS.length})`;

  return (
    /*
     * 당근처럼 화면 아래에 떠 있는 가로로 긴 알약 모양입니다.
     * 화면 맨 아래에 붙이지 않고 조금 띄워야 알약으로 보이므로,
     * 아이폰 홈 바(safe-area) 위로 한 뼘 더 올려 둡니다.
     *
     * ★ 띄우는 값(아래 0px)을 바꾸면 MainShell도 같이 고쳐야 합니다.
     *   흐림 층(BottomTabBarScrim)의 높이와 본문 아래 여백이 이 값에서 나옵니다.
     *
     * 좌우 여백은 px-5(20px) — 화면 안쪽 카드들(px-4)보다 4px씩 더 두어
     * 알약이 카드보다 살짝 좁습니다. 떠 있는 알약이라 안으로 조금 들어와 있는
     * 편이 자연스럽습니다.
     * 폭 상한 520px은 본문 최대폭 560px에서 이 여백(20px씩)을 뺀 값입니다.
     */
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 z-30 px-5"
      style={{ bottom: "calc(0px + env(safe-area-inset-bottom))" }}
    >
      {/*
        알약을 낮게 눌러 담으려고 안쪽 여백을 최소로 둡니다.

        바탕은 불투명한 흰색이 아니라 유리처럼 둡니다 — 흰색 75%에
        뒤를 흐리는 backdrop-blur를 얹어, 알약 아래로 지나가는 글과 사진이
        희미하게 비칩니다. 인스타·당근의 하단 바와 같은 방식입니다.
        흰색을 이보다 더 묽게 하면 글씨가 뒷 내용과 겹쳐 읽기 힘들어지고,
        알약 아래쪽 절반에 깔린 흐림 층(MainShell)과의 경계도 드러납니다.
      */}
      <ul
        ref={listRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        /* 세로 스크롤은 브라우저에 맡기고 가로는 알약 끌기에 씁니다. */
        style={{ touchAction: "pan-y" }}
        className="relative mx-auto flex w-full max-w-[520px] items-stretch rounded-full bg-white/75 p-1 shadow-[var(--shadow-float)] backdrop-blur-xl backdrop-saturate-150"
      >
        {/*
          고른 탭 뒤에 깔리는 회색 알약. 짚어서 좌우로 끌 수 있습니다.

          이것도 탭바와 같은 유리입니다. 불투명한 회색을 깔면 그 자리만
          유리가 아니게 보입니다. 유리로 보이게 하는 것은 네 가지입니다 —
           · 먹색 10% 반투명 (뒤가 비칩니다)
           · 뒤를 한 번 더 세게 흐리기(backdrop-blur-xl). 탭바가 이미 흐리므로
             여기서 한 번 더 흐려야 두 겹이 구분되어 유리판처럼 보입니다.
           · 색을 진하게 살리기(saturate). 흐리면 색이 바래는데, 진짜 유리는
             뒤 색을 죽이지 않습니다.
           · 윗변의 흰 실선과 둘레의 옅은 흰 테. 빛이 위에서 떨어져 유리
             모서리에 걸린 것처럼 보입니다. 유리 느낌은 사실 이 선에서 가장
             많이 나옵니다.

          자리는 left로 잡고 움직임은 transform으로 줍니다. left는 주소에서
          바로 나오는 값이라 애니메이션 없이 즉시 자리를 잡아야 하고,
          transform만 손가락을 따라오거나 부드럽게 제자리로 돌아갑니다.
        */}
        {activeIndex >= 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-ink/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.35),0_1px_2px_rgba(17,20,24,0.07)] backdrop-blur-xl backdrop-saturate-200"
            style={{
              top: BAR_PADDING,
              bottom: BAR_PADDING,
              left: `calc(${BAR_PADDING - PILL_BLEED}px + ${activeIndex} * ${slotCss})`,
              width: `calc(${slotCss} + ${PILL_BLEED * 2}px)`,
              transform: drag?.dx ? `translateX(${drag.dx}px)` : undefined,
              transition: drag?.settling
                ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
                : undefined,
            }}
          />
        ) : null}

        {TABS.map(({ href, label, Icon }, index) => {
          const active = index === activeIndex;
          /* 알약이 덮고 있는 탭 — 끌지 않을 때는 지금 탭과 같습니다. */
          const covered = index === coveredIndex;
          // 탭의 첫 화면에 이미 서 있는지 (하위 화면에 들어와 있는 것과 구분합니다)
          const atTabRoot = pathname === href;
          /*
           * 안 읽은 개수 배지는 채팅에만 답니다. 모든 방을 통틀어 센 개수입니다.
           * 대화방 안에서는 탭바 자체가 없으므로(MainShell) 여기서 가릴 일은 없고,
           * 채팅 목록에서는 어느 방이 안 읽혔는지 줄마다 따로 표시됩니다.
           */
          const badge = href === "/chat" ? unreadChatCount : 0;
          /*
           * 회색 알약이 덮은 탭은 아이콘과 글씨가 브랜드 주황이 되고 아이콘 속까지
           * 꽉 찹니다. 알약을 끌면 색이 알약을 따라 옮겨 다닙니다.
           */
          const itemClassName = covered ? "text-brand-500" : "text-ink-soft";
          /*
           * 탭 한 칸의 위아래 여백은 알약 높이와 덩어리의 위치를 함께 정합니다.
           * 위 6px(pt-1.5) + 아래 10px(pb-2.5).
           *  - 두 값의 합(16px)이 알약 높이를 정합니다. 같이 키우면 높아집니다.
           *  - 두 값의 차(4px) 때문에 아이콘과 글씨를 합친 덩어리가
           *    수학적 한가운데보다 2px 위에 섭니다. 눈으로는 이쪽이 가운데로
           *    보입니다. 정확히 가운데로 되돌리려면 두 값을 같게 두면 됩니다.
           */
          return (
            /* 회색 알약이 뒤에 깔리도록, 칸을 알약보다 위에 세웁니다. */
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  // 알약을 끌다가 손을 뗀 것이면 링크를 열지 않습니다.
                  if (draggedRef.current) {
                    draggedRef.current = false;
                    event.preventDefault();
                    return;
                  }
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
                    strokeWidth={covered ? 2 : 1.7}
                    filled={covered}
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
                    covered ? "font-bold" : "font-medium"
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
