"use client";

import { useState } from "react";
import Link from "next/link";
import { BallotBoxIllustration, MapIllustration } from "@/components/illustrations";
import { PollCreateSheet } from "@/components/PollCard";

/** 바로가기 한 칸의 생김새 — 버튼이든 링크든 같게 보이도록 한 곳에 둡니다. */
const ITEM_CLASS_NAME =
  "flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-fill";

/**
 * 홈의 바로가기 — 투표 만들기 · 원우 지도.
 *
 * 은행 앱(신한 SOL)의 "추천 서비스"처럼 흰 상자 하나에 그림 아이콘과 이름을
 * 2열로 늘어놓았습니다 (2026-09-11). 칸을 더하면 grid-cols-2가 알아서 다음 줄을 채웁니다.
 *
 *  - 투표 만들기: 예전엔 투표 카드 아래 따로 선 "투표 만들기" 단추였습니다. 여기로 옮기면서
 *    그 단추는 없앴고, 여는 시트(PollCreateSheet)는 그대로 씁니다.
 *  - 원우 지도: 예전엔 홈에 지도 카드가 통째로 있었습니다. 이제 이 칸을 눌러 /map으로 갑니다.
 */
export default function HomeShortcuts() {
  const [creatingPoll, setCreatingPoll] = useState(false);

  return (
    <section className="rounded-3xl bg-surface p-2 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-2 gap-1">
        {/* 크기 뒤의 !는 globals.css의 `button { font-size: 16px }`를 이기려고 붙입니다. */}
        <button type="button" onClick={() => setCreatingPoll(true)} className={ITEM_CLASS_NAME}>
          <BallotBoxIllustration className="h-9 w-9 shrink-0" />
          <span className="text-[16px]! font-medium text-ink">투표 만들기</span>
        </button>

        <Link href="/map" className={ITEM_CLASS_NAME}>
          <MapIllustration className="h-9 w-9 shrink-0" />
          <span className="text-[16px] font-medium text-ink">원우 지도</span>
        </Link>
      </div>

      {creatingPoll ? <PollCreateSheet onClose={() => setCreatingPoll(false)} /> : null}
    </section>
  );
}
