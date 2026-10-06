"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WeekNewsPage from "../[weekId]/week";

/** 앱용 주소(news/week/view?id=…) — 앱 안에서는 id마다 화면 파일을 만들 수 없어 쿼리로 받습니다 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), lib/routes.ts). */
export default function ByQuery() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return id ? <WeekNewsPage weekId={id} /> : null;
}
