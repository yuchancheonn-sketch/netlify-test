/**
 * 총괄 임원진 조직도 — 소식 탭 "위원회" 칸의 카드 (2026-09-23 사용자 요청).
 *
 * 사용자가 준 조직도 그림 그대로, **가지가 갈라지는 계급도**입니다
 * (2026-09-23 "첨부한 계급도처럼 · 밑으로 스크롤하지 않아도 다 보이게").
 *   회장 ─ 부회장 아래로 정무특보 · 사무처가 갈라지고, 고문·감사는 오른쪽에 점선으로 따로 섭니다.
 *
 * ★ 한 화면에 다 들어오게 하려고
 *   - 좌우 두 칸으로 접었습니다 — 왼쪽은 회장→부회장 줄기, 오른쪽은 고문·감사.
 *   - 글씨를 작게(이름 13px, 소속 10px) 잡고 상자 여백을 좁혔습니다. 폰 360px에서 카드 높이 약 420px입니다.
 *   - 소속은 한 줄만 보이고 넘치면 …로 줄입니다(truncate) — 줄바꿈으로 키가 들쭉날쭉해지지 않게.
 *
 * 색은 앱 것만: 흰 상자 + 회색 1px 테두리, 직책표는 주황(자문 자리는 회색), 잇는 선은 옅은 회색.
 * 그림 파일이 아니라 코드라 글씨 크기 설정·어두운 화면을 따라갑니다. 사람이 바뀌면 아래 값만 고치세요.
 */

interface Person {
  name: string;
  title?: string;
}

const CHAIR: Person = { name: "박종진", title: "前 제1야전군사령관" };
const VICE_CHAIR: Person = { name: "김정헌", title: "법무법인 YK 대표변호사" };
const ADVISOR: Person = { name: "김정택", title: "제이티엔터테인먼트 명예예술단장" };
const AUDITORS: Person[] = [
  { name: "김승규", title: "전자신문사 편집인" },
  { name: "김인현", title: "(주)한국공간정보통신 대표이사" },
];
const SPECIAL_ADVISOR: Person = { name: "이영주", title: "지구촌나눔운동 본부장" };
const OFFICE: { role: string; members: Person[] }[] = [
  { role: "처장", members: [{ name: "김이혁", title: "비젠트로 상무" }] },
  {
    role: "차장",
    members: [
      { name: "손은우", title: "그리디웍스 대표" },
      { name: "정승희", title: "엘파트너스 대표" },
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

/** 상자 윗변 가운데에 걸치는 직책표. */
function RoleChip({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`absolute -top-[9px] left-1/2 -translate-x-1/2 rounded-full px-2 py-[3px] text-[11px] font-bold whitespace-nowrap ${
        muted ? "bg-fill text-ink-soft ring-1 ring-line" : "bg-brand-500 text-white"
      }`}
    >
      {label}
    </span>
  );
}

function PersonLine({ person }: { person: Person }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] leading-tight font-bold text-ink">{person.name}</p>
      {person.title ? (
        <p className="mt-0.5 truncate text-[10px] leading-tight text-ink-muted">{person.title}</p>
      ) : null}
    </div>
  );
}

/** 계급도의 상자 하나. */
function ChartBox({
  role,
  members,
  dashed = false,
  className = "",
}: {
  role: string;
  members: Person[];
  /** 지시 계통 밖(고문·감사)은 점선 — 그림과 같습니다. */
  dashed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-xl border bg-surface px-2 pt-3.5 pb-2.5 text-center ${
        dashed ? "border-dashed" : ""
      } border-line ${className}`}
    >
      <RoleChip label={role} muted={dashed} />
      <div className="flex flex-col gap-1.5">
        {members.map((member) => (
          <PersonLine key={member.name} person={member} />
        ))}
      </div>
    </div>
  );
}

export default function CommitteeOrgChart() {
  return (
    <article className="rounded-3xl bg-surface px-4 pt-5 pb-5 shadow-[var(--shadow-card-flat)]">
      <h2 className="text-[18px] font-bold text-ink">총괄 임원진 조직도</h2>

      {/*
        위 칸 — 왼쪽은 회장 → 부회장 줄기, 오른쪽은 고문·감사(점선).
        그림에서도 고문·감사는 줄기 오른쪽에 떨어져 있어, 좁은 화면에서도 같은 자리에 둡니다.
      */}
      <div className="mt-5 grid grid-cols-2 gap-x-3">
        <div>
          <ChartBox role="회장" members={[CHAIR]} />
          {/* 회장 → 부회장 세로선 */}
          <span aria-hidden="true" className="mx-auto block h-4 w-px bg-line" />
          <ChartBox role="부회장" members={[VICE_CHAIR]} />
        </div>

        <div className="flex flex-col gap-4">
          <ChartBox role="고문" members={[ADVISOR]} dashed />
          <ChartBox role="감사" members={AUDITORS} dashed />
        </div>
      </div>

      {/*
        부회장 아래 갈래 — 왼쪽 칸 가운데(전체 폭의 1/4)에서 내려와 가로로 뻗고,
        아래 두 칸(정무특보·사무처) 가운데(1/4·3/4)로 다시 내려갑니다. 그림의 ┬ 모양 그대로입니다.
      */}
      <div className="relative h-5" aria-hidden="true">
        <span className="absolute top-0 left-1/4 h-1/2 w-px -translate-x-1/2 bg-line" />
        <span className="absolute top-1/2 right-1/4 left-1/4 h-px bg-line" />
        <span className="absolute bottom-0 left-1/4 h-1/2 w-px -translate-x-1/2 bg-line" />
        <span className="absolute bottom-0 left-3/4 h-1/2 w-px -translate-x-1/2 bg-line" />
      </div>

      {/* 아래 칸 — 정무특보와 사무처. 사무처 상자 안에 처장·차장·회계가 한 칸씩 들어갑니다. */}
      <div className="grid grid-cols-2 items-start gap-x-3">
        <ChartBox role="정무특보" members={[SPECIAL_ADVISOR]} />

        <div className="relative rounded-xl border border-line bg-surface px-2 pt-4 pb-2.5">
          <RoleChip label="사무처" />
          <div className="flex flex-col gap-1.5">
            {OFFICE.map((item) => (
              <div key={item.role} className="rounded-lg bg-fill px-2 py-1.5 text-center">
                <p className="text-[10px] font-bold text-brand-500">{item.role}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {item.members.map((member) => (
                    <PersonLine key={member.name} person={member} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
