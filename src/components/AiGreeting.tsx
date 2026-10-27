"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 도산 AI 방의 안내 멘트(2026-10-27 뉴웨이브 AiGreeting을 옮김, 글씨 그라데이션만 주황 — 원래 설명: 2026-10-16 사용자가 준 슈퍼쏠 "은행 AI" 첫 화면처럼 — 큰 파란 인사 한 줄).
 * 시간대마다 한 줄 인사가 달라집니다(기기 시각 기준 6구간). 방에 들어올 때마다 새로 정해지고(방을 나갔다 오면 다시 보임),
 * 질문을 시작하면 부르는 쪽(room.tsx)이 지웁니다.
 * 대화 기록은 그대로 두되 이 안내가 화면 전체(대화 상자의 보이는 높이)를 차지해, 기록은 그 위쪽(스크롤을 올리면 보임)으로 밀려 안 보입니다.
 * (사용자 "자주 묻는 질문은 없애고, 안내 멘트가 나올 때 대화 내용은 그대로 있되 안 보이게 위로 올려")
 */
type Period = { from: number; text: string };

// 시간대마다 한 줄, 최대한 짧게(2026-10-16 사용자 "너무 길다, 시간대에 맞게 최대한 짧게")
const PERIODS: Period[] = [
  { from: 0, text: "잠이 안 오시나요?" },
  { from: 5, text: "좋은 아침이에요" },
  { from: 10, text: "무엇이 궁금하세요?" },
  { from: 14, text: "나누고 싶은 게 있나요?" },
  { from: 18, text: "오늘 하루 어땠나요?" },
  { from: 22, text: "오늘도 수고했어요" },
];

export function periodOf(hour: number): Period {
  let found = PERIODS[0];
  for (const p of PERIODS) if (hour >= p.from) found = p;
  return found;
}

/** 안내를 보이는 높이보다 이만큼 더 키워 위로 밀어냅니다 — 지난 대화의 맨 아래(말풍선 밑동·아바타 윗부분)가 제목 줄 아래에 살짝 비쳐 보이던 것을 막음(2026-10-27). 부르는 쪽의 "지난 대화 보기" 스크롤도 이 값을 뺍니다. */
export const GREETING_BLEED = 32;

export default function AiGreeting({ hour, onSized, children }: { hour?: number; onSized?: () => void; children?: ReactNode }) {
  // 방에 들어올 때의 시각으로 한 번 정함(보는 동안 문구가 바뀌지 않게). hour는 미리보기용
  const [now] = useState(() => hour ?? new Date().getHours());
  const period = periodOf(now);
  const ref = useRef<HTMLElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  // 부모가 매번 새 함수를 넘겨도 측정을 다시 시작하지 않도록 최신 콜백만 ref에 보관
  const sized = useRef(onSized);
  useEffect(() => {
    sized.current = onSized;
  });

  // 대화 상자(data-chat-scroll)의 "보이는 높이"(입력줄 자리 아래 여백 제외)만큼 키워 기록을 위로 밀어냄
  useEffect(() => {
    const box = ref.current?.closest<HTMLElement>("[data-chat-scroll]");
    if (!box) return;
    const measure = () => {
      const bottom = parseFloat(getComputedStyle(box).paddingBottom) || 0;
      setMinHeight(Math.max(0, box.clientHeight - bottom));
      sized.current?.();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    // 입력줄 높이가 바뀌어 대화 상자 아래 여백(style)이 달라져도 다시 잼 — 안 그러면 질문 박스가 입력줄에 가림(2026-10-17)
    const mutation = new MutationObserver(measure);
    mutation.observe(box, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return (
    <section ref={ref} className="relative flex flex-col items-center justify-center text-center" style={{ minHeight: minHeight + GREETING_BLEED, paddingTop: GREETING_BLEED }} aria-label="도산 AI 안내">
      {/* 글씨 색은 슈퍼쏠 "은행 AI" 첫 화면 사진에서 잼(2026-10-16): 왼쪽 밝은 주황 #ff8a3d → 오른쪽 진한 주황 #e04a00(뉴웨이브는 파랑 #4c7dff→#254ddb) 가로 그라데이션(글씨 폭만큼) */}
      <p className="-translate-y-[10px] text-[24px] leading-[1.4] font-medium break-keep">
        <span className="inline-block bg-[linear-gradient(to_right,#ff8a3d,#e04a00)] bg-clip-text text-transparent">{period.text}</span>
      </p>
      {children}
    </section>
  );
}
