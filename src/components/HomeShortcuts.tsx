"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BallotBoxIllustration,
  LessonIllustration,
  MapIllustration,
  OpinionIllustration,
} from "@/components/illustrations";
import { PollCreateSheet } from "@/components/PollCard";

/**
 * 바로가기 한 칸의 생김새 — 버튼이든 링크든 같게 보이도록 한 곳에 둡니다.
 * py-2: 줄 사이를 좁히려고 위아래 12px에서 8px로 줄였습니다(2026-09-11).
 * 아이콘 28px·글씨 15px — 처음 36px·16px에서 같은 날 한 단계 줄였습니다. 아이콘과 합쳐
 * 한 칸 높이가 44px이라 손끝으로 누르기에는 여전히 충분합니다.
 */
const ITEM_CLASS_NAME =
  "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition active:bg-fill";

/**
 * 홈의 바로가기 — 투표 만들기 · 의견 모으기 · 원우 지도 · 수업 기록.
 *
 * 은행 앱(신한 SOL)의 "추천 서비스"처럼 흰 상자 하나에 그림 아이콘과 이름을
 * 2열로 늘어놓았습니다 (2026-09-11). 칸을 더하면 grid-cols-2가 알아서 다음 줄을 채웁니다.
 *
 *  - 투표 만들기 · 의견 모으기: 같은 시트(PollCreateSheet)를 무엇을 만들지(kind)만 달리해 엽니다.
 *    예전엔 투표 카드 아래 "투표 만들기" 단추 하나로 열고 시트 안에서 둘 중 하나를 골랐습니다.
 *  - 원우 지도: /map 화면으로 갑니다.
 *  - 수업 기록: /sessions 화면으로 갑니다. 예전엔 홈 아래쪽에 주차별 목록이 통째로 있었습니다.
 */
export default function HomeShortcuts() {
  const [creating, setCreating] = useState<"vote" | "opinion" | null>(null);

  return (
    /*
      위아래 여백은 6px(py-1.5) — 칸 안의 py-2와 합쳐 상자 끝에서 아이콘까지 14px입니다.
      (4px로 줄였다가 조금 답답해 보여 2px씩 되돌렸습니다.)
    */
    <section className="rounded-3xl bg-surface px-2 py-1.5 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-2 gap-x-1">
        {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
        <button type="button" onClick={() => setCreating("vote")} className={ITEM_CLASS_NAME}>
          <BallotBoxIllustration className="h-7 w-7 shrink-0" />
          <span className="text-[15px]! font-medium text-ink">투표 만들기</span>
        </button>

        <button type="button" onClick={() => setCreating("opinion")} className={ITEM_CLASS_NAME}>
          <OpinionIllustration className="h-7 w-7 shrink-0" />
          <span className="text-[15px]! font-medium text-ink">의견 모으기</span>
        </button>

        {/*
          -translate-y-px: 링크 칸(원우 지도·수업 기록)은 아이콘과 글씨를 1px 위로 올립니다.
          링크(a)는 단추와 줄 높이 계산이 미세하게 달라, 윗줄의 단추 칸들보다 살짝 아래에
          앉아 보였습니다. 칸 크기(py-2)는 그대로 두고 내용만 옮깁니다.
        */}
        <Link href="/map" className={ITEM_CLASS_NAME}>
          <MapIllustration className="h-7 w-7 shrink-0 -translate-y-px" />
          <span className="-translate-y-px text-[15px] font-medium text-ink">원우 지도</span>
        </Link>

        <Link href="/sessions" className={ITEM_CLASS_NAME}>
          <LessonIllustration className="h-7 w-7 shrink-0 -translate-y-px" />
          <span className="-translate-y-px text-[15px] font-medium text-ink">수업 기록</span>
        </Link>
      </div>

      {creating ? <PollCreateSheet kind={creating} onClose={() => setCreating(null)} /> : null}
    </section>
  );
}
