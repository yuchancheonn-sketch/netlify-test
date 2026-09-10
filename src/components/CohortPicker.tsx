"use client";

import { ChevronLeftIcon } from "@/components/icons";
import { ALL_COHORTS, COHORTS } from "@/lib/cohort";

/**
 * 제목 옆 기수 고르기. "원우수첩 10기 ⌄"처럼 제목과 한 줄에 글씨로만 보입니다.
 * 원우수첩(원우 누구나, "전체" 있음)과 홈·자료·일정(운영진만)이 함께 씁니다.
 *
 * 보이는 것은 글씨와 화살표뿐이고, 그 위에 투명한 <select>를 통째로 덮어 두었습니다.
 * 누르면 폰이 제 고르기 창(아이폰은 휠, 안드로이드는 목록)을 띄웁니다.
 * 드롭다운을 직접 그리면 바깥 누르기·스크롤·뒤로 가기를 전부 챙겨야 하는데,
 * 기기 것을 빌리면 그럴 일이 없습니다.
 *
 * ★ select의 글씨 크기는 제목(22px)을 물려받습니다. 16px보다 작으면
 *   아이폰이 누르는 순간 화면을 확대합니다. 투명해도 똑같이 확대되니 줄이지 마세요.
 */
export default function CohortPicker({
  value,
  onChange,
  includeAll = false,
}: {
  value: string;
  onChange: (next: string) => void;
  /** 맨 끝에 "전체"를 둘지 (원우수첩만) */
  includeAll?: boolean;
}) {
  return (
    <span className="relative inline-flex items-center gap-0.5 text-brand-500">
      {value === ALL_COHORTS ? "전체" : value}
      <ChevronLeftIcon className="h-5 w-5 -rotate-90" strokeWidth={2.5} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="기수 고르기"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {COHORTS.map((cohort) => (
          <option key={cohort} value={cohort}>
            {cohort}
          </option>
        ))}
        {includeAll ? <option value={ALL_COHORTS}>전체</option> : null}
      </select>
    </span>
  );
}
