import { Badge } from "@/components/ui";

/**
 * 총괄 임원진 조직도 — 소식 탭 "위원회" 칸의 카드 (2026-09-23 사용자 요청).
 *
 * 사용자가 준 조직도 그림(파란 상자와 연결선으로 그린 표)을 앱의 결로 옮긴 것입니다.
 * 그림을 그대로 넣지 않고 글로 세운 이유:
 *  - 폰 화면(약 360px)에서 가로로 넓은 표는 글씨가 읽을 수 없을 만큼 작아집니다.
 *  - 이름·직책이 바뀔 때 여기 글자만 고치면 됩니다(그림은 다시 만들어야 합니다).
 *
 * 모양은 앱의 다른 카드와 같습니다 — 흰 카드 + 회색 1px 테두리, 주황은 직책표에만.
 * 연결선·그림자·이모지는 쓰지 않습니다(사용자 "AI 특유의 디자인 같이 안 보였으면").
 *
 * ★ 사람이 바뀌면 아래 GROUPS만 고치면 됩니다. 한 직책에 여러 명이면 members에 나란히 적습니다.
 */

interface Person {
  name: string;
  /** 하는 일·소속 한 줄. 없으면 이름만 섭니다. */
  title?: string;
}

interface Role {
  role: string;
  members: Person[];
}

interface Group {
  /** 묶음 이름. 없으면 직책들만 이어 섭니다. */
  heading?: string;
  roles: Role[];
}

const GROUPS: Group[] = [
  {
    roles: [
      { role: "회장", members: [{ name: "박종진", title: "前 제1야전군사령관, 예비역 육군대장" }] },
      { role: "부회장", members: [{ name: "김정헌", title: "법무법인 YK 대표변호사" }] },
    ],
  },
  {
    roles: [
      { role: "고문", members: [{ name: "김정택", title: "제이티엔터테인먼트 명예예술단장" }] },
      {
        role: "감사",
        members: [
          { name: "김승규", title: "전자신문사 편집인, 전자신문인터넷 대표이사" },
          { name: "김인현", title: "(주)한국공간정보통신 대표이사" },
        ],
      },
      { role: "정무특보", members: [{ name: "이영주", title: "지구촌나눔운동 대외협력본부 본부장" }] },
    ],
  },
  {
    heading: "사무처",
    roles: [
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
    ],
  },
];

export default function CommitteeOrgChart() {
  return (
    <article className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card-flat)]">
      <h2 className="text-[20px] font-bold text-ink">총괄 임원진</h2>
      <p className="mt-1 text-[13px] text-ink-muted">애기애타 리더십 과정 원우회</p>

      <div className="mt-4 flex flex-col gap-5">
        {GROUPS.map((group, groupIndex) => (
          <section key={group.heading ?? groupIndex}>
            {/*
              묶음 이름("사무처")은 작은 먹색 글씨 한 줄. 그림의 파란 이름표 대신입니다.
              위 묶음과는 gap-5(20px)로 갈라져 있어 선을 긋지 않아도 묶여 보입니다.
            */}
            {group.heading ? (
              <p className="mb-2 text-[13px] font-bold text-ink-soft">{group.heading}</p>
            ) : null}

            <ul className="flex flex-col">
              {group.roles.map((role) => (
                <li
                  key={role.role}
                  /* 직책 사이는 옅은 가로선 하나. 첫 줄 위에는 긋지 않습니다. */
                  className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
                >
                  {/* 직책표 — 폭을 고정해 이름들이 한 줄에서 시작하게 합니다(60px). */}
                  <span className="w-[60px] shrink-0 pt-0.5">
                    <Badge>{role.role}</Badge>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    {role.members.map((member) => (
                      <span key={member.name} className="block min-w-0">
                        <span className="block text-[16px] font-bold text-ink">{member.name}</span>
                        {member.title ? (
                          <span className="mt-0.5 block text-[13px] leading-relaxed break-keep text-ink-muted">
                            {member.title}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
