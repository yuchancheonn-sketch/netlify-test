"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BellIcon, ChevronLeftIcon, PersonIcon, SettingsIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import { cohortOf } from "@/lib/cohort";
import { useNotices, useNoticesSeenAt } from "@/lib/hooks";

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
}: {
  title: ReactNode;
  /** 제목 위에 작게 붙는 문구 */
  eyebrow?: ReactNode;
  right?: ReactNode;
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
     *
     * ★ 그 값이 인라인 style이 아니라 globals.css의 .page-header에 있습니다.
     *   세로가 짧을 때(눕힌 폰·자판이 올라온 화면) 제목을 한 단 줄이는데,
     *   인라인 style로 두면 그 media query가 위 여백을 이기지 못합니다.
     *
     * ★ 세로 정렬이 두 갈래인 이유 (2026-09-14)
     *   제목 한 줄의 높이는 약 31px(22px 글씨 × 글줄 1.4배)인데 오른쪽
     *   아이콘 단추는 40px입니다. items-start로 둘의 **윗변**을 맞추면
     *   가운데가 6px쯤 어긋나, 제목이 아이콘보다 위로 뜬 것처럼 보였습니다.
     *   그래서 가운데를 맞춥니다(items-center).
     *
     *   다만 eyebrow(제목 위 작은 글씨)가 있을 때는 예전처럼 윗변을 맞춥니다.
     *   그때는 제목 칸이 두 줄이라 40px보다 높아져서, 가운데를 맞추면 이번에는
     *   뒤로가기 화살표가 아래로 내려앉습니다. eyebrow를 쓰는 화면(운영진·앨범)
     *   에는 오른쪽 요소가 없어서 이 갈래로 손해 보는 것이 없습니다.
     */
    /*
     * pb-1.5 — 제목 줄과 본문 사이 6px.
     * 이 컴포넌트를 모든 화면이 쓰므로 여기 한 줄이 앱 전체를 정합니다.
     *
     * ★ 붙박이가 된 뒤로 이 값은 "여백"이 아니라 **본문을 가리는 띠**입니다.
     *   바탕이 아래 padding까지 칠해지므로, 스크롤할 때 이 값만큼의 본문이
     *   제목 아래에 숨습니다. 12px → 20px로 넓혔다가 글이 잘려 보인다고 해서
     *   12px로, 다시 6px로 줄였습니다(2026-09-14). 더 넓히고 싶으면 이 값 대신
     *   각 화면 본문의 위 여백을 늘리세요 — 그쪽은 같이 스크롤되어 안 가립니다.
     *
     *   globals.css의 짧은 화면 규칙(@media max-height: 480px)이 이 값을 6px로
     *   덮어쓰고 있었는데, 이제 같은 값이라 그 줄은 지웠습니다.
     *
     * ★ 세로가 짧을 때는 이 값이 안 먹습니다. globals.css의
     *   `@media (max-height: 480px)`가 .page-header의 padding-bottom을 6px로
     *   덮어씁니다 — 그 규칙은 레이어 밖이라 Tailwind 유틸리티를 이깁니다.
     *   눕힌 폰이나 자판이 올라온 화면에서 제목 줄이 본문을 밀어내지 않게
     *   하려는 것이니, 그대로 두세요.
     *
     * ★ 스크롤해도 위에 붙어 있습니다 (sticky top-0, 2026-09-14).
     *   모든 화면이 이 컴포넌트를 쓰므로 한 줄로 앱 전체가 따라옵니다.
     *
     *   bg-canvas — 바탕을 깔아야 본문이 뒤로 지나갑니다. 안 깔면 글자가
     *   제목과 겹쳐 보입니다.
     *
     *   z-30 — 하단 탭바와 같은 층입니다. 본문 위에 뜨는 것들(FAB·스크림 z-10~20)
     *   보다는 위, 시트·사진 크게보기(z-50)와 드롭다운(z-40)보다는 아래라
     *   그것들이 열리면 제목 줄을 덮습니다. 자료 탭에서 드롭다운을 닫으려고
     *   까는 투명 덮개도 z-30이라, 열려 있을 때 제목 줄을 누르면 닫힙니다.
     *
     *   ★ sticky는 감싸는 상자에 overflow나 transform이 있으면 조용히 죽습니다.
     *     지금은 MainShell의 flex 상자와 <main>뿐이라 괜찮습니다. body의
     *     overflow-x: hidden도 html이 visible이라 뷰포트로 넘어가고 body는
     *     visible로 남아 영향이 없습니다(globals.css의 body 주석).
     *     나중에 어느 화면이 제 스크롤 상자를 만들면 그 화면만 안 붙습니다.
     */
    <header
      className={`page-header sticky top-0 z-30 flex gap-3 bg-canvas px-4 pb-1.5 ${
        eyebrow ? "items-start" : "items-center"
      }`}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          aria-label="뒤로 가기"
          /*
            mt-0.5는 eyebrow가 있어 윗변을 맞출 때만 필요합니다. 가운데를
            맞추는 갈래에서는 이 2px이 화살표를 가운데에서 밀어냅니다.
            색은 제목과 같은 먹색(ink)입니다 — 오른쪽 아이콘(ink-soft)보다
            한 단 진한 쪽입니다.
          */
          className={`-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-fill ${
            eyebrow ? "mt-0.5" : ""
          }`}
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[13px] font-medium text-ink-faint">{eyebrow}</p>
        ) : null}
        {/*
          홈의 앱 이름도 다른 화면 제목과 똑같이 씁니다. 예외를 두지 않습니다.

          색은 먹색(ink)입니다. 2026-09-14에 오른쪽 아이콘과 같은 ink-soft로
          옮겼다가 같은 날 되돌렸습니다 — 제목은 진하고 아이콘은 한 단 옅은
          쪽이 낫다는 판단입니다. 다시 옮기자고 제안하지 마세요.
          (뒤로가기 화살표와 제목 옆 기수 고르개도 같은 먹색입니다. 셋은
           제목 줄에서 한 덩어리로 읽히므로 늘 같이 움직여야 합니다.)

          pl-0.5 — 뒤로가기가 없는 화면(다섯 탭의 첫 화면)에서만 제목을 2px 오른쪽으로
          들입니다(2026-09-14 사용자 요청). 화면 끝에서 18px. 제목 안에 든 것
          (원우수첩의 기수 고르개, 소식·자료의 서브탭)도 함께 옮겨 갑니다.
          뒤로가기가 있는 화면은 화살표와 제목 사이가 벌어지지 않게 그대로 둡니다.
        */}
        <h1
          className={`truncate text-[22px] font-bold tracking-tight text-ink ${
            showBack ? "" : "pl-0.5"
          }`}
        >
          {title}
        </h1>
      </div>

      {/* mt-0.5를 뺐습니다 — 위 header가 가운데를 맞추므로 2px을 더하면 오히려 내려앉습니다. */}
      {right ? <div className="shrink-0">{right}</div> : null}

      {/*
        ★ 제목 줄 아래에 "옅어지는 띠"를 두지 않습니다 (2026-09-14).

          붙박이 제목 줄 밑으로 본문이 지나갈 때 가위로 자른 듯 잘려 보이는 것을
          부드럽게 하려고, 흰색에서 투명으로 옅어지는 12px 띠를 깔아 본 적이
          있습니다. 흰 카드 위에서는 괜찮았지만 **색이 있는 카드 위에서 드러납니다** —
          홈의 주황 D-day 카드가 그 밑을 지날 때 주황 위에 흰 기운이 번져
          그라데이션이 얹힌 것처럼 보였습니다. 사용자가 보고 빼라고 했습니다.
          다시 넣자고 제안하지 마세요.
      */}
    </header>
  );
}

/**
 * 헤더 오른쪽에 놓는 단추 세 개 — 알림함, 내 프로필, 설정.
 *
 * 예전에는 내 프로필 사진을 동그랗게 띄웠습니다. 사람 아이콘으로 바꾼 이유:
 * 사진은 사람마다 색과 밝기가 제각각이라 제목 줄에서 혼자 튀고, 옆에 설정
 * 아이콘이 서면 둘의 결이 맞지 않습니다.
 * 알림 종은 2026-09-11에 내 프로필 왼쪽에 더했습니다.
 */
export function HeaderActions() {
  /*
   * -space-x-1.5로 단추끼리 6px 겹칩니다.
   *
   * 단추는 손끝이 닿아야 해서 40px인데 아이콘은 27px이라, 아이콘 둘레에
   * 6.5px씩 빈 자리가 이미 붙어 있습니다. 사이를 0으로 붙여도 아이콘끼리는
   * 13px 떨어져 보이는 이유입니다. 그래서 6px을 겹쳐 7px로 좁혔습니다.
   * (4px 겹침·9px 간격이던 것을 알림 종이 더해져 셋이 된 뒤 2026-09-11에 2px 더 좁혔습니다.)
   * 겹치는 6px은 아이콘이 아니라 빈 여백이라 누르는 데는 지장이 없습니다.
   */
  return (
    <div className="flex items-center -space-x-1.5">
      <HeaderBellLink />
      <HeaderIconLink href="/profile" label="내 프로필 열기">
        <PersonIcon className={HEADER_ICON_SIZE} />
      </HeaderIconLink>
      <HeaderIconLink href="/settings" label="설정 열기">
        <SettingsIcon className={HEADER_ICON_SIZE} />
      </HeaderIconLink>
    </div>
  );
}

/**
 * 제목 줄 오른쪽 아이콘 크기. 두 아이콘이 같은 값을 봅니다.
 *
 * 값을 두 번 적으면 한쪽만 고쳐져 크기가 어긋나기 마련이라 한 곳에 묶었습니다.
 * 27px은 하단 탭바 아이콘과 같은 크기입니다.
 *
 * (아이콘 자체가 24 상자를 얼마나 채우는지도 크기에 영향을 줍니다.
 *  icons.tsx의 PersonIcon·SettingsIcon은 채우는 정도를 서로 맞춰 두었습니다.)
 */
const HEADER_ICON_SIZE = "h-[27px] w-[27px]";

/**
 * 헤더 아이콘 단추 한 개.
 *
 * 아이콘은 27px이지만 단추는 40px입니다. 손끝이 닿는 자리는 아이콘보다
 * 넉넉해야 합니다.
 *
 * last:-mr-1은 맨 오른쪽 단추의 그 빈 여백을 4px 도로 당깁니다. 안 당기면
 * 아이콘이 화면 가장자리에서 22.5px 안쪽에 서서, 16px에 맞춰 선 카드들보다
 * 혼자 들어가 보입니다. 4px만 당겨 18.5px에 세웠습니다.
 * (8px까지 당기면 14.5px이 되어 이번에는 카드보다 밖으로 나갑니다.)
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
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition last:-mr-1 active:bg-fill active:scale-95"
    >
      {children}
    </Link>
  );
}

/**
 * 알림함 종 — 마지막으로 알림함을 연 뒤에 새 알림이 왔으면 빨간 점을 켭니다(개수는 세지 않음, 채팅 탭과 같음).
 *
 * 알림함을 한 번도 연 적이 없으면 가입한 시각을 기준으로 삼습니다 — 안 그러면 새로 들어온 원우에게
 * 지난 알림 전부가 "새 알림"으로 켜집니다.
 */
function HeaderBellLink() {
  const { user, profile } = useAuth();
  const { data: notices } = useNotices(cohortOf(profile?.cohort));
  const seenAt = useNoticesSeenAt(user?.uid);

  const since = seenAt === null ? null : seenAt || (profile?.createdAt?.toMillis() ?? 0);
  const hasNew =
    since !== null && notices.some((notice) => (notice.createdAt?.toMillis() ?? 0) > since);

  return (
    <HeaderIconLink href="/notifications" label={hasNew ? "알림 열기 (새 알림 있음)" : "알림 열기"}>
      <BellIcon className={HEADER_ICON_SIZE} />
      {hasNew ? (
        <span
          aria-hidden="true"
          className="absolute top-[7px] right-[8px] h-2 w-2 rounded-full bg-danger ring-2 ring-canvas"
        />
      ) : null}
    </HeaderIconLink>
  );
}
