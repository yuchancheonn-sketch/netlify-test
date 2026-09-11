import { redirect } from "next/navigation";

/**
 * 모임 상세 화면은 2026-09-11에 없앴습니다 — 안내와 수정·삭제는 모임 목록(/events)의 카드로 옮겼습니다.
 *
 * 이 주소는 그 전에 보낸 알림(알림함에 쌓인 것·폰 푸시의 /events/{id})을 눌러도
 * 빈 화면에 닿지 않도록, 모임 목록으로 넘겨주는 자리로만 남겨 둡니다.
 * (고치기 화면 /events/{id}/edit는 그대로입니다.)
 */
export default function EventDetailRedirect() {
  redirect("/events");
}
