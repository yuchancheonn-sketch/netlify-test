"use client";

import { SearchIcon } from "@/components/icons";

/**
 * 검색 박스 — 원우수첩 검색 박스(app/(main)/members/page.tsx)와 크기·모서리·돋보기·글씨·바탕이 모두 같은 값입니다(2026-10-12 사용자 "원우수첩 검색 박스랑 아예 똑같게").
 * 복습 영상·일정·파일 칸이 함께 씁니다(칸마다 따로 복사해 두면 하루 만에 갈라집니다). 바탕은 --color-search-box(밝은 화면 앱 바탕 회색, 어두운 화면 한 단 밝은 회색).
 * 돋보기는 누를 일 없는 그림이라 pointer-events-none(이게 없으면 오른쪽 끝을 눌러도 자판이 안 올라옵니다). 글씨 16px 아래로 줄이면 iOS가 화면을 확대하니 위아래 여백으로만 높이를 맞춥니다.
 */
export default function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = "mb-4",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** 화면 낭독기용 이름 */
  label: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon
        strokeWidth={1.75}
        className="pointer-events-none absolute top-[calc(50%-1px)] right-4 h-[28px] w-[28px] -translate-y-1/2 text-ink-faint"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-[14px] bg-search-box pt-[7.5px] pr-14 pb-[11.5px] pl-5 text-[17px] text-ink outline-none placeholder:text-[17.5px] placeholder:text-ink-muted"
      />
    </div>
  );
}

/**
 * 띄어쓰기·대소문자는 가리지 않고 제목에 검색어가 들어 있는지(원우수첩·복습 영상 검색과 같은 방식).
 * 한글은 NFC로 맞춰 비교합니다 — 맥·아이폰에서 올린 파일 이름은 자모가 풀어진(NFD) 모양으로 저장돼 있는 경우가 있어, 그대로 비교하면 눈에 보이는 글자가 같아도 못 찾습니다.
 */
export function matchesSearch(text: string, query: string): boolean {
  const flat = (value: string) => value.normalize("NFC").replace(/\s+/g, "").toLowerCase();
  const q = flat(query);
  return !q || flat(text).includes(q);
}
