"use client";

import { useEffect, useState } from "react";

/**
 * 도산 AI가 답을 만드는 동안(2026-10-27 뉴웨이브 AiThinkingText를 옮김 — 첫 문구는 "생각하는 중", 문구는 도산 주제로 바꿈. 원래 설명: 보이는 문구(말풍선 없이 파랑 글씨만, 2026-10-16)(2026-10-16 사용자 "점 세 개 말고 '고민 중…', '생각 중…'처럼, 다른 AI들이 고민할 때 쓰는 말 참고").
 * 다른 AI의 표현: 신한 "관련 정보를 찾고 있어요"·"잠시만 기다려주세요", ChatGPT "생각 중", Claude "고민 중", Gemini "생각하는 중".
 * 첫 문구는 늘 "생각하는 중이에요"이고, 이후 2.4초마다 다음 문구로 바뀌며(끝나면 처음으로) 글씨는 숨 쉬듯 은은하게 깜빡입니다.
 * 문구를 더하려면 PHRASES에 한 줄 추가(번역표 lib/i18n-dict.ts에도).
 */
// 2026-10-16 사용자 "클로드가 한 번의 답에도 고민 중·생각 중 하며 여러 개의 -ing가 계속 바뀌어 나오는 것처럼": 문구를 20개로 늘리고, 첫 문구("파도타기 중") 뒤로는
// 방금 나온 것과 같지 않게 무작위로 골라 1.7초마다 계속 바꿉니다(Claude Code의 Cogitating… Pondering… 처럼). 문구를 더하려면 PHRASES와 번역표(lib/i18n-dict.ts)에 한 줄씩.
const PHRASES = [
  "생각하는 중",
  "고민하는 중",
  "곱씹어 보는 중",
  "헤아려 보는 중",
  "선생의 말씀을 떠올리는 중",
  "자료를 찾아보는 중",
  "답을 정리하는 중",
  "마음을 읽는 중",
  "궁리하는 중",
  "되새겨 보는 중",
  "말을 고르는 중",
  "깊이 생각하는 중",
  "정성껏 다듬는 중",
  "숙고하는 중",
  "차분히 살펴보는 중",
  "생각을 모으는 중",
  "독립운동의 기록을 살피는 중",
  "인격 수양을 떠올리는 중",
  "무실역행을 되새기는 중",
  "흥사단 이야기를 찾는 중",
];

const CHANGE_MS = 1700;

export default function AiThinkingText() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((previous) => {
        let next = previous;
        while (next === previous) next = Math.floor(Math.random() * PHRASES.length);
        return next;
      });
    }, CHANGE_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span key={index} aria-hidden="true" className="animate-pulse">
      {`${PHRASES[index]}…`}
    </span>
  );
}
