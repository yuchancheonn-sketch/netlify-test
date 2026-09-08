"use client";

import { useRef, useState } from "react";

/**
 * ⚠️ 임시 시험 화면입니다. 확인이 끝나면 이 폴더째 지웁니다.
 *
 * 자판 위에 뜨는 아이폰 막대(∧ ∨ ✓)를 없앨 수 있는지 보는 자리입니다.
 * 그 막대는 Safari가 폼 입력칸에 붙이는 시스템 UI라 웹에서 끄는 공식
 * 방법이 없습니다. 다만 "입력칸이 아닌 것"(contenteditable)에는 안 붙는다는
 * 이야기가 있어, 폰에서 직접 눌러보고 정하려고 만들었습니다.
 *
 * 폰에서 http://172.30.1.8:3000/keyboard-test 로 들어가서
 * 두 칸을 차례로 눌러보고, 막대가 뜨는지 각각 봐 주세요.
 */
export default function KeyboardTestPage() {
  const [typed, setTyped] = useState("");
  const editable = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-8 px-5 py-10">
      <h1 className="text-[20px] font-bold text-ink">자판 막대 시험</h1>

      <section>
        <p className="mb-2 text-[15px] font-bold text-ink">
          ① 보통 입력칸 (지금 대화방이 쓰는 것)
        </p>
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="여기를 눌러보세요"
          className="w-full rounded-full bg-canvas px-4.5 py-2.5 text-[16px] leading-6 text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
        />
      </section>

      <section>
        <p className="mb-2 text-[15px] font-bold text-ink">
          ② 입력칸이 아닌 글쓰기 칸 (contenteditable)
        </p>
        <div
          ref={editable}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="시험용 글쓰기 칸"
          data-placeholder="여기도 눌러보세요"
          className="editable-test w-full rounded-3xl bg-canvas px-4.5 py-2.5 text-[16px] leading-6 text-ink shadow-[var(--shadow-card)] outline-none"
        />
      </section>

      <p className="text-[14px] leading-relaxed text-ink-muted">
        두 칸을 차례로 눌러, 자판 위에 ∧ ∨ ✓ 막대가 뜨는지 각각 봐 주세요.
        ②에서 막대가 안 뜨면 대화방 입력칸을 이 방식으로 바꿀 수 있습니다.
        한글이 제대로 쳐지는지도 함께 봐 주세요.
      </p>

      {/* 빈 칸일 때 안내 글씨를 띄우는 방법 — 진짜 input이 아니라 직접 그립니다. */}
      <style>{`
        .editable-test:empty::before {
          content: attr(data-placeholder);
          color: var(--color-ink-faint);
        }
      `}</style>
    </div>
  );
}
