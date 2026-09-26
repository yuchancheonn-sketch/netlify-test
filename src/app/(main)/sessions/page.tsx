import { redirect } from "next/navigation";

/**
 * 수업 기록 화면은 2026-09-27에 기능째 없앴습니다 (사용자 "이 기능은 그냥 아예 없애줘").
 * 홈 바로가기의 "수업 기록" 칸도 함께 뺐습니다.
 *
 * 이 주소는 옛 링크·방문 기록으로 들어와도 빈 화면에 닿지 않도록 홈으로 넘겨주는 자리로만 남깁니다
 * (일정 목록 /events와 같은 방식). 옛 주차 화면 주소(/sessions/3 등)는 sessions/[...rest]/page.tsx가 받아 홈으로 넘깁니다.
 *
 * 예전 화면(주차 목록·교시별 영상·느낀점 댓글·주제·강사 채우기)은 git 기록에 있습니다.
 * Firestore의 sessions·세션 댓글 데이터와 보안 규칙은 지우지 않고 그대로 둡니다(되살릴 때를 위해).
 */
export default function SessionsRedirect() {
  redirect("/home");
}
