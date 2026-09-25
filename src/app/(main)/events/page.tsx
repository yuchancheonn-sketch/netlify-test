import { redirect } from "next/navigation";

/**
 * 모임 목록 화면은 2026-09-26에 없앴습니다 (사용자 "이 창은 아예 없애줘").
 * 일정은 이제 홈에서 봅니다 — 다가오는 일정 박스와 캘린더, 더하기는 캘린더의 + 시트, 지우기는 캘린더 일정 줄의 ×.
 *
 * 이 주소는 그 전에 보낸 알림(알림함·폰 푸시의 /events)이나 옛 링크를 눌러도 빈 화면에 닿지 않도록
 * 홈으로 넘겨주는 자리로만 남겨 둡니다. 예전 화면(목록·달력 보기·수정·삭제 단추)은 git 기록에 있습니다.
 */
export default function EventsRedirect() {
  redirect("/home");
}
