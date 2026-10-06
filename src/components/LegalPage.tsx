import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 이용약관·개인정보 처리방침 같은 안내문 틀 (사용자 요청 2026-10-06, 구글 플레이 출시 준비 — 뉴웨이브앱 LegalPage를 옮김).
 * 로그인 없이도 열리는 주소(/terms, /privacy)에서 씁니다. 이 주소들은 (main) 바깥이라 StageGate(로그인 단계 안내)를 거치지 않습니다.
 * 서버에서 그려지는 화면이라 훅을 쓰지 않습니다.
 */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] bg-canvas px-5 pb-16" style={{ paddingTop: "calc(20px + env(safe-area-inset-top))" }}>
      <Link href="/home" className="text-[14px] font-medium text-ink-muted underline underline-offset-4">
        ← 앱으로 돌아가기
      </Link>
      <h1 className="mt-6 text-[26px] font-bold text-ink">{title}</h1>
      <p className="mt-1 text-[13px] text-ink-faint">시행일 {updated} · 법률 검토 전 초안</p>
      <div className="mt-6 flex flex-col gap-7 text-[15px] leading-relaxed break-keep text-ink-soft">{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[17px] font-bold text-ink">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
