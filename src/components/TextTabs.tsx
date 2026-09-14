"use client";

import { Fragment } from "react";

/**
 * 탭 고르개 — 두 갈래가 생김새부터 다릅니다.
 *
 * 쓰는 곳 (2026-09-14 기준 셋)
 *   - 원우수첩의 구분 고르개   전체 / 일반 원우 / 대학생 원우   ("body")
 *   - 소식 탭의 서브탭        복습 영상 / 소식                ("header")
 *   - 자료 탭의 서브탭        행사 사진 / 파일                ("header")
 *
 * ★ 컴포넌트로 뺀 이유
 *   원래는 화면마다 같은 마크업을 복붙해 두었는데, 그날 하루 만에 소식 탭은
 *   20px, 원우수첩은 19px로 갈라졌습니다. 한 군데서만 고쳐도 셋이 같이
 *   움직이도록 여기로 모았습니다. 크기·간격·색을 바꾸려면 이 파일만 고치세요.
 *
 * ★ 두 갈래의 생김새
 *   "body"   **칩(알약) 줄** — 고른 칸은 먹색 알약 + 흰 글씨, 나머지는 옅은 회색 알약 + 먹색 글씨.
 *            2026-09-14 사용자가 보여 준 당근 필터 칩 그림을 따랐습니다.
 *            그 전(같은 날)에는 글자만 있고 고른 칸 아래 검은 바 + 화면 끝까지 회색 헤어라인이었고,
 *            그보다 전에는 흰 알약 하나 안에 담기 → 주황 밑줄 탭 → 색만 바뀌는 글자를 거쳤습니다.
 *   "header" 글자만. 검은 바 없음. 칸 순서는 **늘 그대로**이고 고른 칸만 먹색이 됩니다.
 *            칸 사이에 옅은 세로 줄이 있습니다.
 *            ★ 자리를 바꾸지 않습니다 (2026-09-14 사용자 "그냥 아예 자리를 바꾸지마").
 *              같은 날 고른 칸을 맨 앞(제목 자리)으로 옮기고 → 미끄러지는 애니메이션을 붙였다가
 *              → 애니메이션만 걷었다가 → 옮기기까지 걷었습니다. 다시 제안하지 마세요.
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
   * 빈 배열을 주면 탭 없이 trailing만 그립니다 (원우수첩 1·2기처럼 고르개를 숨기는 때).
   *
   * label은 글자만 아니라 JSX도 됩니다 — 원우수첩은 고른 칸의 이름 뒤에 몇 명인지를
   * 붙여 넣습니다("전체 50명"). 여기서는 받은 것을 그대로 그릴 뿐입니다.
   */
  items: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * 같은 줄 맨 오른쪽에 세우는 읽을거리 (원우수첩 1·2기의 "원우 50명").
   * 글씨 크기만 탭과 맞춥니다. 색과 굵기는 넘겨주는 쪽이 정합니다.
   */
  trailing?: React.ReactNode;
  /**
   * "body"   본문 맨 위에 놓이는 칩 줄. 14px bold, 알약 높이 약 34px, 칩 사이 8px.
   *          2026-09-14 기준 이 갈래를 쓰는 곳은 원우수첩 하나뿐입니다.
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
  const textClass = header ? "text-[22px] tracking-tight" : "text-[14px]";


  return (
    /*
     * ★ 뿌리가 <div>가 아니라 <span>입니다.
     *   "header" 갈래일 때 PageHeader의 <h1> 안으로 들어가는데, h1은 글줄에
     *   들어갈 수 있는 것(phrasing content)만 품을 수 있어 div를 넣으면 잘못된
     *   HTML이 됩니다. span에 display:flex를 주면 자리잡는 방식은 div와 같으면서
     *   h1 안에서도 올바릅니다. (제목 옆 기수 고르개도 같은 이유로 span입니다.)
     *
     * 들여쓰기 없음 — "body" 칩 줄은 첫 칩이 본문 끝(px-4, 화면 끝에서 16px)에 섭니다.
     * 글자만 있던 때는 끝에 바짝 붙이면 허전해서 6~12px 들였지만, 칩은 제 바탕이 있어
     * 위 검색칸·아래 목록과 왼쪽 끝을 맞추는 편이 정돈돼 보입니다.
     *
     * 칸 사이 — "body"는 gap-2(8px, 그림의 칩 간격). "header"는 칸 사이에 세로 줄이 끼어
     * gap이 줄 양옆에 한 번씩 걸리므로 역시 gap-2입니다 — 아래 세로 줄 주석 참고.
     *
     * overflow-x-auto + shrink-0 — 평소에는 다 들어옵니다. 좁은 폰이거나 보기
     * 설정이 "크게"(zoom 1.15)일 때만 넘치는데, body가 overflow-x: hidden이라
     * 이게 없으면 넘친 글자가 잘려 나가고 밀 수도 없습니다. 막대는
     * no-scrollbar로 숨깁니다(globals.css).
     * shrink-0이 없으면 칸이 쪼그라들어 글자가 두 줄로 접힙니다.
     */
    <span className={`relative flex ${className}`}>
      <span className="no-scrollbar relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {items.map((item, index) => {
          const active = item.value === value;
          return (
            <Fragment key={item.value}>
              {/*
                칸 사이 세로 줄 — "header"(소식·자료)에만 (2026-09-14 사용자 요청).
                아주 옅게(line, #E4E6E9) 2px(1px → 1.5px → 2px, 사용자 요청으로 굵힘), 높이는 글씨 크기와 같은
                22px이고 줄 가운데(self-center)에서 1px 내려 섭니다(relative top-px, 사용자 요청).
                글줄 높이(27.5px)가 아니라 글씨 크기에 맞춘 것은, 글줄에는 글자 위아래 빈 자리가
                들어 있어 그만큼 줄이 글자보다 길어 보이기 때문입니다.
                양옆 간격은 gap-2(8px)씩이라 글씨와 글씨 사이가 8 + 2 + 8 = 18px입니다.
              */}
              {header && index > 0 ? (
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
                  "header" — 글자만. 고른 칸은 먹색(ink), 나머지는 ink-faint(#A8A29E). 전환 없이 바로 바뀝니다.

                  "body" — 칩. 그림(당근 필터 칩)을 따른 값들:
                  - 고른 칩: bg-ink + text-surface. 흰 화면에서는 먹색 알약에 흰 글씨,
                    어두운 화면에서는 두 토큰이 뒤바뀌어 밝은 알약에 어두운 글씨가 됩니다.
                    (같은 날 주황으로 시험했다가 사용자가 되돌렸습니다.)
                  - 안 고른 칩: bg-fill(#F5F5F4) + text-ink. 그림의 옅은 회색 알약에 검은 글씨.
                  - 모든 칩이 같은 굵기(bold)라 고를 때 글자 폭이 흔들리지 않습니다.
                    (고른 칩만 인원 수가 붙어 넓어지는 것은 원우수첩 쪽 filterItems 주석 참고)
                  - px-3.5(14px) · py-2(8px) — 글줄 17.5px(14px × 1.25) + 16px = 약 34px.
                    처음엔 그림 비율대로 15px · px-4 · py-[10px](약 39px)였다가 같은 날
                    사용자가 "크기 좀 줄여줘"라고 해서 글씨·여백을 한 단씩 줄였습니다.
                */
                className={`flex shrink-0 items-center ${
                  header
                    ? active
                      ? "text-ink"
                      : "text-ink-faint"
                    : `rounded-full px-3.5 py-2 transition-colors active:scale-[0.97] ${
                        active ? "bg-ink text-surface" : "bg-fill text-ink"
                      }`
                }`}
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
