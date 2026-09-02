"use client";

import Image from "next/image";

/** 사진이 없을 때 쓰는 배경색 팔레트. 이름이 같으면 항상 같은 색이 나옵니다. */
const FALLBACK_COLORS = [
  "#C2410C",
  "#B45309",
  "#0F766E",
  "#1D4ED8",
  "#7C3AED",
  "#BE185D",
  "#4D7C0F",
  "#6D28D9",
];

/** 문자열을 팔레트 인덱스로 바꾸는 간단한 해시 */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100_000;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/** 한글 이름은 성을 뺀 두 글자, 그 외에는 앞 두 글자를 씁니다. */
function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/^[가-힣]{3,}$/.test(trimmed)) return trimmed.slice(1, 3);
  if (/^[가-힣]+$/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed.slice(0, 2).toUpperCase();
}

interface AvatarProps {
  /** 프로필 사진 URL. 없으면 이름 이니셜이 표시됩니다. */
  src?: string | null;
  /** 이니셜과 alt 텍스트에 쓸 이름 */
  name: string;
  /** 지름(px) */
  size?: number;
  /** 색을 고정하는 기준값. 보통 uid를 넘깁니다. */
  seed?: string;
  className?: string;
}

export default function Avatar({ src, name, size = 40, seed, className = "" }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={`${name} 프로필 사진`}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={dimension}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        ...dimension,
        backgroundColor: colorFor(seed || name),
        fontSize: Math.round(size * 0.36),
      }}
      role="img"
      aria-label={`${name} 프로필 사진`}
    >
      {initialsFor(name)}
    </span>
  );
}
