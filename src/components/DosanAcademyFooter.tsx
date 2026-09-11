"use client";

import { useState } from "react";
import { ChevronLeftIcon } from "@/components/icons";

const SITE_URL = "https://dosan21.kr";

/**
 * 홈 맨 아래의 기관 정보 — 이 과정을 여는 도산아카데미.
 *
 * 당근·나만의닥터 같은 앱이 맨 아래에 사업자 정보를 두는 자리를 따랐습니다.
 * 약관 링크 한 줄, 접었다 펼 수 있는 정보 묶음, 저작권 한 줄 순서이고,
 * 글씨는 작고 흐리게 두어 위 카드들과 섞이지 않게 합니다.
 *
 * 문구는 도산아카데미 누리집(dosan21.kr) 맨 아래를 그대로 옮겼습니다 (2026-09-11 확인).
 * 전화·이메일·책임자 이름은 기관이 누리집에 공개한 정보라 공개 저장소에 두어도
 * 됩니다 — 원우의 연락처(개인정보)와는 다릅니다. 바뀌면 이 파일만 고치면 됩니다.
 */
export default function DosanAcademyFooter() {
  /*
   * 접힌 채로 시작합니다 — "도산아카데미 기관 정보 ∨"를 누르면 전문이 펼쳐집니다.
   * 처음엔 펼친 채로 두었다가 2026-09-11에 사용자 요청으로 바꿨습니다.
   */
  const [open, setOpen] = useState(false);

  return (
    <footer className="px-1 pt-4 pb-2 text-[12px] leading-relaxed text-ink-faint">
      <p className="flex items-center gap-2.5 text-ink-soft">
        <a href={`${SITE_URL}/?mode=policy`} target="_blank" rel="noopener noreferrer">
          이용약관
        </a>
        <span aria-hidden="true" className="h-2.5 w-px bg-line" />
        {/* 누리집에서도 개인정보처리방침만 굵게 씁니다 (법에서 눈에 띄게 두라고 정한 항목). */}
        <a
          href={`${SITE_URL}/?mode=privacy`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold"
        >
          개인정보처리방침
        </a>
      </p>

      {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="mt-4 flex items-center gap-1 text-[13px]! font-bold text-ink-soft"
      >
        도산아카데미 기관 정보
        {/* 왼쪽 꺾쇠를 돌려 씁니다 — 펼치면 위(∧), 접으면 아래(∨). */}
        <ChevronLeftIcon
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : "-rotate-90"}`}
        />
      </button>

      {open ? (
        <div className="mt-1.5 flex flex-col gap-0.5">
          <p>주소 : 서울 종로구 대학로 122, 5층(동숭동, 흥사단)</p>
          <p>이사장 : 구자관 · 원장 : 김철균</p>
          <p>고유번호 : 101-82-07980</p>
          <p>
            전화 : <a href="tel:027417591">02-741-7591</a> · 팩스 : 02-764-1091
          </p>
          <p>개인정보관리책임 : 황유철 사무처장</p>
          <p>
            이메일 : <a href="mailto:dosan21@dosan21.kr">dosan21@dosan21.kr</a>
          </p>
          <p>
            주무관청 : 행정안전부 (
            <a href="https://www.mois.go.kr" target="_blank" rel="noopener noreferrer">
              www.mois.go.kr
            </a>
            )
          </p>
        </div>
      ) : null}

      <p className="mt-3">Copyright ⓒ 2026 도산아카데미 All rights reserved.</p>
    </footer>
  );
}
