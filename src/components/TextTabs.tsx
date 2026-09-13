"use client";

/**
 * 글자만으로 된 고르개 — 고른 칸은 먹색 글씨 + 아래 검은 바, 나머지는 연회색 글씨.
 * 바탕도 테두리도 없습니다.
 *
 * 쓰는 곳 (2026-09-14 기준 셋)
 *   - 원우수첩의 구분 고르개   전체 / 일반 원우 / 대학생 원우
 *   - 소식 탭의 서브탭        복습 영상 / 소식
 *   - 자료 탭의 서브탭        행사 사진 / 파일
 *
 * ★ 컴포넌트로 뺀 이유
 *   원래는 화면마다 같은 마크업을 복붙해 두었는데, 그날 하루 만에 소식 탭은
 *   20px, 원우수첩은 19px로 갈라졌습니다. 한 군데서만 고쳐도 셋이 같이
 *   움직이도록 여기로 모았습니다. 크기·간격·색을 바꾸려면 이 파일만 고치세요.
 *
 * 모양이 이렇게 오기까지 (모두 2026-09-13~14, 사용자가 실제 화면을 보며 고름)
 *   흰 알약 하나 안에 담기 → 주황 밑줄 탭 → 색만 바뀌는 글자 → 색 + 검은 바.
 *   알약을 걷은 것은 원우수첩에서 바로 위 검색칸이 이미 알약이라 두 줄이 겹쳐
 *   서면 어느 쪽이 고르개인지 갈라지지 않아서였습니다.
 *   바가 주황이 아니라 검은색인 것도 사용자가 정한 것입니다.
 *
 * 앱의 다른 고르개 세 곳(모임·투표·운영진)은 아직 알약입니다.
 */
export default function TextTabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 바깥 여백처럼 화면마다 다른 것만 여기로 받습니다 (예: "mt-4"). */
  className?: string;
}) {
  return (
    /*
     * pl-3 — 왼쪽으로 12px 들여 씁니다. 쓰는 쪽이 px-4(16px) 안에 두므로
     * 화면 끝에서 28px입니다. 끝에 바짝 붙이면 글자만 있는 줄이라 허전합니다.
     *
     * gap-[14px] — 칸 사이. 20px → 16px → 14px로 좁혀 온 값이라
     * Tailwind 단계(12px·16px) 사이입니다.
     *
     * overflow-x-auto + shrink-0 — 평소에는 다 들어옵니다. 좁은 폰이거나 보기
     * 설정이 "크게"(zoom 1.15)일 때만 넘치는데, body가 overflow-x: hidden이라
     * 이게 없으면 넘친 글자가 잘려 나가고 밀 수도 없습니다. 막대는
     * no-scrollbar로 숨깁니다(globals.css).
     * shrink-0이 없으면 칸이 쪼그라들어 글자가 두 줄로 접힙니다.
     */
    <div className={`no-scrollbar flex gap-[14px] overflow-x-auto pl-3 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            /*
              ★ 모든 칸을 늘 굵게 두고 색만 바꿉니다.
                굵기까지 바꾸면 고를 때마다 글자 폭이 달라져 옆 칸이 좌우로
                밀립니다. 색만 바뀌면 글자는 제자리에 못 박힙니다.

              안 고른 칸은 ink-faint(#A8A29E) — 토큰 단계에서 가장 연한 회색입니다.
              흰 바탕에서 대비가 2.4:1이라 읽기 기준(4.5:1)에는 못 미칩니다.
              대신 고른 칸이 먹색이라 "지금 어디에 서 있는지"는 또렷합니다.
              너무 흐려 못 누르는 칸처럼 보인다는 이야기가 나오면 ink-muted로.
            */
            className={`flex shrink-0 flex-col items-center gap-1.5 transition ${
              active ? "text-ink" : "text-ink-faint"
            }`}
          >
            {/*
              ★ 글씨 크기를 <button>이 아니라 이 <span>에 겁니다. 반드시.

              globals.css 맨 아래의 `input, textarea, select, button {
              font-size: 16px }`(아이폰에서 입력칸을 눌렀을 때 화면이 확대되는
              것을 막는 규칙)는 레이어 밖에 있고, Tailwind의 text-* 유틸리티는
              @layer utilities 안에 들어갑니다. CSS 캐스케이드 레이어에서는
              선택자 우선순위와 무관하게 **레이어 밖 선언이 이깁니다.**
              그래서 <button>에 크기를 걸면 조용히 무시되고 16px로 그려집니다.
              (2026-09-14에 발견 — 15px부터 80px까지 고쳤는데 화면은 내내 16px이었습니다.)

              leading-tight — 글줄 높이를 글자 크기의 1.25배로 조입니다.
              안 적으면 글꼴 기본값(1.4~1.5배)이 걸려 글자 위아래에 빈 자리가
              생기고, 글씨가 클수록 그 자리도 같이 커집니다.
            */}
            <span className="text-[19px] leading-tight font-bold">{item.label}</span>
            {/*
              고른 칸 아래 검은 바.

              ★ 안 고른 칸에도 같은 크기로 두고 색만 없앱니다.
                아예 빼 버리면 고를 때마다 줄 높이가 3px씩 오르내려 아래 목록이
                통째로 들썩입니다.

              ★ 폭이 글자의 60%인 것은 일부러입니다.
                글자 폭을 꽉 채우면 "파일"(두 자)과 "대학생 원우"(여섯 자)의 바
                길이가 세 배 가까이 벌어져 들쭉날쭉해 보입니다. 비율로 두면
                모두 같은 비례로 짧아져 나란히 읽힙니다.
                (%는 글자 폭에 걸립니다 — 단추 폭이 글자만큼만 잡히고, 비율 폭은
                 그 폭을 정하는 데는 끼어들지 않기 때문입니다.)

              두께 3px. rounded-full이라 양 끝이 둥근데, 2px 이하로 줄이면
              그 둥근 끝이 뭉개져 그냥 선처럼 보입니다.
            */}
            <span
              aria-hidden
              className={`h-[3px] w-[60%] rounded-full transition ${
                active ? "bg-ink" : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
