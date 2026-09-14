"use client";

import { Fragment } from "react";

/**
 * 글자만으로 된 고르개 — 고른 칸은 먹색 글씨, 나머지는 연회색 글씨. 칸 사이에 옅은 세로 줄.
 * 바탕도 테두리도 밑줄 바도 없습니다.
 *
 * 쓰는 곳 (2026-09-15 기준 셋)
 *   - 원우수첩의 구분 고르개   전체 | 일반 원우 | 대학생 원우   ("body")
 *   - 소식 탭의 서브탭        복습 영상 | 소식                ("header")
 *   - 자료 탭의 서브탭        행사 사진 | 파일                ("header")
 *
 * ★ 컴포넌트로 뺀 이유
 *   원래는 화면마다 같은 마크업을 복붙해 두었는데, 그날 하루 만에 소식 탭은
 *   20px, 원우수첩은 19px로 갈라졌습니다. 한 군데서만 고쳐도 셋이 같이
 *   움직이도록 여기로 모았습니다. 크기·간격·색을 바꾸려면 이 파일만 고치세요.
 *
 * ★ 두 갈래는 이제 글씨 크기와 들여쓰기만 다릅니다 (2026-09-15).
 *   "body"   19px bold, 왼쪽 6px 들임.
 *   "header" 22px bold(제목 자리), 들여쓰기 없음.
 *   칸 순서는 늘 그대로이고, 칸 사이 세로 줄·간격(gap-2)은 두 갈래가 같습니다.
 *
 *   "body"는 고른 칸 아래에 검은 바가 있었는데, 2026-09-15 사용자가 "검은색 바 없애고 3개 사이에
 *   복습영상·소식 사이에 있는 선과 똑같이 선 넣어줘"라고 해서 소식·자료 서브탭과 같은 짜임이 됐습니다.
 *   지나온 모양: 흰 알약 하나 안에 담기 → 주황 밑줄 탭 → 색만 바뀌는 글자 → 색 + 검은 바
 *   (+ 화면 끝까지 회색 헤어라인, → 칩 → 다시 색 + 검은 바, 헤어라인 뺌) → 색 + 칸 사이 세로 줄.
 *   "header"의 자리 바꾸기·애니메이션은 2026-09-14에 넣었다 모두 걷었습니다. 다시 제안하지 마세요.
 */
export default function TextTabs<T extends string>({
  items,
  value,
  onChange,
  trailing,
  variant = "body",
  className = "",
}: {
  /**
   * 빈 배열을 주면 탭 없이 trailing만 그립니다.
   *
   * label은 글자만 아니라 JSX도 됩니다 — 원우수첩은 고른 칸의 이름 뒤에 몇 명인지를
   * 붙여 넣습니다("전체 50명"). 여기서는 받은 것을 그대로 그릴 뿐입니다.
   */
  items: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * 같은 줄 맨 오른쪽에 세우는 읽을거리. 글씨 크기만 탭과 맞춥니다. 색과 굵기는 넘겨주는 쪽이 정합니다.
   * (2026-09-15 기준 쓰는 곳 없음 — 원우수첩 1·2기도 "전체 N명" 칸 하나를 세웁니다.)
   */
  trailing?: React.ReactNode;
  /**
   * "body"   본문 맨 위에 놓이는 보통 고르개. 19px(20 → 16 → 17 → 16 → 19), 왼쪽 6px 들여씀.
   *          2026-09-15 기준 이 갈래를 쓰는 곳은 원우수첩 하나뿐입니다.
   * "header" 제목 줄의 제목 자리를 대신하는 고르개 (소식·자료 탭). 22px에 들여쓰기 없음 —
   *          다른 화면의 제목("원우수첩")과 같은 크기·같은 자리에 서야 하므로
   *          PageHeader의 h1이 쓰는 값(text-[22px] tracking-tight)을 그대로 맞췄습니다.
   *          높이는 글줄 하나(27.5px)뿐입니다 — 소식 탭의 기다리는
   *          화면(NewsFallback) 회색 칸이 이 높이에 맞춰져 있습니다.
   */
  variant?: "body" | "header";
  /** 바깥 여백처럼 화면마다 다른 것만 여기로 받습니다 (예: "mt-4"). */
  className?: string;
}) {
  const header = variant === "header";
  /* 탭과 trailing이 같은 값을 보도록 한 줄에 모아 둡니다. */
  const textClass = header ? "text-[22px] tracking-tight" : "text-[19px]";

  return (
    /*
     * ★ 뿌리가 <div>가 아니라 <span>입니다.
     *   "header" 갈래일 때 PageHeader의 <h1> 안으로 들어가는데, h1은 글줄에
     *   들어갈 수 있는 것(phrasing content)만 품을 수 있어 div를 넣으면 잘못된
     *   HTML이 됩니다. span에 display:flex를 주면 자리잡는 방식은 div와 같으면서
     *   h1 안에서도 올바릅니다. (제목 옆 기수 고르개도 같은 이유로 span입니다.)
     *
     * pl-1.5 — "body"는 왼쪽으로 6px 들여 씁니다(2026-09-14 사용자 요청으로 12px → 10px → 8px → 7px → 6px).
     * 쓰는 쪽이 px-4(16px) 안에 두므로 화면 끝에서 22px입니다. 끝에 바짝 붙이면 글자만 있는 줄이라 허전합니다.
     * "header" 갈래에서는 들이지 않습니다 — 다른 화면의 제목이 서는 자리(16px)에
     * 그대로 서야 하기 때문입니다.
     *
     * gap-2(8px) — 칸과 세로 줄 사이. 줄 양옆에 한 번씩 걸려 글씨와 글씨 사이가 8 + 2 + 8 = 18px입니다.
     * ("body"는 줄이 없던 때 gap-[14px]이었습니다.)
     *
     * overflow-x-auto + shrink-0 — 평소에는 다 들어옵니다. 좁은 폰이거나 보기
     * 설정이 "크게"(zoom 1.15)일 때만 넘치는데, body가 overflow-x: hidden이라
     * 이게 없으면 넘친 글자가 잘려 나가고 밀 수도 없습니다. 막대는
     * no-scrollbar로 숨깁니다(globals.css).
     * shrink-0이 없으면 칸이 쪼그라들어 글자가 두 줄로 접힙니다.
     */
    <span className={`relative flex ${className}`}>
      <span
        className={`no-scrollbar relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto ${
          header ? "" : "pl-1.5"
        }`}
      >
        {items.map((item, index) => {
          const active = item.value === value;
          return (
            <Fragment key={item.value}>
              {/*
                칸 사이 세로 줄 — 두 갈래 모두 같은 줄입니다
                ("header"는 2026-09-14부터, "body"는 2026-09-15 사용자 요청으로 "복습영상·소식 사이 선과 똑같이").
                아주 옅게(line, #E4E6E9) 2px(1px → 1.5px → 2px, 사용자 요청으로 굵힘), 높이 22px이고
                줄 가운데(self-center)에서 1px 내려 섭니다(relative top-px, 사용자 요청).
                22px은 "header" 글씨 크기에 맞춘 값인데, "body"(19px)에도 같은 줄을 그대로 씁니다 — 사용자가
                "똑같이"라고 했습니다. body에서 줄이 글자보다 길어 보이면 이 갈래만 19px로 줄이면 됩니다.
              */}
              {index > 0 ? (
                <span
                  aria-hidden
                  className="relative top-px h-[22px] w-0.5 shrink-0 self-center rounded-full bg-line"
                />
              ) : null}
              <button
                type="button"
                onClick={() => onChange(item.value)}
                aria-pressed={active}
                /*
                  ★ 모든 칸을 늘 같은 굵기(bold)로 두고 색만 바꿉니다.
                    굵기까지 바꾸면 고를 때마다 글자 폭이 달라져 옆 칸이 좌우로 밀립니다.
                    (2026-09-14에 "body"만 medium으로 내려 봤다가 같은 날 원상복구했습니다.
                     600은 layout.tsx가 받지 않아 700으로 그려지므로 사잇값은 없습니다.)

                  안 고른 칸은 ink-faint(#A8A29E) — 토큰 단계에서 가장 연한 회색입니다.
                  흰 바탕에서 대비가 2.4:1이라 읽기 기준(4.5:1)에는 못 미칩니다.
                  대신 고른 칸이 먹색이라 "지금 어디에 서 있는지"는 또렷합니다.
                  너무 흐려 못 누르는 칸처럼 보인다는 이야기가 나오면 ink-muted로.
                  전환 없이 바로 바뀝니다.
                */
                className={`flex shrink-0 items-center ${active ? "text-ink" : "text-ink-faint"}`}
              >
                {/*
                  ★ 글씨 크기를 <button>이 아니라 이 <span>에 겁니다. 반드시.

                  globals.css 맨 아래의 `input, textarea, select, button {
                  font-size: 16px }`(아이폰에서 입력칸을 눌렀을 때 화면이 확대되는
                  것을 막는 규칙)는 레이어 밖에 있고, Tailwind의 text-* 유틸리티는
                  @layer utilities 안에 들어갑니다. CSS 캐스케이드 레이어에서는
                  선택자 우선순위와 무관하게 **레이어 밖 선언이 이깁니다.**
                  그래서 <button>에 크기를 걸면 조용히 무시되고 16px로 그려집니다.
                  (2026-09-14에 발견 — 15px부터 80px까지 고쳤는데 화면은 내내 16px이었습니다.)

                  leading-tight — 글줄 높이를 글자 크기의 1.25배로 조입니다.
                  안 적으면 글꼴 기본값(1.4~1.5배)이 걸려 글자 위아래에 빈 자리가
                  생기고, 글씨가 클수록 그 자리도 같이 커집니다.
                */}
                <span className={`leading-tight font-bold ${textClass}`}>{item.label}</span>
              </button>
            </Fragment>
          );
        })}

        {/*
          오른쪽 끝 읽을거리. 위 단추와 띄어내기 위해 ml-auto로 밀어붙입니다 —
          탭이 하나도 없을 때도 제자리에 서도록.
        */}
        {trailing ? (
          <span className={`ml-auto shrink-0 leading-tight ${textClass}`}>{trailing}</span>
        ) : null}
      </span>
    </span>
  );
}
