/**
 * 도산 AI(2026-10-12 사용자 "뉴웨이브앱의 신앙 AI처럼 도산 안창호 선생에 대해 대화할 수 있는 도산 AI를 채팅창에 추가"):
 * 채팅 탭에 늘 있는 AI 대화방. 방은 평범한 1:1 방(두 uid 정렬 "a__b")이고 상대 uid가 아래 고정값입니다 —
 * 사람 uid와 겹칠 수 없는 글자(로그인 계정 id는 서버·Firebase가 정함).
 * 사용자는 자기 방에 메시지를 쓰고(규칙: 보낸 사람 = 본인), AI의 답은 서버(/api/dosan-ai)만 씁니다. 브라우저·서버 공용(use client 아님).
 */
export const DOSAN_AI_UID = "dosan-ai";
export const DOSAN_AI_NAME = "도산 AI";

/** 내 도산 AI 방 id — lib/chat-room-id.ts의 directRoomId와 같은 규칙(정렬해 "__"로 이음). */
export const dosanRoomId = (uid: string) => [uid, DOSAN_AI_UID].sort().join("__");

/** 방이 비었을 때 입력칸에 채워 보는 예시 질문 */
export const DOSAN_AI_SUGGESTIONS = [
  "도산 안창호 선생은 어떤 분이었나요?",
  "무실역행·충의용감이 무슨 뜻이에요?",
  "흥사단은 왜 만들어졌어요?",
  "도산 선생의 인격 수양 이야기를 들려 주세요",
];
