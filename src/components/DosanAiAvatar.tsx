/** 도산 AI 프로필 — 사진 대신 앱 주황 바탕에 흰 "島"(도산의 호 島山의 첫 글자, 사람 사진이 없는 AI라는 걸 한눈에). squircle=목록용 둥근 사각형, 아니면 동그라미. */
export default function DosanAiAvatar({ size = 40, squircle = false, className = "" }: { size?: number; squircle?: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label="도산 AI"
      className={`flex shrink-0 items-center justify-center bg-brand-500 font-bold text-white ${squircle ? "squircle rounded-none!" : "rounded-full"} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5, lineHeight: 1, fontFamily: "var(--font-serif, serif)" }}
    >
      <span aria-hidden="true">島</span>
    </span>
  );
}
