/**
 * 위원회별 인원 구성 — 소식 탭 "위원회" 칸의 카드들 (2026-09-23 사용자 요청).
 *
 * 사용자가 준 표(위원회 7개, 위원장 1명 + 부위원장 여러 명)를 앱의 결로 옮긴 것입니다.
 * 위원회 하나가 카드 한 장이고, 조직도 카드(components/CommitteeOrgChart.tsx) 아래로 이어집니다.
 *
 * 모양: 흰 카드 + 회색 1px 테두리. 위원장 줄만 옅은 주황 바탕(brand-50)으로 한 단 올리고,
 * 부위원장은 옅은 가로선으로 나눕니다. 그림에 있던 파란색·노란색·이모지는 쓰지 않습니다.
 * 이름 오른쪽 괄호 안 소속은 그림 그대로이고, 길면 다음 줄로 넘어갑니다(자르지 않음).
 *
 * ★ 사람이 바뀌면 아래 COMMITTEES만 고치면 됩니다.
 */

interface Member {
  name: string;
  /** 괄호 안 소속·직함 */
  title: string;
}

interface Committee {
  name: string;
  chair: Member;
  viceChairs: Member[];
}

const COMMITTEES: Committee[] = [
  {
    name: "운영위원회",
    chair: { name: "고남수", title: "정화예술대학교 대학로캠퍼스 본부장, 뮤직테크놀러지" },
    viceChairs: [
      { name: "권준성", title: "(주)착한부자 대표" },
      { name: "김형중", title: "비엘에스티 대표" },
      { name: "홍정호", title: "(주)루키스 상무이사" },
    ],
  },
  {
    name: "재정위원회",
    chair: { name: "우지산", title: "(주)코이즈 대표이사" },
    viceChairs: [
      { name: "이승화", title: "심산벤처스 대표이사" },
      { name: "이진광", title: "(주)삼구아이앤씨 경영기획팀 과장" },
      { name: "이한별", title: "페퍼저축은행 차장" },
      { name: "최동균", title: "주식회사 주어링 대리" },
    ],
  },
  {
    name: "대외협력위원회",
    chair: { name: "채승수", title: "(주)A+에셋어드바이저 상무" },
    viceChairs: [
      { name: "도영아", title: "코이카 이사" },
      { name: "백재승", title: "이비안한의원 사업운영실 이사" },
      { name: "정영환", title: "(주)한양리더스 대표이사" },
      { name: "지희진", title: "중부대학교 학생성장교양학부 학장" },
      { name: "유명희", title: "노벨솔루션 대표" },
    ],
  },
  {
    name: "문화·홍보위원회",
    chair: { name: "이민우", title: "KBS 일요진단 앵커" },
    viceChairs: [
      { name: "구본이", title: "offbeat creative Creative Director" },
      { name: "신유민", title: "올드스테어즈 이사" },
      { name: "안세빈", title: "이연컴퍼니 대표" },
    ],
  },
  {
    name: "소통·화합위원회",
    chair: { name: "김의성", title: "스캇워크코리아 대표" },
    viceChairs: [
      { name: "백경순", title: "에스티원즈 대표" },
      { name: "성임득", title: "타이거부동산중개 대표" },
      { name: "이경우", title: "헥토이노베이션 실장" },
      { name: "이영옥", title: "제이드교육컨설팅 대표" },
    ],
  },
  {
    name: "봉사위원회",
    chair: { name: "류종범", title: "국방기술진흥연구소 국방기술PD" },
    viceChairs: [
      { name: "김태관", title: "주식회사 캐슬에듀 대표" },
      { name: "박준영", title: "마산아구찜 대표" },
      { name: "손유경", title: "(주)올림피아드교육 U2M 중동/상동 캠퍼스 대표" },
      { name: "이우선", title: "코스모스코리아 제이엘브 디자이너" },
    ],
  },
  {
    name: "학생위원회",
    chair: { name: "이성목", title: "홍익대학교 일반대학원 회화과 / 쎄서미 뮤지엄 실장" },
    viceChairs: [
      { name: "정가영", title: "이화여자대학교 컴퓨터공학과" },
      { name: "박준용", title: "서울대학교 국사학과" },
      { name: "오경민", title: "숭실대학교 경영학부" },
      { name: "천유찬", title: "건국대학교 사회환경공학부" },
    ],
  },
];

function MemberLine({ member }: { member: Member }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] leading-tight font-bold text-ink">{member.name}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed break-keep text-ink-muted">{member.title}</p>
    </div>
  );
}

function CommitteeCard({ committee }: { committee: Committee }) {
  const count = 1 + committee.viceChairs.length;

  return (
    <article className="rounded-3xl bg-surface px-4 pt-4 pb-4 shadow-[var(--shadow-card-flat)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[17px] font-bold text-ink">{committee.name}</h3>
        {/* 인원 수 — 그림의 오른쪽 위 알약과 같은 자리 */}
        <span className="shrink-0 rounded-full bg-fill px-2.5 py-1 text-[12px] font-bold text-ink-muted tabular-nums">
          {count}명
        </span>
      </div>

      {/* 위원장 — 옅은 주황 바탕으로 한 단 올립니다(그림의 노란 칸 자리). */}
      <div className="mt-3 rounded-2xl bg-brand-50 px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-bold text-brand-500">위원장</p>
        <MemberLine member={committee.chair} />
      </div>

      {/* 부위원장 — 옅은 회색 칸 안에서 가로선으로 나눕니다. */}
      <div className="mt-2 rounded-2xl bg-fill px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-bold text-ink-soft">부위원장</p>
        <div className="flex flex-col">
          {committee.viceChairs.map((member) => (
            <div key={member.name} className="border-t border-line py-2 first:border-t-0 first:pt-0 last:pb-0">
              <MemberLine member={member} />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

/** 위원회 7개 카드를 차례로. 소식 탭 위원회 칸에서 조직도 카드 아래에 섭니다. */
export default function CommitteeRoster() {
  return (
    <>
      {COMMITTEES.map((committee) => (
        <CommitteeCard key={committee.name} committee={committee} />
      ))}
    </>
  );
}
