/**
 * 총괄 임원진 조직도 — 소식 탭 "위원회" 칸의 첫 카드 (2026-09-23 사용자 요청).
 *
 * 사용자가 보여 준 쪽(dosan-10th 자료집)의 배치를 그대로 옮겼습니다
 * (2026-09-23 "이런 식으로 세로로 길고 카드 안에 딱 들어가는, 굳이 밑으로 스크롤 안 해도 되도록").
 *   ┌ 회장   │ 고문(점선)
 *   └ 부회장 │ 감사(점선)
 *     정무특보 (한 줄)
 *     사무처 ─ 처장 · 차장 · 회계 (3열)
 *
 * ★ 한 화면에 들어가게 — 글씨(이름 14px, 소속 10px)와 여백을 촘촘히 잡았습니다. 폰 360px에서 카드 높이 약 520px입니다.
 *   값을 키우면 카드가 화면을 넘어가 탭을 굴려야 하니, 글씨를 키울 때는 같이 살펴보세요.
 * 색은 앱 것만: 회장만 주황 채움, 나머지는 흰 상자 + 회색 1px 테두리, 고문·감사는 점선(지시 계통 밖).
 * 그림 파일이 아니라 코드라 글씨 크기 설정·어두운 화면을 따라갑니다. 사람이 바뀌면 아래 값만 고치세요.
 */

interface Person {
  name: string;
  title?: string;
}

const CHAIR: Person = { name: "박종진", title: "前 제1야전군사령관, 예비역 육군대장" };
const VICE_CHAIR: Person = { name: "김정헌", title: "법무법인 YK 대표변호사" };
const ADVISOR: Person = { name: "김정택", title: "제이티엔터테인먼트 명예예술단장" };
const AUDITORS: Person[] = [
  { name: "김승규", title: "전자신문사 편집인, 전자신문인터넷 대표이사" },
  { name: "김인현", title: "(주)한국공간정보통신 대표이사" },
];
const SPECIAL_ADVISOR: Person = { name: "이영주", title: "지구촌나눔운동 대외협력본부 본부장" };
const OFFICE: { role: string; members: Person[] }[] = [
  { role: "처장", members: [{ name: "김이혁", title: "비젠트로 상무" }] },
  {
    role: "차장",
    members: [
      { name: "손은우", title: "그리디웍스 대표" },
      { name: "정승희", title: "엘샌드위치_샐러드, 엘파트너스 대표" },
    ],
  },
  {
    role: "회계",
    members: [
      { name: "김소라", title: "남양주시 홍보팀 팀장" },
      { name: "정한별", title: "대성특허법률사무소 대표변리사" },
    ],
  },
];

function PersonBlock({ person, light = false }: { person: Person; light?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`text-[14px] leading-tight font-bold ${light ? "text-white" : "text-ink"}`}>
        {person.name}
      </p>
      {person.title ? (
        <p
          className={`mt-0.5 text-[10px] leading-snug break-keep ${
            light ? "text-white/85" : "text-ink-muted"
          }`}
        >
          {person.title}
        </p>
      ) : null}
    </div>
  );
}

/** 상자 하나 — 위에 직책, 아래 사람들. 점선은 지시 계통 밖(고문·감사), 채움은 회장입니다. */
function Box({
  role,
  members,
  dashed = false,
  filled = false,
}: {
  role: string;
  members: Person[];
  dashed?: boolean;
  filled?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2.5 py-2 text-center ${
        filled
          ? "bg-brand-500"
          : dashed
            ? "border border-dashed border-line bg-surface"
            : "border border-line bg-surface"
      }`}
    >
      <p
        className={`mb-1 text-[10px] font-bold ${filled ? "text-white/85" : "text-ink-muted"}`}
      >
        {role}
      </p>
      <div className="flex flex-col gap-1.5">
        {members.map((member) => (
          <PersonBlock key={member.name} person={member} light={filled} />
        ))}
      </div>
    </div>
  );
}

export default function CommitteeOrgChart() {
  return (
    <article className="rounded-3xl bg-surface px-4 pt-4 pb-4 shadow-[var(--shadow-card-flat)]">
      <h2 className="text-[18px] font-bold text-ink">총괄 임원진 조직도</h2>
      <div aria-hidden="true" className="mt-2 h-[2.5px] w-10 rounded-full bg-brand-500" />

      {/* 위 — 왼쪽 줄기(회장·부회장), 오른쪽 자문(고문·감사, 점선) */}
      <div className="mt-3 grid grid-cols-2 gap-x-2.5">
        <div className="flex flex-col">
          <Box role="회장" members={[CHAIR]} filled />
          {/*
            회장 → 부회장. 잇는 선은 1.5px·진한 회색(ink-faint)입니다
            (2026-09-23 사용자 "선들이 더 선명하게" — 예전엔 1px·아주 옅은 line 색이라 잘 안 보였습니다).
          */}
          <span aria-hidden="true" className="mx-auto h-3 w-[1.5px] bg-ink-faint" />
          <Box role="부회장" members={[VICE_CHAIR]} />
        </div>

        <div className="flex flex-col gap-2.5">
          <Box role="고문" members={[ADVISOR]} dashed />
          <Box role="감사" members={AUDITORS} dashed />
        </div>
      </div>

      {/* 부회장 → 정무특보 · 사무처 (왼쪽 줄기에서 내려옵니다) */}
      <div className="relative h-3" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/4 w-[1.5px] -translate-x-1/2 bg-ink-faint" />
      </div>

      {/* 정무특보 — 한 줄에 직책·이름·소속 (그림과 같습니다) */}
      <div className="flex items-baseline gap-2 rounded-xl border border-line bg-fill px-3 py-2">
        <span className="shrink-0 text-[10px] font-bold text-ink-muted">정무특보</span>
        <span className="shrink-0 text-[14px] font-bold text-ink">{SPECIAL_ADVISOR.name}</span>
        <span className="min-w-0 text-[10px] leading-snug break-keep text-ink-muted">
          {SPECIAL_ADVISOR.title}
        </span>
      </div>

      <div className="relative h-3" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/4 w-[1.5px] -translate-x-1/2 bg-ink-faint" />
      </div>

      {/* 사무처 — 처장 · 차장 · 회계 세 칸을 한 줄에 */}
      <div className="rounded-xl border border-line bg-surface px-2.5 pt-2 pb-2.5">
        <p className="mb-2 text-center text-[11px] font-bold text-ink">사무처</p>
        <div className="grid grid-cols-3 gap-x-2">
          {OFFICE.map((item, index) => (
            <div
              key={item.role}
              /* 칸 사이 세로줄 — 첫 칸 왼쪽에는 긋지 않습니다(그림과 같음). 색은 잇는 선과 같은 ink-faint. */
              className={`min-w-0 px-1 ${index > 0 ? "border-l border-ink-faint" : ""}`}
            >
              <p className="mb-1 text-[10px] font-bold text-brand-500">{item.role}</p>
              <div className="flex flex-col gap-1.5">
                {item.members.map((member) => (
                  <PersonBlock key={member.name} person={member} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
