/**
 * 욕설·비하 표현 거르기 (사용자 요청 2026-10-26, 구글 플레이 출시 준비 — 뉴웨이브앱 lib/profanity.ts를 옮김).
 * 사용자 콘텐츠 앱 심사에서 "부적절한 글을 거르는 방법"을 묻습니다. 채팅 보내기·고치기(lib/chat-rooms.ts)가 씁니다.
 * ★ 브라우저에서 거르는 것이라 일부러 우회할 수 있습니다 — 걸러지지 않은 글은 신고·차단·운영진 삭제가 받쳐 줍니다.
 */
export const PROFANITY = /(씨s?발|시s?발|ㅅs?ㅂ|ㅆs?ㅂ|병s?신|ㅂs?ㅅ|지랄|좆|개새끼|개s?년|미친s?(놈|년|새끼)|느금|니미|닥쳐|꺼져|엿s?먹|fuck|shit|bitch|asshole)/i;

/** 채팅용 — "핸드폰 꺼져서"처럼 평범한 말에 들어가는 "꺼져"·"닥쳐"는 빼고 "시발점"은 허용합니다. */
export const CHAT_PROFANITY = new RegExp(PROFANITY.source.replace("|닥쳐", "").replace("|꺼져", "").replace("|시s?발", "|(?<![가-힣])시s?발(?![점역])"), "i");

export function containsProfanity(text: string): boolean {
  return CHAT_PROFANITY.test(text);
}
