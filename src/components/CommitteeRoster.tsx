"use client";

import { useRequireLogin } from "@/components/LoginRequired";
import { useState } from "react";
import { createPortal } from "react-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FieldError, FieldLabel, PrimaryButton, flatInputClassName } from "@/components/ui";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { useCommitteeInfo } from "@/lib/hooks";

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
      <p className="text-[17px] leading-tight font-bold text-ink">{member.name}</p>
      <p className="mt-1 text-[14px] leading-relaxed break-keep text-ink-muted">{member.title}</p>
    </div>
  );
}

function CommitteeCard({ committee }: { committee: Committee }) {
  const count = 1 + committee.viceChairs.length;

  return (
    <article className="rounded-card bg-surface px-4 pt-4 pb-4 shadow-[var(--shadow-card-flat)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[20px] font-bold text-ink">{committee.name}</h3>
        {/* 인원 수 — 그림의 오른쪽 위 알약과 같은 자리 */}
        <span className="shrink-0 rounded-full bg-fill px-3 py-1 text-[13px] font-bold text-ink-muted tabular-nums">
          {count}명
        </span>
      </div>

      {/* 위원장 — 옅은 주황 바탕으로 한 단 올립니다(그림의 노란 칸 자리). */}
      <div className="mt-3 rounded-2xl bg-brand-50 px-3.5 py-3">
        <p className="mb-2 text-[13px] font-bold text-brand-500">위원장</p>
        <MemberLine member={committee.chair} />
      </div>

      {/* 부위원장 — 옅은 회색 칸 안에서 가로선으로 나눕니다. */}
      <div className="mt-2 rounded-2xl bg-fill px-3.5 py-3">
        <p className="mb-2 text-[13px] font-bold text-ink-soft">부위원장</p>
        <div className="flex flex-col">
          {committee.viceChairs.map((member) => (
            <div key={member.name} className="border-t border-line py-2 first:border-t-0 first:pt-0 last:pb-0">
              <MemberLine member={member} />
            </div>
          ))}
        </div>
      </div>

      {/* 뒷면의 "다시 누르면 앞면으로"와 같은 모양·자리 (2026-09-25 사용자 요청 — 앞면에도 뒤집을 수 있다는 표시). */}
      {/* 12px ÷ --fit-scale — 카드가 화면에 맞게 줄어도 안내는 늘 12px로 (조직도 카드 안내와 같게, 2026-09-26). */}
      <p className="mt-2 text-center text-[calc(12px/var(--fit-scale,1))] text-ink-faint">눌러서 뒷면 보기</p>
    </article>
  );
}

/**
 * 카드 뒷면 — 이 위원회가 하는 일과 준비 중인 일 (2026-09-23 사용자 요청
 * "터치하면 뒤집히고, 뒷면에 무슨 일을 하는지·어떤 프로젝트를 준비 중인지 쓰고 수정할 수 있게").
 *
 * 글은 Firestore committeeInfo/{위원회 이름}에 있습니다. **원우 누구나 읽고 고칩니다**
 * (2026-09-24 사용자 요청 — 하루 전에는 운영진만 고칠 수 있었습니다. 규칙도 함께 바꿨습니다: firestore.rules).
 * 크기는 앞면과 같고(부모가 absolute inset-0), 글이 길면 이 안에서 위아래로 굴려 읽습니다.
 *
 * ★ 총괄 임원진 조직도 카드(components/CommitteeOrgChart.tsx)에는 뒷면도 수정도 없습니다 —
 *   앱 코드에 적혀 있어 앱에서는 아무도 못 고칩니다(2026-09-24 사용자 "계급도 카드는 아무도 수정 못 하게").
 */
function CommitteeCardBack({ committee }: { committee: Committee }) {
  const { data } = useCommitteeInfo();
  const info = data.get(committee.name);
  const [editing, setEditing] = useState(false);
  const requireLogin = useRequireLogin();

  const sections = [
    { label: "하는 일", value: info?.about?.trim() ?? "" },
    { label: "준비 중인 일", value: info?.projects?.trim() ?? "" },
  ];

  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-card bg-surface px-4 pt-4 pb-4 shadow-[var(--shadow-card-flat)]">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[20px] font-bold text-ink">{committee.name}</h3>
        {/*
          "수정"은 원우 누구나 (2026-09-24 사용자 요청, 예전엔 운영진만).
          누르는 순간 카드 틀이 포인터를 붙잡지 않도록 onPointerDown을 멈춥니다
          (소식 카드의 ⋯ 와 같은 까닭 — AlbumCard 주석 참고).
        */}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            // 둘러보는 사람에게는 로그인 안내 (2026-09-24).
            if (requireLogin()) return;
            setEditing(true);
          }}
          className="shrink-0 rounded-full bg-fill px-3 py-1.5 text-[12px]! font-bold text-ink-soft"
        >
          수정
        </button>
      </div>

      {/* 글씨를 키우고 두 칸 사이를 넓혔습니다 (2026-09-24 사용자 요청 — 이름표 13→15px, 본문 15→17px, 사이 12→24px). */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.label}>
              <p className="text-[15px] font-bold text-brand-500">{section.label}</p>
              {section.value ? (
                <p className="mt-1.5 text-[17px] leading-relaxed whitespace-pre-line break-keep text-ink">
                  {section.value}
                </p>
              ) : (
                <p className="mt-1.5 text-[16px] text-ink-faint">
                  아직 안 적었어요. 위 &lsquo;수정&rsquo;에서 적어 주세요.
                </p>
              )}
            </section>
          ))}
        </div>
      </div>

      <p className="mt-2 shrink-0 text-center text-[calc(12px/var(--fit-scale,1))] text-ink-faint">다시 누르면 앞면으로</p>

      {editing ? (
        <CommitteeEditSheet
          committee={committee}
          initial={{ about: info?.about ?? "", projects: info?.projects ?? "" }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}

/**
 * 위원회 소개 글 고치기 창 (운영진만).
 * ★ document.body에 붙입니다(createPortal) — 카드가 뒤집히려고 3D 변형을 쓰고 있어서,
 *   그 안에 두면 이 창이 카드와 함께 돌아가고 자리도 카드 기준으로 잡힙니다.
 */
function CommitteeEditSheet({
  committee,
  initial,
  onClose,
}: {
  committee: Committee;
  initial: { about: string; projects: string };
  onClose: () => void;
}) {
  const [about, setAbout] = useState(initial.about);
  const [projects, setProjects] = useState(initial.projects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // 응답을 잠깐만 기다리고 닫습니다 — 이유는 lib/firestore-commit.ts에.
      await commitWrite(
        setDoc(
          doc(db, "committeeInfo", committee.name),
          { about: about.trim(), projects: projects.trim(), updatedAt: serverTimestamp() },
          { merge: true },
        ),
      );
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "저장하지 못했어요."));
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${committee.name} 소개 수정`}
      onClick={saving ? undefined : onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-surface px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">{committee.name} 소개</h2>

        <div className="mb-5">
          <FieldLabel htmlFor="committee-about">하는 일</FieldLabel>
          <textarea
            id="committee-about"
            value={about}
            onChange={(event) => setAbout(event.target.value.slice(0, INFO_MAX_LENGTH))}
            rows={4}
            placeholder="이 위원회가 맡아서 하는 일을 적어 주세요."
            className={`${flatInputClassName} resize-none leading-relaxed`}
          />
        </div>

        <div className="mb-6">
          <FieldLabel htmlFor="committee-projects">준비 중인 일</FieldLabel>
          <textarea
            id="committee-projects"
            value={projects}
            onChange={(event) => setProjects(event.target.value.slice(0, INFO_MAX_LENGTH))}
            rows={4}
            placeholder="지금 준비하고 있는 행사·프로젝트를 적어 주세요."
            className={`${flatInputClassName} resize-none leading-relaxed`}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-2xl bg-surface px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted shadow-[var(--shadow-card-flat)] disabled:opacity-50"
          >
            취소
          </button>
          <PrimaryButton onClick={save} loading={saving} size="sm">
            저장
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 소개 글 한 칸의 최대 글자 수 */
const INFO_MAX_LENGTH = 1000;

/**
 * 위원회 7개 카드 — 소식 탭 위원회 칸에서 조직도 카드 뒤로 한 장씩 넘겨 봅니다(2026-09-23 사용자 요청).
 * AlbumList의 넘기는 카드 한 장(Slide) 모양으로 돌려줍니다. back은 눌러서 뒤집었을 때 보이는 면입니다.
 */
export function committeeSlides(): {
  id: string;
  title: string;
  node: React.ReactNode;
  back: React.ReactNode;
}[] {
  return COMMITTEES.map((committee) => ({
    id: `committee-${committee.name}`,
    title: committee.name,
    node: <CommitteeCard committee={committee} />,
    back: <CommitteeCardBack committee={committee} />,
  }));
}
