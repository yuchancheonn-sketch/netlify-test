/**
 * 총괄 임원진 조직도 — 소식 탭 "위원회" 칸의 카드 (2026-09-23 사용자 요청).
 *
 * 사용자가 준 조직도 그림(가로로 넓은 표)을 **세로로 긴 조직도**로 다시 세운 것입니다
 * (2026-09-23 "세로로 긴 버전으로 다시 만들어줘 — 글로만 들어간 건 이상해").
 * 상자와 잇는 선이 그림 그대로 있고, 폰 화면(약 360px)에서 한 줄에 한 상자씩 내려갑니다.
 *
 * 그림 파일이 아니라 코드로 그립니다 — 글씨가 화면 크기·보기 설정을 따라가고,
 * 사람이 바뀌면 아래 값만 고치면 됩니다. 어두운 화면에서도 색이 따라옵니다.
 *
 * 색은 앱 것만 씁니다: 흰 상자 + 회색 1px 테두리, 직책표와 이어지는 선은 주황.
 * 고문·감사는 지시 계통 밖이라 그림처럼 점선 상자에 회색 선으로 답니다.
 *
 * ★ 사람이 바뀌면 여기 상수만 고치세요.
 */

interface Person {
  name: string;
  /** 하는 일·소속 한 줄 */
  title?: string;
}

const CHAIR: Person = { name: "박종진", title: "前 제1야전군사령관, 예비역 육군대장" };
const VICE_CHAIR: Person = { name: "김정헌", title: "법무법인 YK 대표변호사" };
const ADVISORS: { role: string; members: Person[] }[] = [
  { role: "고문", members: [{ name: "김정택", title: "제이티엔터테인먼트 명예예술단장" }] },
  {
    role: "감사",
    members: [
      { name: "김승규", title: "전자신문사 편집인, 전자신문인터넷 대표이사" },
      { name: "김인현", title: "(주)한국공간정보통신 대표이사" },
    ],
  },
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

/** 상자 위에 걸치는 직책표. 주황 알약이 상자 윗변 가운데에 반쯤 내려앉습니다(그림과 같은 자리). */
function RoleChip({ label, tone = "brand" }: { label: string; tone?: "brand" | "neutral" }) {
  return (
    <span
      className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-bold whitespace-nowrap ${
        tone === "brand" ? "bg-brand-500 text-white" : "bg-fill text-ink-soft ring-1 ring-line"
      }`}
    >
      {label}
    </span>
  );
}

/** 사람 한 명 — 이름과 그 아래 소속 한 줄. */
function PersonLine({ person, size = "md" }: { person: Person; size?: "md" | "sm" }) {
  return (
    <div>
      <p className={`font-bold text-ink ${size === "md" ? "text-[17px]" : "text-[15px]"}`}>
        {person.name}
      </p>
      {person.title ? (
        <p className="mt-0.5 text-[12px] leading-relaxed break-keep text-ink-muted">{person.title}</p>
      ) : null}
    </div>
  );
}

/** 상자 하나 — 직책표를 윗변에 걸치고 그 아래 사람들을 세로로 놓습니다. */
function ChartBox({
  role,
  members,
  dashed = false,
  size = "md",
}: {
  role: string;
  members: Person[];
  /** 지시 계통 밖(고문·감사)은 점선 테두리 — 그림과 같습니다. */
  dashed?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <div
      className={`relative rounded-2xl border px-4 pt-5 pb-4 text-center ${
        dashed ? "border-dashed border-line bg-surface" : "border-line bg-surface"
      }`}
    >
      <RoleChip label={role} tone={dashed ? "neutral" : "brand"} />
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <PersonLine key={member.name} person={member} size={size} />
        ))}
      </div>
    </div>
  );
}

/** 상자와 상자를 잇는 세로선. 주황은 지시 계통, 회색 점선은 자문입니다. */
function Connector({ tone = "brand" }: { tone?: "brand" | "neutral" }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-auto block h-5 w-0.5 ${
        tone === "brand" ? "bg-brand-200" : "border-l border-dashed border-line bg-transparent"
      }`}
    />
  );
}

export default function CommitteeOrgChart() {
  return (
    <article className="rounded-3xl bg-surface px-5 pt-5 pb-6 shadow-[var(--shadow-card-flat)]">
      <h2 className="text-[20px] font-bold text-ink">총괄 임원진 조직도</h2>
      <p className="mt-1 text-[13px] text-ink-muted">애기애타 리더십 과정 원우회</p>

      <div className="mt-6">
        <ChartBox role="회장" members={[CHAIR]} />
        <Connector />
        <ChartBox role="부회장" members={[VICE_CHAIR]} />

        {/*
          고문·감사 — 지시 계통이 아니라 옆에서 돕는 자리라 회색 점선으로 잇고 점선 상자에 담습니다
          (그림에서도 오른쪽에 점선 상자로 떨어져 있었습니다).
        */}
        <Connector tone="neutral" />
        <div className="flex flex-col gap-5">
          {ADVISORS.map((advisor) => (
            <ChartBox key={advisor.role} role={advisor.role} members={advisor.members} dashed />
          ))}
        </div>

        {/* 부회장 아래 두 갈래 — 정무특보와 사무처 */}
        <Connector />
        <ChartBox role="정무특보" members={[SPECIAL_ADVISOR]} />

        <Connector />
        {/*
          사무처 — 상자 안에 처장·차장·회계가 다시 한 칸씩 들어갑니다.
          안쪽 칸은 바탕을 옅은 회색(bg-fill)으로 깔아 바깥 상자와 구별합니다.
        */}
        <div className="relative rounded-2xl border border-line bg-surface px-4 pt-6 pb-4">
          <RoleChip label="사무처" />
          <div className="flex flex-col gap-3">
            {OFFICE.map((item) => (
              <div key={item.role} className="rounded-xl bg-fill px-4 py-3 text-center">
                <p className="text-[12px] font-bold text-brand-500">{item.role}</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {item.members.map((member) => (
                    <PersonLine key={member.name} person={member} size="sm" />
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
