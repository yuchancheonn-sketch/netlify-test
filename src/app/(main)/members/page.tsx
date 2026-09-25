"use client";

import { LoginRequired, useIsGuest, useRequireLogin } from "@/components/LoginRequired";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import CohortPicker from "@/components/CohortPicker";
import MemberEditSheet from "@/components/MemberEditSheet";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import TextTabs from "@/components/TextTabs";
import { ChatIcon, PencilIcon, PlusIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { ensureDirectRoom } from "@/lib/chat-rooms";
import { ALL_COHORTS, canAddMembers, cohortOf, hasYouthMembers } from "@/lib/cohort";
import {
  affiliationLine,
  buildDirectory,
  entryMatches,
  shortCouncilRole,
  type DirectoryEntry,
} from "@/lib/directory";
import { thumbnailUrl } from "@/lib/cloudinary";
import { formatBirthday, formatPhone, phoneHref } from "@/lib/format";
import { useCohortMembers, useCohortRoster } from "@/lib/hooks";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import type { MemberType } from "@/lib/types";

type Filter = "all" | MemberType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "general", label: "일반 원우" },
  { value: "youth", label: "대학생 원우" },
];

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반 원우",
  youth: "대학생 원우",
};

/** 수정 시트가 열려 있는 상태. entry가 null이면 새 이름 추가입니다. */
type Editing = { entry: DirectoryEntry | null } | null;

export default function MembersPage() {
  const { profile } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  /**
   * 지금 펼쳐 둔 수첩. 원우수첩은 기수마다 따로 한 권이라, 처음에는 내 기수를 엽니다.
   * StageGate가 프로필을 확인한 뒤에만 이 화면을 그리므로 profile은 이미 와 있습니다.
   */
  const [cohort, setCohort] = useState<string>(() => cohortOf(profile?.cohort));
  /*
   * 고른 기수의 가입 원우·명단만 받습니다(2026-09-11). 예전엔 모든 기수를 통째로 받아 화면에서
   * 걸렀는데, 378명 규모에서 원우수첩을 열 때마다 약 750건을 읽어서 기수로 질의하게 바꿨습니다.
   * 드롭다운 끝의 "전체"를 일부러 고를 때만 모든 기수를 받습니다 — 기본은 내 기수입니다.
   */
  const { data: members, loading, error } = useCohortMembers(cohort);
  const roster = useCohortRoster(cohort);
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  /** 사진만 크게 보기 */
  const [enlarged, setEnlarged] = useState<DirectoryEntry | null>(null);
  /** 시트를 열자마자 영상을 재생할지 (영상 썸네일을 눌러 들어온 경우) */
  const [autoPlay, setAutoPlay] = useState(false);
  const [editing, setEditingState] = useState<Editing>(null);
  /*
   * 원우수첩은 누구나 보고(번호는 빼고 — /api/public/directory), 칸 고치기·원우 추가는 로그인해야 (2026-09-24).
   * 여는 쪽은 모두 이 함수를 거칩니다 — 둘러보는 사람이면 안내 창만 뜹니다.
   */
  const requireLogin = useRequireLogin();
  function setEditing(next: Editing) {
    if (next && requireLogin()) return;
    setEditingState(next);
  }

  /** 가입한 원우 + 아직 가입 전인 이름을 한 권으로 (이름 가나다순) */
  const entries = useMemo(
    () => buildDirectory(members, roster.data),
    [members, roster.data],
  );

  /**
   * 고른 기수의 수첩 한 권. "전체"면 모든 기수를 이름 가나다순 한 목록으로.
   * (받아 온 데이터가 이미 그 기수 것뿐이지만, 기수를 바꾸는 순간의 옛 목록이 섞이지 않게 한 번 더 거릅니다.)
   */
  const book = useMemo(
    () =>
      cohort === ALL_COHORTS ? entries : entries.filter((entry) => entry.cohort === cohort),
    [entries, cohort],
  );

  /**
   * 수첩 번호. 검색이나 필터를 걸어도 번호가 흔들리지 않도록
   * 펼친 수첩 한 권에서의 자리를 그대로 씁니다. 기수를 바꾸면 1번부터 다시 셉니다.
   */
  const numberOf = useMemo(() => {
    const map = new Map<string, number>();
    book.forEach((entry, index) => map.set(entry.key, index + 1));
    return map;
  }, [book]);

  /**
   * 구분 고르개(전체·일반·대학생)를 세울지 — **이제 모든 기수에서 셉니다** (2026-09-22).
   *
   * 예전에는 1·2기만 숨겼습니다(공식 명단상 대학생 원우가 없는 기수라서). 지금은
   * 세 칸을 모두 세우고, 아무도 없는 구분을 누르면 빈 화면이 "대학생 원우가 없어요"라고
   * 알려 줍니다(아래 emptyByTypeOnly). 어느 기수에서나 화면 모양이 같은 편이 낫다는 판단입니다.
   *
   * 판단은 lib/cohort.ts의 hasYouthMembers 하나가 합니다 — 되돌리려면 그 함수만 고치면
   * 이 화면도 예전처럼 한 칸만 세웁니다. 그래서 이 갈래를 지우지 않고 둡니다.
   */
  const showTypeFilter = hasYouthMembers(cohort);
  const activeFilter: Filter = showTypeFilter ? filter : "all";

  /**
   * 검색어까지만 거른 목록. 구분(일반/대학생)은 아직 안 걸렀습니다.
   *
   * 고르개의 세 칸이 각자 "지금 검색어로 몇 명이 걸리는지"를 달고 있어야 해서,
   * 구분을 거르기 전 단계를 따로 둡니다. 아래 visible은 여기에 구분만 더 겁니다.
   */
  const searched = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return book.filter((entry) => entryMatches(entry, needle));
  }, [book, keyword]);

  const visible = useMemo(
    () =>
      activeFilter === "all"
        ? searched
        : searched.filter((entry) => entry.memberType === activeFilter),
    [searched, activeFilter],
  );

  /**
   * 검색어는 안 넣었는데 고른 구분에만 아무도 없는 상태인지 (2026-09-22).
   *
   * 이때는 빈 화면이 "무엇이 없는지"를 바로 말해 줍니다 — "대학생 원우가 없어요".
   * searched(검색어까지만 거른 것)가 비어 있지 않은데 visible(구분까지 거른 것)이
   * 비었다는 것은, 걸러낸 것이 구분 하나뿐이라는 뜻입니다.
   */
  const emptyByTypeOnly =
    activeFilter !== "all" && visible.length === 0 && searched.length > 0;

  /**
   * 고르개 칸 이름표 — **고른 칸에만** 이름 뒤에 인원 수를 답니다 ("전체 50명").
   * 안 고른 칸은 이름만 있습니다 (2026-09-14 사용자 요청).
   *
   * ★ 칸 폭이 흔들리던 흠은 2026-09-22에 없어졌습니다.
   *   숫자가 붙고 떨어지면 고른 칸이 30px쯤 넓어지면서 오른쪽 칸들이 밀렸는데,
   *   고르개를 "underline" 갈래로 바꾸면서 세 칸이 flex-1로 폭을 균등하게 나눠 갖게 되어
   *   글자 길이와 무관하게 칸 자리가 고정됐습니다.
   *   (그 전에 살피던 우회책 — 안 고른 칸에 text-transparent로 숫자 자리 잡아두기,
   *    min-w-[2ch]로 두 자리 확보하기 — 은 모두 필요 없어졌습니다. min-w-[2ch]는
   *    한 자리일 때 "대학생 원우␣␣6명"처럼 벌어져 2026-09-14에 걷어낸 것입니다.)
   *
   * ★ 숫자에는 tabular-nums를 그대로 겁니다.
   *   칸 폭은 이제 고정이지만, 숫자 폭이 들쭉날쭉하면 칸 **안에서** 글씨가 좌우로
   *   흔들립니다(가운데 정렬이라 양쪽으로 반씩). 숫자 폭을 맞춰 두면 그것도 없습니다.
   */
  const filterItems = useMemo(
    () =>
      FILTERS.map(({ value, label }) => ({
        value,
        label:
          value === activeFilter ? (
            <>
              {label}{" "}
              <span className="tabular-nums">
                {value === "all"
                  ? searched.length
                  : searched.filter((entry) => entry.memberType === value).length}
              </span>
              명
            </>
          ) : (
            label
          ),
      })),
    [searched, activeFilter],
  );

  function openEntry(entry: DirectoryEntry, playVideo = false) {
    setAutoPlay(playVideo);
    setSelected(entry);
  }

  const busy = loading || roster.loading;

  return (
    <>
      {/*
        화면 전체 바탕을 흰색으로 (2026-09-26 사용자 "원우 추가하기·탭 알약 둘레 배경도 흰색으로") — 목록을 선으로
        나누면서(흰 바탕 한 장) 그 아래로 회색이 남던 것을 없앱니다. 일정 등록 화면과 같은 방식으로 맨 뒤(-z-10)에
        붙박이 흰 판을 깝니다. 원우 추가하기 단추는 흰 바탕 위에서 헤어라인 테두리로 구별됩니다.
      */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
      {/*
        ★ 위쪽 흰 구역 전체(제목 줄 · 검색 · 구분 고르개)가 붙박이입니다 (2026-09-25 사용자 요청 —
          예전엔 제목 줄만 붙고 검색·고르개는 목록과 함께 굴러갔습니다).
          PageHeader 자체도 sticky지만 이 상자 안에서는 제자리라, 상자째로 붙는 것과 같습니다.
          z-30은 PageHeader와 같은 층입니다(그 주석 참고).
      */}
      <div className="sticky top-0 z-30 bg-surface">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            원우수첩
            <CohortPicker value={cohort} onChange={setCohort} includeAll />
          </span>
        }
        /*
          제목 줄도 아래 검색·고르개와 같은 흰 바탕입니다 (2026-09-22 사용자 요청).
          HeaderActions에도 같은 값을 넘겨야 알림 종의 빨간 점 테가 흰색이 됩니다.
        */
        tone="surface"
        right={<HeaderActions tone="surface" />}
      />

      {/*
        pt-[10px] — 검색박스와 제목 줄 사이 10px (16px → 12px → 10px, 2026-09-22 사용자 요청 두 번).
        제목 줄의 pb(6px)에 더해 눈에 보이는 간격은 16px입니다(처음 22px).

        ★ 이 여백을 PageHeader의 pb로 주지 않는 이유
          제목 줄은 붙박이라 그 pb만큼의 본문이 스크롤할 때 제목 아래에 숨습니다.
          여기에 주면 본문과 함께 굴러가므로 아무것도 가리지 않습니다.
          (홈의 OX 퀴즈 카드 위 여백도 같은 까닭으로 본문 쪽에 있습니다.)
      */}
      {/*
          ★ 위쪽 한 덩어리(제목 줄 · 검색 · 구분 고르개)는 흰 바탕입니다 (2026-09-22 사용자 요청).
            그 아래 목록만 앱의 보통 바탕(canvas)입니다. 구분 고르개 맨 아래 회색 선이
            둘의 경계입니다(TextTabs "underline" 갈래가 긋습니다).

            px-4 — 검색칸·고르개를 화면 끝에서 16px 들입니다. 흰 바탕은 이 상자가 화면 끝까지 칠합니다
            (2026-09-25 붙박이 상자로 옮기기 전엔 목록의 px-4 안이라 -mx-4로 되밀었습니다).
            pt-[8.5px] — 제목 줄과 검색칸 사이 (10px → 9.5px → 9px → 8.5px, 2026-09-23 사용자 "0.5px 만큼 줄여줘" 세 번).
            흰 구역 안에 있어야 합니다. 바깥에 두면
            그만큼이 canvas로 남아 제목 줄과 검색칸 사이에 회색 띠가 그어집니다.

          ★ 제목 줄도 같이 흰색이어야 합니다 — 위 PageHeader에 tone="surface"를 넘겼습니다.
            제목 줄은 붙박이라 본문이 그 뒤로 지나가므로, 한쪽만 흰색이면 스크롤할 때
            제목 줄이 다른 색 띠로 떠 보입니다.
        */}
        <div className="bg-surface px-4 pt-[8.5px]">
          {/* 검색 */}
          <div className="relative">
            {/*
              돋보기 — 오른쪽 끝, 26px (2026-09-14에 자리·크기가 바뀌었습니다).
              예전에는 왼쪽 끝의 18px이었고 오른쪽에는 "원우 N명"이 앉아
              있었는데, 그 숫자를 알약 밖으로 꺼내면서 오른쪽이 비어 이리로
              옮겼습니다.
              크기 22px (26px → 22px, 2026-09-22 사용자 "돋보기 크기 줄여주고").
              박스 높이가 그날 44px → 35px로 내려와 26px 돋보기가 칸을 꽉 메웠습니다.
              22px이면 위아래로 6.5px씩 남아 숨통이 트입니다.

              색은 연회색(ink-faint) — 안내 글씨(ink-muted)보다 한 단 연합니다
              (2026-09-22 사용자 "조금만 더 연한 회색으로"). 토큰 단계에서 가장 연한 회색이라
              여기가 끝입니다. 더 연하게 하려면 ink-faint/70 같은 투명도를 써야 합니다.
              지나온 색: 주황 → ink-faint → 먹색(쇼핑 앱 검색창 그림) → 주황(시험, 되돌림) → 먹색 → ink-muted → ink-faint → 주황 → ink-muted → ink-faint.
              높이는 가운데보다 1px 위(top-[calc(50%-1px)]), 선 두께는 기본 1.9보다 살짝 얇은 1.75 — 둘 다 2026-09-15 사용자 요청.
              선 두께는 이 화면에서만 넘깁니다(icons.tsx 기본값을 바꾸면 다른 돋보기도 같이 얇아집니다).

              pointer-events-none — 아이콘은 그림일 뿐입니다. 이게 없으면 아이콘을
              누른 손끝이 입력칸에 닿지 않아, 오른쪽 끝을 눌렀을 때 자판이
              안 올라옵니다.
            */}
            <SearchIcon
              strokeWidth={1.75}
              className="pointer-events-none absolute top-[calc(50%-1px)] right-4 h-[22px] w-[22px] -translate-y-1/2 text-ink-faint"
            />
            {/*
              글자 크기는 16px 그대로 두고 위아래 여백만 줄였습니다.
              16px보다 작게 하면 iOS에서 입력칸을 누를 때 화면이 확대됩니다.
            */}
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름·회사·직책으로 찾기"
              aria-label="원우 검색"
              /*
                눌렀을 때 둘러지던 주황 테두리는 뺐습니다. 글자를 치는 칸이라
                깜빡이는 커서와 올라온 자판만으로도 어디에 쓰고 있는지 알 수
                있습니다. (대화방 입력칸도 같은 이유로 뺐습니다.)

                좌우 여백 (2026-09-14에 뒤집혔습니다)
                  pl-5(20px)  — 왼쪽에 있던 돋보기를 치워서 글씨가 앞으로 왔습니다.
                  pr-14(56px) — 오른쪽 끝 돋보기(26px, right-4)가 앉을 자리입니다.
                                16 + 26 = 42px에 글씨와의 숨통 14px을 더한 값이라,
                                아이콘 크기나 right-4를 고치면 이 값도 같이 고쳐야
                                긴 검색어가 돋보기 밑으로 파고들지 않습니다.
                  예전에는 pl-10 / pr-24였습니다(왼쪽 돋보기 + 오른쪽 "원우 N명").

                모서리는 둥근 사각형 14px입니다
                (알약 → 16px(rounded-2xl) → 14px, 2026-09-22 "아주 조금만 덜 둥글게").
                Tailwind 단계(12px·16px) 사이 값이라 직접 적습니다.
                앱의 안쪽 상자들(원우 줄의 사진칸, 퀴즈 카드 속 칸, 상세 시트의 정보 상자)은
                rounded-2xl(16px)이라 이제 이 칸만 2px 덜 둥급니다. 더 각지게 하려면 12px입니다.

                ★ 알약(rounded-full)이던 때는 둥글기가 22px(높이 44px의 절반)이었는데,
                  알약은 위아래 가운데가 가장 넓어 글자가 앉는 높이에서는 모서리가
                  글자를 밀지 않았습니다. 16px로 내리면 모서리가 더 안쪽까지 들어오지만
                  그래도 글자 줄 높이 바깥이라, 좌우 여백(pl-5·pr-14)은 그대로 둡니다.

                위아래 여백은 위 8px · 아래 10px입니다 (12.5px → 10px → 8px씩 → 7/9px → 지금).
                박스 높이는 8 + 글줄 19 + 10 ≈ 37px (2026-09-22 사용자 "높이 아주 조금만 더 늘려줘" — 35px에서 위아래 1px씩).
                위아래 2px 차이는 글씨를 1px 위로 올리려는 것입니다(같은 날 "글씨 위치 1px만큼 위로 올려줘").

                ★ 여기만 위아래가 다릅니다. 이 파일의 다른 잔조정은 "늘 위아래 반씩"이 규칙인데,
                  그 규칙은 글자를 가운데에 두려는 것이고 여기서는 일부러 1px 올린 것입니다.
                  높이를 바꾸려면 두 값을 같이 움직여 차이(2px)를 지키세요.
                10px(py-2.5) → 12px(py-3) → 12.5px → 12.25px → 12.5px(2026-09-15 "0.5px 더 늘려줘")
                → 10px → 8px. 1px·0.5px 같은 잔조정은 늘 위아래로 반씩 나눕니다 —
                한쪽에만 주면 글자가 가운데에서 벗어납니다.

                ★ 여기가 사실상 바닥입니다. 더 줄이려면 셋 중 하나에 손대야 하는데 다 걸립니다.
                  - 글씨(16px): 내리면 아이폰에서 입력칸을 누를 때 화면이 확대됩니다(위 주석).
                  - 위아래 여백: 8px 아래로 가면 손끝이 닿는 자리가 35px을 밑돌기 시작합니다.
                  - 돋보기(26px): 35px 상자 안에서 위아래 4.5px씩밖에 안 남았습니다.
                    더 낮추려면 돋보기부터 22px쯤으로 줄여야 상자가 아이콘을 물지 않습니다.

                ★ 0.25px 단위가 사실상 바닥입니다. 화소 밀도가 3배인 폰에서 12.5px은 37.5 화소,
                  12.25px은 36.75 화소라 반올림하면 한 화소 안팎 차이입니다. 이보다 잘게 나누면
                  같은 화소에 떨어져 화면에서는 달라지지 않습니다.
                돋보기는 top-1/2로 가운데에 매달려 있어서 높이를 건드려도 저절로
                따라옵니다.

                ★ 옅은 회색 알약(bg-fill)입니다 (2026-09-22 사용자 "흰색에서 옅은 회색으로").
                  지나온 모양: 흰 바탕 + 주황 테두리 + 글로우 → 옅은 회색 바탕(bg-fill)만
                  → 흰 알약 + 글로우(2026-09-14 쇼핑 앱 검색창 그림) → 지금(다시 옅은 회색).

                  ★ 바꾼 까닭 — 같은 날 이 위쪽 구역 바탕이 흰색이 되면서, 흰 알약이
                    흰 바탕에 묻혀 글로우로만 겨우 보였습니다. 위쪽 구역을 다시 canvas로
                    되돌린다면 이 값도 같이 살펴보세요(그때는 흰 알약이 또렷합니다).

                  ★ 어두운 화면에서도 됩니다 — fill(#2A2D31)이 surface(#1D1F22)보다 밝아
                    어두운 바탕 위에서 알약이 한 단 떠오릅니다. 밝은 화면과 방향이 반대지만
                    "바탕과 구별된다"는 결과는 같습니다.

                  - 테두리: 없습니다 (2026-09-22 사용자 "검색 알약의 주황색 테두리 없애고").
                    2026-09-15부터 있던 1.5px 주황 테두리(ring-[1.5px] ring-brand-500)를 걷었습니다.
                  - 그림자: 없습니다 (2026-09-22 사용자 "글로우 없애주고").
                    --shadow-card-glow를 걷어 평평한 회색 상자가 됐습니다. 바탕색만으로 구별되므로
                    떠 있을 까닭이 없습니다. 되살리려면 shadow-[var(--shadow-card-glow)]를 다시 붙이세요.
                    (지나온 그림자: 그림을 따른 옅은 그림자 0 1px 2px 4% + 0 6px 24px 7% + ring-black/[0.04]
                     → --shadow-card-glow → 없음.)
                  - 안내 글씨는 ink-muted(중간 회색) — 그림의 안내 글씨가 연회색이 아니라
                    또렷한 회색이라 ink-faint에서 한 단 올렸습니다.

                  ★ 안내 글씨 크기는 placeholder에만 겁니다 (placeholder:text-[15px], 2026-09-22
                    사용자 "글씨 크기 1px만큼 줄여줘"). 입력칸 자체(text-[16px])는 건드리면 안 됩니다 —
                    16px보다 작으면 아이폰에서 칸을 누를 때 화면이 확대됩니다(위 주석).
                    placeholder에만 걸면 입력칸의 font-size는 16px로 남아 확대가 일어나지 않고,
                    안내 글씨만 15px로 그려집니다. 대신 **치는 글씨는 16px 그대로**라 둘이 1px 다릅니다.
                    (안내 글씨는 칸이 비었을 때만 보이므로 한 화면에 같이 서는 일이 없습니다.)

                  ★ 2026-09-25부터 바탕은 bg-fill이 아니라 **bg-canvas** — 앱 기본 바탕 회색(#ECECEB)과 같은 색입니다
                    (사용자 "검색 박스랑 기본 배경의 회색이랑 같은 색이 되도록"). 흰 구역 위라 또렷이 보입니다.
                    어두운 화면에서는 canvas(#121315)가 surface보다 어두워 칸이 한 단 들어가 보입니다.
              */
              // pt-[8.5px] pb-[10.5px] — 높이 1px 늘림, 위아래 0.5px씩(글씨 1px 위로 둔 차이는 그대로) — 2026-09-26 사용자 요청.
              className="w-full rounded-[14px] bg-canvas pt-[8.5px] pr-14 pb-[10.5px] pl-5 text-[16px] text-ink outline-none placeholder:text-[15px] placeholder:text-ink-muted"
            />
          </div>

          {/*
            구분 고르개 — 공용 TextTabs의 "underline" 갈래입니다(components/TextTabs.tsx).
            고른 칸은 주황 굵은 글씨 + 그 아래 주황 바이고, 세 칸이 폭을 균등하게 나눠 갖습니다.
            줄 아래에는 화면을 가로지르는 옅은 회색 구분선이 한 줄 깔립니다
            (2026-09-22 사용자가 보여 준 결제카드 관리 화면 그림을 따름).
            지나온 모양은 TextTabs 맨 위 주석에 이어 적어 두었습니다.

            ★ 소식 탭·자료 탭 서브탭과 **같은 컴포넌트**지만 갈래가 다릅니다("header").
              그 둘은 제목 자리를 대신하는 22px이라 상자를 두르면 제목이 단추처럼 보여
              2026-09-22에 이 화면만 바꿨습니다. 크기·색을 고칠 때 어느 갈래인지 보세요 —
              공통 부분(칸 순서, 글씨 크기를 span에 거는 규칙 등)은 여전히 세 화면이 같이 따라옵니다.
              (예전에는 화면마다 마크업을 복붙해 둔 탓에 하루 만에 글씨 크기가 갈라졌습니다.)

            mt-[9px] — 위 검색칸과의 간격 (16px → 14px → 11px → 8px, 2026-09-22 사용자 요청 세 번;
            → 9px, 2026-09-23 사용자 "1px 만큼 늘려줘").
            이 화면에만 있는 값이라 여기서 넣습니다. Tailwind 단계 사이 값이라 직접 적습니다.
            ★ 눈에 보이는 흰 여백은 이 값보다 4px 넓습니다 — 고르개 칸이 글씨 위에 pt-1(4px)을
              두고 있어서입니다(TextTabs "underline"). 지금 9 + 4 = 13px입니다.
              여기를 0으로 만들어도 12px 아래로는 안 내려갑니다. 더 줄이려면 그 pt-1을
              건드려야 하는데, 그러면 고른 칸의 주황 바와 글씨 사이(pb-[11px])와의 균형도
              같이 살펴야 합니다 — 위아래가 4px/11px이라 이미 아래쪽이 넉넉한 짜임입니다.

            ★ 인원 수는 **고른 칸에만** 이름 뒤에 붙습니다 ("전체 50").
              2026-09-14에 두 번 옮겼습니다: 오른쪽 끝의 "원우 N명" 한 덩어리
              → 세 칸 모두에 숫자 → 고른 칸에만 숫자.
              세 칸 모두에 달았을 때는 20px에서 줄이 약 340px이라 390px 폰에서
              거의 꽉 찼는데, 한 칸만 달면서 약 300px로 내려와 여유가 생겼습니다.
              세는 자리는 위 filterItems입니다.

            ★ 이제 모든 기수가 세 칸을 다 세웁니다 (2026-09-22 사용자 "1,2기도 10기처럼").
              1·2기에는 공식 명단상 대학생 원우가 없지만, 칸을 숨기는 대신 눌렀을 때
              "대학생 원우가 없어요"라고 알려 주는 쪽으로 바꿨습니다(아래 빈 화면).

              아래 갈래(칸 하나만 세우기)는 그대로 둡니다 — lib/cohort.ts의 hasYouthMembers를
              되돌리면 이 화면도 예전 모양으로 돌아갑니다. 칸이 하나일 때는 "underline"이
              폭을 늘리지 않습니다(TextTabs의 stretch) — 늘리면 주황 바가 화면 폭을 가로질러
              탭이 아니라 밑줄 그은 제목으로 보입니다.
              예전에는 고르개를 통째로 숨기고 오른쪽 끝에 "원우 N명" 글씨(trailing)를 세웠습니다.
              onChange를 비워 둔 것은, 이 칸을 눌러도 다른 기수에서 골라 둔 필터
              (예: 대학생 원우)가 "전체"로 덮이지 않게 하려는 것입니다.
          */}
          <TextTabs
            items={
              showTypeFilter ? filterItems : filterItems.filter((item) => item.value === "all")
            }
            value={activeFilter}
            onChange={showTypeFilter ? setFilter : () => {}}
            variant="underline"
            className="mt-[9px]"
          />
        </div>
      </div>

      <div className="px-4">

        {/*
          목록.
          mt-[18px] — 위 구분 고르개와 첫 박스 사이 18px (2026-09-15 사용자 "밑에 여백 아주 조금만 더", 16px에서 2px).
          고르개 아래 검은 바(바 2.5px + 사이 6px)를 걷으면서 줄이 그만큼 낮아져 사이가 좁아 보였습니다.
        */}
        <div className="mt-[18px] pb-6">
          {busy ? (
            /* 자리 표시도 아래 진짜 목록과 같은 짜임입니다 — 13.5px씩 띄운 박스, 높이 87px(사진 63px + 안쪽 위아래 12px씩). */
            // 자리 표시도 선 목록 모양으로(2026-09-26) — 흰 바탕 한 장, 줄마다 사진 자리만 회색.
            <ul className="-mx-4 -mt-[18px] bg-surface px-4 pt-2">
              {[0, 1, 2, 3].map((key) => (
                <li key={key} className="border-t border-line py-3 first:border-t-0">
                  <Skeleton className="h-[76.5px] w-[136px] rounded-[10px]" />
                </li>
              ))}
            </ul>
          ) : error ? (
            <ErrorState message={error} />
          ) : visible.length === 0 ? (
            /*
              빈 화면은 세 갈래입니다 (2026-09-22에 가운데 갈래를 더했습니다).
                ① 수첩 자체가 비어 있음
                ② 검색어 없이 구분만 걸었는데 그 구분에 아무도 없음
                   → "대학생 원우가 없어요"처럼 **무엇이 없는지** 바로 말해 줍니다.
                     1·2기 수첩에서 "대학생 원우"를 누르면 늘 여기로 옵니다 —
                     그 두 기수에는 공식 명단상 대학생 원우가 없기 때문입니다.
                     (예전에는 그 기수에서 고르개를 아예 숨겼는데, 2026-09-22 사용자 요청으로
                      세 칸을 모두 세우고 대신 이 문구로 알려 주는 쪽으로 바꿨습니다.)
                ③ 검색어까지 걸린 경우 → 예전처럼 "조건에 맞는 원우가 없어요"
            */
            <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title={
                  book.length === 0
                    ? "아직 수첩이 비어 있어요"
                    : emptyByTypeOnly
                      ? `${MEMBER_TYPE_LABEL[activeFilter as MemberType]}가 없어요`
                      : "조건에 맞는 원우가 없어요"
                }
                description={
                  book.length === 0
                    ? canAddMembers(cohort)
                      ? "아래 원우 추가하기로 이 기수 원우를 한 명씩 채워보세요."
                      : undefined
                    : emptyByTypeOnly
                      ? "아래 원우 추가하기로 올리거나, 다른 구분을 눌러보세요."
                      : "검색어나 필터를 바꿔보세요."
                }
              />
            </div>
          ) : (
            /*
              원우마다 흰 박스(MemberRow — rounded-3xl · 헤어라인)를 세우고 13.5px씩 띄워 나눕니다.
              12px → 14px (2026-09-22 사용자 "아주 조금씩 늘려줘") → 13.75px (2026-09-23 사용자 "0.25px씩 줄여줘") → 13.5px (2026-09-25 사용자 "0.25px 만큼 줄여줘").
              Tailwind 단계(12px·16px)
              사이 값이라 직접 적습니다. 위 자리 표시(Skeleton) 목록도 같은 값이어야
              불러오는 동안과 다 불러온 뒤의 줄 자리가 어긋나지 않습니다.

              ★ 박스 → 줄 사이 선 → 다시 박스 (모두 2026-09-14).
                예전 박스를 줄 사이 선으로 바꿨었습니다(사용자 제안 — 배경이 흰색이던 때 카드마다
                헤어라인이 둘려 상자 테두리만 눈에 밟힌다고 해서). 그 사이 선을 빼고 여백만으로도
                나눠 봤다가 두 번 다 "선이 있는 게 낫다"로 되돌렸고, 같은 날 늦게 사용자가
                "예전처럼 박스로 구분 짓도록 해봐"라고 해서 박스로 돌아왔습니다.
                선으로 되돌리려면 git 기록에서 이 목록의 border-t(ml-0.5)와 MemberRow의 py-3 pl-0.5를 보세요.
            */
            /*
              ★ 2026-09-26 사용자 "박스 대신 그냥 회색 선으로 구분 지어 볼래?" — 흰 바탕 한 장에 줄마다 옅은 회색 선.
                회색 바탕 위에 회색 선은 거의 안 보여서, 목록을 위쪽 흰 구역(제목·검색·구분 고르개)에 바로 이어 붙인
                흰 바탕으로 둡니다: -mt-[18px](위 여백 없애기) · -mx-4 px-4(화면 끝까지 흰색) · bg-surface.
                줄 사이 선은 li의 border-t(첫 줄 빼고). 박스로 되돌리려면 git 기록의 gap-[13.5px] 목록과 MemberRow의 흰 박스.
            */
            // pt-2 — 첫 원우 위 흰 여백을 8px 더 (2026-09-26 사용자 "첫 번째 사람 위 여백 더"; 줄 안 12px과 합쳐 20px).
            <ul className="-mx-4 -mt-[18px] bg-surface px-4 pt-2">
              {visible.map((entry) => (
                <li key={entry.key} className="border-t border-line first:border-t-0">
                  <MemberRow
                    entry={entry}
                    number={numberOf.get(entry.key) ?? 0}
                    showCohort={cohort === ALL_COHORTS}
                    onOpen={() => openEntry(entry)}
                    onOpenVideo={() => openEntry(entry, true)}
                    onEnlargePhoto={() => setEnlarged(entry)}
                    onEdit={() => setEditing({ entry })}
                  />
                </li>
              ))}
            </ul>
          )}

          {/*
            아직 가입하지 않은 원우 올리기.

            자료 탭의 "앨범 만들기"·"파일 올리기"와 **똑같은 모양**입니다.
            셋 다 "목록 아래에서 새로 하나 더하기"라는 같은 일을 하므로,
            생김새가 다르면 다른 종류의 단추처럼 읽힙니다.
            (예전에는 여기만 테두리만 두른 회색 단추였습니다.)
            한쪽을 고치면 나머지 둘도 같이 맞춰 주세요.

            1기~9기 수첩에는 이 단추가 없습니다 — 공식 명단으로 이미 다 채웠습니다(lib/cohort.ts의 canAddMembers).
          */}
          {!busy && !error && canAddMembers(cohort) ? (
            <button
              type="button"
              onClick={() => setEditing({ entry: null })}
              /*
                테두리 — 카드 헤어라인(line)보다 조금 진한 회색: line 65% + ink-faint 35% (2026-09-26 사용자 "조금만 더 진하게").
                바탕이 흰색이 되면서 테두리만으로 단추가 보여서, 글로우 그림자(shadow-card)는 걷고 1px 테두리만 둡니다.
              */
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-line)_65%,var(--color-ink-faint))] bg-surface py-[11px] text-[15px] font-bold text-brand-500 transition active:scale-[0.99]"
            >
              {/* "+ 원우 추가하기" 통째로 1px 위로 (2026-09-26 사용자 요청). 단추가 flex라 각 칸에 transform이 먹습니다. */}
              <PlusIcon className="h-5 w-5 -translate-y-px" />
              <span className="-translate-y-px">원우 추가하기</span>
            </button>
          ) : null}
        </div>
      </div>

      {selected ? (
        <MemberDetailSheet
          entry={selected}
          autoPlay={autoPlay}
          isMe={!!selected.member && selected.member.uid === profile?.uid}
          onEnlargePhoto={() => setEnlarged(selected)}
          onEdit={() => {
            if (requireLogin()) return;
            setEditing({ entry: selected });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {enlarged ? (
        <PhotoLightbox entry={enlarged} onClose={() => setEnlarged(null)} />
      ) : null}

      {editing ? (
        <MemberEditSheet
          entry={editing.entry}
          existing={entries}
          defaultCohort={cohort === ALL_COHORTS ? cohortOf(profile?.cohort) : cohort}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

/**
 * 수첩 한 줄.
 * 왼쪽 사진, 가운데 이름, 오른쪽 수정 버튼이 서로 다른 곳으로 가기 때문에
 * 버튼을 나눠 두었습니다. (버튼 안에 버튼을 넣을 수는 없습니다.)
 */
function MemberRow({
  entry,
  number,
  showCohort,
  onOpen,
  onOpenVideo,
  onEnlargePhoto,
  onEdit,
}: {
  entry: DirectoryEntry;
  number: number;
  /** "전체" 수첩일 때만 — 여러 기수가 섞여 있어 누가 몇 기인지 붙여 줍니다. */
  showCohort: boolean;
  onOpen: () => void;
  onOpenVideo: () => void;
  onEnlargePhoto: () => void;
  onEdit: () => void;
}) {
  const videoLink = parseVideoLink(entry.introVideoUrl);
  /*
   * 목록 칸(112×63)에는 작은 판을 깝니다 — 상세 시트만 큰 판을 씁니다 (2026-09-22).
   * 수첩 한 권에 영상 썸네일이 26장, 사진이 42장이라 큰 판으로 깔면 492KB를 한꺼번에
   * 받습니다. 브라우저는 한 도메인에 6개씩만 열어서 폰에서는 줄줄이 기다립니다.
   */
  const thumbnail = videoLink ? videoThumbnail(videoLink, "small") : null;
  const affiliation = affiliationLine(entry);

  return (
    /*
     * gap-[13px] = 썸네일과 이름 사이 13px. 이 값이 이름 줄의 왼쪽 자리를 정합니다.
     *
     * 예전에는 gap-4(16px)였습니다. 썸네일 폭(112px)은 16:9를 지켜야 해서
     * 줄일 수 없으므로, 네 글자 직위(정무특보)가 붙어도 이름이 안 잘리게 할
     * 자리를 gap-3(12px)으로 줄여 냈습니다.
     * 2026-09-14에 글씨가 사진에 붙어 보인다고 해서 1px 되돌렸습니다 —
     * Tailwind 단계(12px·16px) 사이 값이라 직접 적습니다. 그때 빌린 1px은
     * 같은 날 "수정" 글씨 단추를 연필 아이콘으로 바꾸며 번 28px에서 나옵니다.
     *
     * ★ 흰 박스입니다 (2026-09-14 늦게 사용자 "예전처럼 박스로 구분 짓도록 해봐").
     *   rounded-3xl · bg-surface · shadow-[var(--shadow-card)](헤어라인 포함) + 안쪽 여백 p-3(12px) —
     *   줄 사이 선으로 바꾸기 전(c63fd03 이전) 박스와 같은 값입니다. 목록 쪽이 14px씩 띄웁니다.
     *   같은 날 선으로 지낼 때는 py-3 pl-0.5(왼쪽 2px만 들임)였습니다.
     *
     *   오른쪽 연필 단추의 -mr-2는 그대로라, 박스 안에서 끝 여백 12px 중 8px을 당겨 씁니다.
     */
    /*
     * 그림자는 --shadow-card-flat — 글로우 없이 1px 헤어라인만 (2026-09-23 사용자 "원우 개인별 흰색 박스들의
     * 글로우 효과도 없애줘"). 홈 카드들과 같은 값입니다.
     * 지나온 값: --shadow-card → --shadow-card-soft(2026-09-22 "글로우 아주아주 조금만 더 약하게") → 지금.
     */
    // ★ 2026-09-26 박스 → 선: 흰 박스(rounded-3xl · bg-surface · 헤어라인 · p-3)를 걷고 위아래 12px만. 줄 사이 선은 목록(li)이 긋습니다.
    // pl-[1px] — 사진·이름·회사를 통째로 오른쪽으로 (2026-09-26 사용자 "1.5px 오른쪽" → "0.5px 왼쪽"). 오른쪽 연필은 제자리.
    <div className="flex items-center gap-[14px] py-3 pl-[1px]">
      {/* 사진 · 영상 썸네일 */}
      <button
        type="button"
        onClick={videoLink?.id ? onOpenVideo : onEnlargePhoto}
        aria-label={
          videoLink?.id ? `${entry.name} 소개 영상 보기` : `${entry.name} 사진 크게 보기`
        }
        /*
          112×63 — 정확히 16:9입니다. 이 비율이어야 유튜브 미리보기의 위아래
          검은 띠가 남김없이 잘려 나갑니다(자세한 까닭은 lib/video.ts).
          비율을 바꾸면 검은 줄이 다시 보이니 폭과 높이를 함께 고쳐야 합니다.
          영상이 없는 원우는 여기에 프로필 사진이 들어오고, 그때는 가로로
          넓게 잘립니다.

          ★ -ml-px — 사진만 왼쪽으로 1px 더 나갑니다 (2026-09-14 사용자 요청).
            줄 전체의 pl(2px)을 1px로 줄여도 같은 자리가 되지만, 그러면 옆의
            글씨까지 딸려 옵니다. 사진만 옮기고 글씨는 제자리에 두려고
            바깥 div의 gap을 13px → 14px로 함께 1px 늘렸습니다.
            (사진 1px 왼쪽 + 사이 1px 넓힘 = 글씨 자리 그대로)
            둘은 짝이니 한쪽만 고치면 글씨가 따라 움직입니다.
            줄 사이 구분선은 그대로 2px(ml-0.5)이라, 사진이 선보다 1px 왼쪽에
            섭니다.
        */
        // 128×72 — 16:9 그대로 조금 키움 (2026-09-26 사용자 "썸네일 크기 조금만 키워줘", 112×63에서). 아래 설명의 112×63은 그 전 값.
        // 136×76.5 — 16:9 그대로 조금만 더 (같은 날 사용자 "조금만 더 키워줘", 128×72에서. 144×81은 크다고 되돌림).
        // rounded-[10px] — 모서리 덜 둥글게 (같은 날 사용자 요청, 14px(rounded-2xl)에서).
        className="relative -ml-px h-[76.5px] w-[136px] shrink-0 overflow-hidden rounded-[10px] bg-fill transition active:scale-95"
      >
        {/*
          ★ loading="lazy" + 폭·높이 못 박기 (2026-09-22).
            수첩 한 권이 87줄이라 예전에는 화면 밖 줄의 그림까지 68장을 한꺼번에 받았습니다.
            lazy를 걸면 처음에는 눈에 보이는 대여섯 줄만 받고 나머지는 굴러 내려갈 때 받습니다.
            width·height를 함께 적어야 그림이 오기 전에도 줄 높이가 잡혀, 받는 동안
            목록이 들썩이지 않습니다(상자 크기는 CSS가 정하므로 보이는 크기는 그대로입니다).
        */}
        {thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              width={136}
              height={77}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <span className="absolute right-1.5 bottom-1.5 flex h-5 items-center rounded-md bg-black/65 px-1.5 text-[11px] font-bold text-white">
              ▶ 영상
            </span>
          </>
        ) : entry.photoURL ? (
          /*
           * 원본이 아니라 이 칸 크기로 구운 판을 받습니다 (2026-09-22).
           * 예전에는 올라온 사진을 그대로 받아 112×63 칸에 욱여넣었습니다. 지금 10기는
           * Cloudinary 사진이 7장뿐이라 차이가 작지만, 폰으로 찍은 사진을 그대로 올리는
           * 원우가 생기면 한 줄에 수 MB가 실려 옵니다. 지금 막아 둡니다.
           * (구글 계정 사진은 Cloudinary 주소가 아니라 그대로 지나갑니다 — thumbnailUrl 주석 참고.)
           */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(entry.photoURL, 272, 153)}
            alt={`${entry.name} 프로필 사진`}
            width={136}
            height={77}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Avatar name={entry.name} seed={entry.key} size={46} />
          </span>
        )}
      </button>

      {/*
        이름 · 회사 · 직책
        위아래 여백 3px / 5px — 합(8px)은 예전 py-1과 같아 박스 높이는 그대로이고,
        글씨 두 줄만 1px 위로 올라갑니다 (2026-09-15 사용자 요청).
      */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 pt-[3px] pb-[5px] text-left transition active:opacity-70"
      >
        {/*
          ★ 이름은 절대 자르지 않습니다.

          예전에는 이름에 truncate가 걸려 있어서, 자리가 모자라면 이름부터
          잘렸습니다. 수첩에서 가장 먼저 읽혀야 하는 것이 이름인데 "정무특보"
          같은 네 글자 직위가 붙으면 이름이 두세 글자만 남았습니다.

          지금은 순서를 뒤집었습니다 — 이름은 shrink-0으로 제 폭을 지키고,
          자리가 모자라면 **직위 배지만** 줄어들며 끝이 "…"로 잘립니다.
          배지는 없어도 누구인지 알 수 있지만 이름은 그렇지 않습니다.

          ★ 이 줄의 overflow-hidden은 이제 배지 부스러기만 자릅니다 (2026-09-11).
            예전에는 이름이 칸보다 넓어질 수 있어서, 글씨 크기를 키운 폰에서는
            이 overflow-hidden에 이름 끝까지 잘려 나갔습니다. 지금은 이름 덩어리에
            max-w-full을 걸어 줄 폭을 넘지 못하게 했으므로 잘릴 일이 없고, 배지가
            "…"까지 줄어들고도 남는 알약 여백만 여기서 깔끔하게 잘립니다.
            (overflow-hidden을 빼 보니 그 여백이 수정 단추 밑으로 삐져나갔습니다.)
        */}
        {/*
          ★ items-baseline이 아니라 items-center입니다.

          baseline으로 맞추면 직위 배지가 이름보다 한 단 내려앉아 보입니다.
          배지 글씨(11px)와 이름(17px)은 글자 아랫선이 서로 다른 높이에
          있는데, 그 선을 억지로 맞추면 배지 상자가 통째로 아래로 밀려
          이름과 다른 층에 있는 것처럼 읽힙니다.
          가운데로 맞추면 배지가 이름 줄 한가운데에 서서 같은 층이 됩니다.

          번호와 이름은 둘 다 17px이라 어느 쪽으로 맞추든 똑같이 보입니다.
        */}
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {/*
            번호와 이름을 한 덩어리로 묶습니다. 따로 두면 줄이 모자랄 때 "48."만
            윗줄에 남고 이름이 아랫줄로 떨어집니다.
            max-w-full + break-keep + overflow-wrap:anywhere — 평소엔 한 줄이고,
            이름 하나가 칸보다 길 때만(글씨 크게 + 아주 긴 이름) 띄어쓰기에서,
            그래도 안 되면 글자 사이에서 다음 줄로 넘깁니다. 잘리거나 옆 단추를 덮지는 않습니다.
          */}
          {/*
            굵기 bold(700). 2026-09-14에 medium(500)으로 내려 봤다가 사용자가 원래대로 되돌리라고 했습니다.
            (600은 layout.tsx가 받지 않아 700으로 그려지므로 사잇값은 없습니다.)
          */}
          <span className="max-w-full shrink-0 text-[17px] font-bold break-keep text-ink [overflow-wrap:anywhere]">
            {/* 번호와 이름 사이 5px — 6px(mr-1.5)에서 사용자 요청으로 조금 붙였습니다(2026-09-14). */}
            <span className="mr-[5px] tabular-nums">{number}.</span>
            {entry.name}
          </span>
          {/*
            목록에서는 짧은 이름으로 답니다 (문화·홍보위원장 → 문화·홍보).
            상세 화면에서는 전체를 보여줍니다.

            ★ 공용 Badge를 쓰지 않고 여기만 따로 그립니다.
              공용 Badge는 12px에 px-2.5인데, 이 줄은 이름·직위·수정 단추가
              폭을 다투는 자리라 그 크기가 이름을 밀어냅니다. 한 단씩만
              좁혀(11px, px-2) 8px을 벌었고, 그 자리를 수정 단추를 키우는 데
              썼습니다. 상세 화면은 배지가 이름 아래 줄에 혼자 서므로
              거기서는 공용 Badge를 그대로 씁니다.

              ★ 높이를 22px로 못 박습니다.
              여백(py)으로 높이를 만들면 글씨 크기에 따라 값이 흔들려서
              이름 줄(17px 글씨의 줄 높이 ≈ 20px)과 미묘하게 어긋납니다.
              22px로 정해 두면 이름 줄보다 아주 조금 높아 나란히 선 것으로
              읽힙니다. 줄 높이도 22px(leading-[22px])로 맞춰 글씨가 상자
              한가운데에 앉습니다.

              ★ 자리가 모자라면 이 배지만 줄어들며 끝이 "…"로 잘립니다(min-w-0 + truncate).
              다음 줄로 넘기지 않습니다 — 카드 높이가 원우마다 들쭉날쭉해집니다.
              inline-flex로 두면 "…"이 붙지 않아서(말줄임은 글씨를 직접 품은 block
              상자에서만 동작) inline-block으로 그립니다.
          */}
          {entry.councilRole ? (
            <span className="inline-block h-[22px] min-w-0 truncate rounded-full bg-brand-50 px-2 text-[11px] leading-[22px] font-bold text-brand-500">
              {shortCouncilRole(entry.councilRole)}
            </span>
          ) : null}
        </div>
        {/*
          회사·직책 줄.

          색은 주황(brand-500)입니다.
          지나온 색: 주황 → 먹색 → 주황(시험) → 먹색 → 주황(2026-09-14 하루에만 다섯 번)
          → 회색 → 다시 주황(2026-09-22 사용자가 회색으로 바꿨다가 같은 날 되돌림).
          ★ 흰 박스 위 #FD5702 13px는 대비가 약해(약 3.2:1 — 옛 #FF7210은 2.6:1) medium 굵기를 지킵니다 — normal로 내리면 흐려집니다.
          ★ 같은 자리에 "아직 정보가 입력 안 됐어요"가 대신 들어올 때는 강조할 내용이 아니라
            흐린 회색(ink-muted) 그대로 둡니다. 주황과 회색으로 갈려 한눈에 구별됩니다.

          굵기는 medium(500)입니다. 2026-09-14에 사용자가 "아주 조금만 더 얇게"라고 해서
          normal(400)로 내렸다가, 같은 날 늦게 원상복구시켰습니다. 다시 얇게 제안하지 마세요.
          (450 같은 사잇값은 안 됩니다 — layout.tsx가 Noto Sans KR을 400·500·700·900
          네 벌만 받아서, 450을 적어도 브라우저가 500으로 그립니다.)

          바로 위 이름과는 글씨 크기(17px ↔ 13px)와 굵기(bold ↔ medium), 색(ink ↔ ink-muted)이
          달라 어느 쪽을 먼저 읽을지는 그대로입니다.

          ★ 이름 옆 원우회 직위 배지(위 councilRole)의 주황은 그대로입니다.
            이 줄과 같이 바꾸지 마세요 — 배지는 연주황 알약 위의 주황 글씨라
            대비 문제가 없고, 주황이 남은 덕에 이 줄과 구별됩니다.
        */}
        <p
          className={`mt-0.5 truncate text-[13px] ${
            affiliation ? "font-medium text-brand-500" : "text-ink-muted"
          }`}
        >
          {/* "전체" 수첩에서만 앞에 기수를 붙입니다. 한 기수 수첩에서는 다 같은 값이라 자리만 먹습니다. */}
          {showCohort ? (
            <span className="font-bold text-ink-soft">{entry.cohort} · </span>
          ) : null}
          {affiliation || "아직 정보가 입력 안 됐어요"}
        </p>
      </button>

      {/* 원우 누구나 서로 채워줄 수 있어서, 내 칸이라고 달리 보이지 않습니다. */}
      {/*
        "수정" 글씨 + 테두리 단추였던 것을 연필 아이콘 하나로 바꿨습니다
        (2026-09-14, 사용자 제안). 목록에서 카드를 걷어낸 뒤라 테두리 단추만
        줄마다 남아 혼자 상자처럼 보였습니다.

        ★ 덤으로 이름 자리가 넓어졌습니다.
          옛 단추는 글씨(13px) + 좌우 여백(px-2.5) + 테두리로 60px 가까이
          차지했는데, 지금은 -mr-2까지 더해 32px만 씁니다. 네 글자 직위
          (정무특보)가 붙어도 이름이 밀리던 자리가 그만큼 풀렸습니다.
          (그래서 이름과 자리를 다투느라 한 단 좁혀 뒀던 직위 배지는
           그대로 둡니다 — 이제 여유가 있으니 넓히고 싶으면 넓혀도 됩니다.)

        ★ 누르는 자리는 40px, 아이콘은 20px입니다.
          손끝이 닿는 자리는 아이콘보다 넉넉해야 합니다. -mr-2로 8px 당기는
          것은 그 빈 여백 때문입니다 — 안 당기면 아이콘이 화면 가장자리에서
          27px 안쪽에 서서, 16px에 맞춰 선 사진·검색칸보다 혼자 들어가
          보입니다. 헤더 아이콘(PageHeader의 last:-mr-1)과 같은 셈법입니다.

        색은 ink-faint(연회색) 그대로입니다 — 이 줄에서 먼저 읽혀야 하는 것은
        이름이고 수정은 그 다음입니다.
        (2026-09-14에 이 아이콘을 주황 선으로 해 봤다가, 소속·직책 줄을 주황으로 바꾼 뒤
         사용자가 "원래대로 되돌려놔줘"라고 해서 연회색으로 돌아왔습니다.)
      */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${entry.name} 정보 수정`}
        className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-faint transition active:bg-fill active:scale-95"
      >
        {/* 아이콘만 1px 위로(옆 글씨와 같이)·1px 왼쪽으로 (둘 다 2026-09-15 사용자 요청). 누르는 40px 자리는 그대로입니다. */}
        <PencilIcon className="h-5 w-5 -translate-x-px -translate-y-px" />
      </button>
    </div>
  );
}

/** 원우 카드를 눌렀을 때 아래에서 올라오는 상세 시트 */
/**
 * 이 원우와의 1:1 대화로 넘어가는 버튼.
 *
 * 방 문서는 미리 만들지 않습니다 — 실제로 메시지를 보내야 sendChatMessage가
 * 만듭니다. 그래야 들어와 보기만 하고 아무 말도 안 하면 채팅 목록에
 * 빈 방이 뜨지 않습니다. 여기서는 두 uid로 정해지는 방 id로 이동만 합니다.
 */
function StartChatButton({ otherUid, name }: { otherUid: string; name: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();

  function handleClick() {
    if (requireLogin()) return;
    if (!user) return;
    router.push(`/chat/${ensureDirectRoom(user.uid, otherUid)}`);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-[10.75px] text-[15px] font-bold text-white transition active:scale-[0.99]"
      >
        <ChatIcon className="h-5 w-5" />
        {/* 글씨만 1px 위로, 아이콘은 제자리 (2026-09-26 사용자 요청). 단추가 flex라 span에 transform이 먹습니다. */}
        <span className="-translate-y-px">{name} 원우와 1:1 채팅</span>
      </button>
    </div>
  );
}

function MemberDetailSheet({
  entry,
  autoPlay,
  isMe,
  onEnlargePhoto,
  onEdit,
  onClose,
}: {
  entry: DirectoryEntry;
  autoPlay: boolean;
  isMe: boolean;
  onEnlargePhoto: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  // 재생 버튼을 누르기 전에는 유튜브를 불러오지 않습니다.
  const [playing, setPlaying] = useState(autoPlay);
  const videoLink = parseVideoLink(entry.introVideoUrl);
  const thumbnail = videoLink ? videoThumbnail(videoLink) : null;
  const affiliation = affiliationLine(entry);
  const member = entry.member;

  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);
  // 둘러보는 사람에게는 번호가 내려오지 않습니다 — 전화·문자 자리에 로그인 안내 (2026-09-24 사용자 "번호만 로그인 뒤에").
  const isGuest = useIsGuest();

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} 상세 정보`}
      onClick={onClose}
    >
      {/* 손잡이는 스크롤 밖에 따로 둡니다 — 이유는 MemberEditSheet의 같은 자리 설명을 참고하세요. */}
      <div
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-surface sm:rounded-[16px]"
        onClick={(event) => event.stopPropagation()}
        style={sheetStyle}
      >
        {/*
          손잡이 바 — 가로 48px(w-12) · 세로 5px, 사진과의 사이 20px(pb-5) (2026-09-15 사용자 요청:
          가로 좀 늘리고 높이는 아주 조금 줄이고 사진과 사이를 더). 예전엔 40px × 6px, 사이 8px(pb-2) → 12px → 20px.
          원우 상세 시트에만 해당합니다 — 수정 시트(MemberEditSheet)의 손잡이는 그대로입니다.
        */}
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-5"
        >
          <div className="h-[5px] w-12 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7">
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={onEnlargePhoto}
              aria-label={`${entry.name} 사진 크게 보기`}
              className="rounded-full transition active:scale-95"
            >
              <Avatar
                src={entry.photoURL}
                name={entry.name}
                seed={entry.key}
                size={104}
              />
            </button>
            <div className="mt-4 flex items-center justify-center gap-2">
              <p className="text-[22px] font-bold text-ink">{entry.name}</p>
              {entry.councilRole ? <Badge>{entry.councilRole}</Badge> : null}
            </div>
            {affiliation ? (
              <p className="mt-1 text-[15px] text-ink-muted">{affiliation}</p>
            ) : null}
            <div className="mt-3 flex items-center gap-1.5">
              <Badge tone="neutral">{entry.cohort}</Badge>
              {/*
                구분 배지(일반 원우/대학생 원우). 2026-09-22부터 모든 기수에 답니다 —
                판단은 lib/cohort.ts의 hasYouthMembers가 하고, 지금은 늘 참입니다.
                예전에는 1·2기에만 달지 않았습니다.
              */}
              {hasYouthMembers(entry.cohort) ? (
                <Badge tone={entry.memberType === "youth" ? "brand" : "neutral"}>
                  {MEMBER_TYPE_LABEL[entry.memberType]}
                </Badge>
              ) : null}
            </div>
          </div>

          {/*
            앱 안에서 둘만의 대화 시작하기.
            계정이 있는 원우에게만, 그리고 나 자신에게는 보이지 않습니다.
          */}
          {member && !isMe ? <StartChatButton otherUid={member.uid} name={entry.name} /> : null}

          {isGuest ? (
            <div className="mt-3">
              <LoginRequired compact message="로그인하면 연락처를 볼 수 있어요" />
            </div>
          ) : null}

          {/* 휴대폰 — 눌러서 바로 전화·문자 */}
          {entry.phone ? (
            <div className="mt-3 flex gap-3">
              <a
                href={`tel:${phoneHref(entry.phone)}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-[10.75px] text-[15px] font-bold text-white transition active:scale-[0.99]"
              >
                {/* 글씨만 1px 위로, 그림 글자는 제자리 (2026-09-26 사용자 요청). */}
                📞 <span className="-translate-y-px">전화</span>
              </a>
              <a
                href={`sms:${phoneHref(entry.phone)}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-50 py-[10.75px] text-[15px] font-bold text-brand-500 transition active:scale-[0.99]"
              >
                ✉️ <span className="-translate-y-px">문자</span>
              </a>
            </div>
          ) : null}

          {/* 본인이 올린 소개 영상 */}
          {videoLink?.id ? (
            <div className="mt-6 overflow-hidden rounded-2xl bg-black">
              {playing ? (
                <iframe
                  src={videoEmbedUrl(videoLink) ?? ""}
                  title={`${entry.name} 소개 영상`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="소개 영상 재생"
                  className="relative block aspect-video w-full"
                >
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-[22px] text-white">
                      ▶
                    </span>
                  </span>
                </button>
              )}
            </div>
          ) : null}

          {/*
            영상에 따라 앱 안에서 재생이 막혀 있을 수 있어(퍼가기 금지 설정),
            유튜브 앱·웹으로 바로 넘어가는 길을 함께 둡니다.
          */}
          {videoLink?.id ? (
            <a
              href={videoLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-center text-[13px] font-bold text-brand-500"
            >
              {videoLink.kind === "vimeo" ? "비메오에서 보기" : "유튜브에서 보기"} ↗
            </a>
          ) : null}

          {/* 한 줄 소개 줄을 없애서 적힌 것이 하나도 없을 수 있습니다. 그땐 빈 상자를 그리지 않습니다. */}
          {entry.company || entry.position || entry.phone || member ? (
            /* 박스들 높이 1px씩 낮춤 (2026-09-15) — 이 상자는 위아래 20px → 19.5px, 좌우 20px 그대로 */
            <dl className="mt-6 flex flex-col gap-3 rounded-2xl bg-fill px-5 py-[19.5px]">
              {entry.company ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-[14px] text-ink-faint">회사·소속</dt>
                  <dd className="text-right text-[15px] font-bold text-ink">{entry.company}</dd>
                </div>
              ) : null}
              {entry.position ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[14px] text-ink-faint">직책</dt>
                  <dd className="text-[15px] font-bold text-ink">{entry.position}</dd>
                </div>
              ) : null}
              {entry.phone ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[14px] text-ink-faint">휴대폰</dt>
                  <dd className="text-[15px] font-bold text-ink">{formatPhone(entry.phone)}</dd>
                </div>
              ) : null}
              {member ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[14px] text-ink-faint">생일</dt>
                  <dd className="text-[15px] font-bold text-ink">
                    {formatBirthday(
                      member.birthdayMonthDay,
                      member.birthdayYear,
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {/* 본인이 쓴 자기소개 전문 */}
          {entry.introduction ? (
            <div className="mt-4 rounded-2xl bg-fill px-5 py-[19.5px]">
              <p className="mb-2 text-[14px] text-ink-faint">자기소개</p>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                {entry.introduction}
              </p>
            </div>
          ) : null}

          {/* 누가 채워줬는지 (본인이 정리한 경우에는 굳이 보여주지 않습니다) */}
          {entry.updatedByName && entry.updatedBy !== member?.uid ? (
            <p className="mt-4 text-center text-[12px] text-ink-faint">
              {entry.updatedByName} 님이 채워주셨어요
            </p>
          ) : null}

          <button
            type="button"
            onClick={onEdit}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-50 py-[10.75px] text-[15px] font-bold text-brand-500"
          >
            {/* 남의 칸도 "정보 수정하기" (2026-09-15 사용자 요청 — 예전엔 "정보 채워주기") */}
            {/*
              앞 아이콘은 연필 선 아이콘(PencilIcon — 원우 목록 줄 오른쪽 연필과 같은 그림), 22px (2026-09-26 사용자
              "아이콘을 이 그림으로 바꾸고 크기는 2배"; 그 전엔 글자 "✎"로 약 11px). 색은 글씨와 같은 주황.
              22px은 글줄(22.5px)을 넘지 않아 단추 높이가 그대로입니다.
              → 20.5px로 1.5px 줄임 (같은 날 사용자 "아이콘 크기 1.5px 만큼 줄여줘") → 20px ("0.5px 만큼 더 줄여줘") → 19.5px (한 번 더 0.5px).
            */}
            <PencilIcon className="h-[19.5px] w-[19.5px] shrink-0" />
            {/*
              ★ 이 창의 단추들(1:1 채팅·전화·문자·정보 수정하기·닫기 등)은 위아래 10.75px — 15px 글씨(글줄 22.5px)와 합쳐
                약 44px로 입력칸 높이와 같습니다 (2026-09-26 사용자 "박스들 높이 좀 줄여줘", 13.5px·15.5px에서).
            */}
            {/* 글씨만 1px 위로 (2026-09-26 사용자 요청), 연필은 제자리. */}
            <span className="-translate-y-px">{isMe ? "내 정보 수정하기" : "정보 수정하기"}</span>
          </button>

          {isMe ? (
            <Link
              href="/profile"
              className="mt-3 flex w-full items-center justify-center rounded-2xl bg-surface py-[10.75px] text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
            >
              사진·자기소개까지 고치기
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-2xl bg-fill py-[10.75px] text-[15px] font-bold text-ink-soft"
          >
            {/* 글씨만 1px 위로 (2026-09-26 사용자 요청). flex가 아닌 단추라 inline-block이어야 transform이 먹습니다. */}
            <span className="inline-block -translate-y-px">닫기</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** 프로필 사진을 화면 가득 크게 보여주는 화면 */
function PhotoLightbox({
  entry,
  onClose,
}: {
  entry: DirectoryEntry;
  onClose: () => void;
}) {
  // 뒤쪽 목록이 같이 스크롤되지 않게 막고, Esc로도 닫을 수 있게 합니다.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} 사진 크게 보기`}
      onClick={onClose}
    >
      <div
        className="flex justify-end px-4 py-3"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[26px] leading-none text-white active:bg-white/15"
        >
          ×
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        {entry.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photoURL}
            alt={`${entry.name} 프로필 사진`}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        ) : (
          <Avatar name={entry.name} seed={entry.key} size={220} />
        )}
      </div>

      <div
        className="px-5 py-5 text-center"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <p className="text-[17px] font-bold text-white">{entry.name}</p>
        {affiliationLine(entry) ? (
          <p className="mt-1 text-[13px] text-white/60">{affiliationLine(entry)}</p>
        ) : null}
      </div>
    </div>
  );
}
