import { redirect } from "next/navigation";

/** 옛 주차 화면 주소(/sessions/3 등)도 홈으로 — 수업 기록 기능은 2026-09-27에 없앴습니다(../page.tsx). */
export default function SessionWeekRedirect() {
  redirect("/home");
}
