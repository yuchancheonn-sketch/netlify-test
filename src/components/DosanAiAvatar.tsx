/**
 * 도산 AI 프로필 — 도산아카데미 로고(주황 바탕·흰 기러기, public/dosan-ai.png)입니다(2026-10-12 사용자가 준 로고. 처음엔 흰 "島" 글자였음).
 * 사용자가 편집해 준 그림이라 로고가 정확히 가운데가 아니어서, 흰 로고 부분의 바깥 사각형 가운데를 그림 한가운데로 옮겨 다시 만들었습니다(512px, 둘레는 같은 주황으로 채움).
 * 사람 사진이 없는 AI라는 걸 한눈에 보이게 하는 자리입니다. squircle=목록용 둥근 사각형, 아니면 동그라미.
 */
export default function DosanAiAvatar({ size = 40, squircle = false, className = "" }: { size?: number; squircle?: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label="도산 AI"
      className={`flex shrink-0 overflow-hidden bg-brand-500 ${squircle ? "squircle rounded-none!" : "rounded-full"} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dosan-ai.png" alt="" width={size} height={size} draggable={false} className="h-full w-full select-none object-cover" />
    </span>
  );
}
