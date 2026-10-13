"use client";

import { useRequireLogin } from "@/components/LoginRequired";
import { useState } from "react";
import { deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FieldError, FieldLabel, flatInputClassName } from "@/components/ui";
import { Sheet, SheetActions } from "@/components/Sheet";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import Avatar from "@/components/Avatar";
import { CheckIcon } from "@/components/icons";
import { useApprovedMembers, useCommitteeInfo, useRoster } from "@/lib/hooks";
import type { CommitteeInfoDoc } from "@/lib/types";

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
      // 2026-10-06 사용자 요청: 고덕현 부위원장 추가(원본 소책자 순서대로 맨 앞). 인원 수 알약은 자동으로 5명이 됩니다.
      { name: "고덕현", title: "아이스크림미디어 전무" },
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
 * 위원회 목표 글 — 새 칸(goal)이 있으면 그것, 없으면 옛 두 칸(하는 일·준비 중인 일)에 적힌 것을 이어서 보여 줍니다.
 * 2026-10-05 사용자 요청으로 두 칸을 "목표" 한 칸으로 합쳤는데, 이미 적어 둔 글이 사라지지 않게 읽을 때 합칩니다.
 */
function committeeGoal(info: CommitteeInfoDoc | undefined): string {
  if (info?.goal !== undefined) return info.goal.trim();
  return [info?.about?.trim(), info?.projects?.trim()].filter(Boolean).join("\n\n");
}

/**
 * 카드 뒷면 — 이 위원회의 목표 (2026-09-23 사용자 요청 "무슨 일을 하는지·어떤 프로젝트를 준비 중인지", 2026-10-05 "목표" 한 칸으로
 * "터치하면 뒤집히고, 뒷면에 무슨 일을 하는지·어떤 프로젝트를 준비 중인지 쓰고 수정할 수 있게").
 *
 * 글은 Firestore committeeInfo/{위원회 이름}에 있습니다. **원우 누구나 읽고 고칩니다**
 * (2026-09-24 사용자 요청 — 하루 전에는 운영진만 고칠 수 있었습니다. 규칙도 함께 바꿨습니다: firestore.rules).
 * 크기는 앞면과 같고(부모가 absolute inset-0), 글이 길면 이 안에서 위아래로 굴려 읽습니다.
 *
 * ★ 총괄 임원진 조직도 카드(components/CommitteeOrgChart.tsx)에는 뒷면도 수정도 없습니다 —
 *   앱 코드에 적혀 있어 앱에서는 아무도 못 고칩니다(2026-09-24 사용자 "계급도 카드는 아무도 수정 못 하게").
 */
function CommitteeCardBack({ committee, kind = "committee" }: { committee: { name: string }; kind?: "committee" | "club" }) {
  const { data } = useCommitteeInfo();
  const info = data.get(infoDocId(committee.name));
  const [editing, setEditing] = useState(false);
  const requireLogin = useRequireLogin();

  const sections = [{ label: "목표", value: committeeGoal(info) }];

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
          kind={kind}
          initial={committeeGoal(info)}
          initialMembers={info?.members ?? []}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}

/**
 * 위원회 소개 글 고치기 창 (운영진만).
 * ★ 공용 Sheet가 document.body에 붙입니다(createPortal) — 카드가 뒤집히려고 3D 변형을 쓰고 있어서,
 *   그 안에 두면 이 창이 카드와 함께 돌아가고 자리도 카드 기준으로 잡힙니다.
 */
function CommitteeEditSheet({
  committee,
  kind = "committee",
  initial,
  initialMembers = [],
  onClose,
}: {
  committee: { name: string };
  kind?: "committee" | "club";
  initial: string;
  initialMembers?: string[];
  onClose: () => void;
}) {
  const [goal, setGoal] = useState(initial);
  const [members, setMembers] = useState<string[]>(initialMembers);
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
          doc(db, "committeeInfo", infoDocId(committee.name)),
          // 옛 두 칸은 지웁니다 — 남겨 두면 목표를 비웠을 때 옛 글이 되살아나 보입니다.
          {
            goal: goal.trim(),
            // 동호회만 위원 명단도 저장(2026-10-13 사용자 요청) — 위원회 문서에는 칸을 안 만듦
            ...(kind === "club" ? { members } : {}),
            about: deleteField(),
            projects: deleteField(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "저장하지 못했어요."));
      setSaving(false);
    }
  }

  // 2026-10-06 사용자 요청: 뜨는 창 안쪽을 뉴웨이브앱과 똑같이 — 공용 Sheet(제목·굴러가는 칸·붙박이 취소/저장 줄)로 바꿈.
  return (
    <Sheet
      title={`${committee.name} 소개`}
      onClose={onClose}
      footer={<SheetActions onCancel={onClose} confirmLabel="저장" onConfirm={() => void save()} disabled={saving} loading={saving} />}
    >
      {kind === "club" ? <ClubMemberPicker picked={members} onChange={setMembers} /> : null}
      <div className="mb-6">
        <FieldLabel htmlFor="committee-goal">목표</FieldLabel>
        <textarea
          id="committee-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value.slice(0, INFO_MAX_LENGTH))}
          rows={8}
          placeholder={`이 ${kind === "club" ? "동호회" : "위원회"}의 목표를 적어 주세요.`}
          className={`${flatInputClassName} resize-none leading-relaxed`}
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}
    </Sheet>
  );
}

/**
 * 위원 고르기 — 원우 목록에서 동그라미를 눌러 고름(뉴웨이브 "채팅방에 공유" 창과 같은 모양, 2026-10-13 사용자 요청).
 * 후보 = 가입한 원우(승인·프로필 완료) + 아직 가입 전인 명단 칸. 고른 사람은 "키|이름"으로 저장.
 */
function ClubMemberPicker({ picked, onChange }: { picked: string[]; onChange: (next: string[]) => void }) {
  const users = useApprovedMembers();
  const roster = useRoster();
  const people = [
    ...users.data.map((u) => ({ key: `u:${u.uid}`, name: u.name, photoURL: u.photoURL, seed: u.uid })),
    ...roster.data.filter((r) => !r.linkedUid).map((r) => ({ key: `r:${r.id}`, name: r.name, photoURL: null, seed: r.id })),
  ].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const pickedKeys = new Set(picked.map(memberKey));

  function toggle(person: { key: string; name: string }) {
    onChange(pickedKeys.has(person.key) ? picked.filter((entry) => memberKey(entry) !== person.key) : [...picked, `${person.key}|${person.name}`].slice(0, 60));
  }

  return (
    <div className="mb-6">
      <FieldLabel>위원{picked.length ? ` (${picked.length}명)` : ""}</FieldLabel>
      <ul className="flex flex-col">
        {people.map((person) => {
          const on = pickedKeys.has(person.key);
          return (
            <li key={person.key}>
              <button type="button" onClick={() => toggle(person)} aria-pressed={on} className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left active:bg-fill">
                <Avatar src={person.photoURL ?? undefined} name={person.name} seed={person.seed} size={40} />
                <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-ink">{person.name}</span>
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? "border-brand-500 bg-brand-500 text-white" : "border-line text-transparent"}`}>
                  <CheckIcon className="h-4 w-4" strokeWidth={3} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {users.loading || roster.loading ? <p role="status" className="mt-2 text-[13px] text-ink-muted">원우 목록을 불러오는 중이에요…</p> : null}
      {users.error || roster.error ? <p role="alert" className="mt-2 text-[13px] text-ink-muted">원우 목록을 다 불러오지 못했어요. 창을 닫고 다시 열어 보세요.</p> : null}
    </div>
  );
}

/** 목표 글의 최대 글자 수 (옛 두 칸을 합친 글도 담기게 2000) */
const INFO_MAX_LENGTH = 2000;

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

/**
 * 동호회 카드 — 소식 탭 "동호회" 칸 (2026-10-06 사용자 요청: 목록 7개 그대로 → 2026-10-13 사용자 요청으로 6개 동호회·장 이름으로 편성 변경).
 * 위원회 카드와 같은 모양(앞면 + 눌러서 뒤집는 뒷면의 목표 글)인데, 사람은 담당 한 명뿐이라 칸이 하나입니다.
 * 직함(부회장·위원장)은 사용자가 준 목록에 적힌 경우만 달고, 정해지지 않은 자리는 "미정"으로 둡니다.
 * 뒷면 글은 위원회와 같은 committeeInfo/{동호회 이름}에 저장됩니다(원우 누구나 고침 — 규칙이 문서 이름을 가리지 않음).
 *
 * ★ 담당이 정해지거나 바뀌면 아래 CLUBS만 고치면 됩니다.
 */
interface Club {
  name: string;
  /** 담당 이름 — 정해지지 않았으면 null */
  leader: string | null;
  /** 직함 (예: 부회장, 위원장) — 목록에 없으면 생략 */
  role?: string;
}

/** 문서 id에는 "/"를 못 씀 — "등산/트레킹 동호회" 같은 이름은 "/"를 "-"로 바꿔 저장·조회(2026-10-13 사용자 요청 동호회 편성) */
const infoDocId = (name: string) => name.replace(/\//g, "-");

/** 위원 한 줄 "키|이름"에서 이름·키만 (2026-10-13) — 이름은 고를 때의 이름이라 그 뒤 이름을 고쳐도 카드엔 옛 이름이 보임(다시 저장하면 갱신) */
const memberName = (entry: string) => entry.slice(entry.indexOf("|") + 1);
const memberKey = (entry: string) => entry.slice(0, entry.indexOf("|"));

const CLUBS: Club[] = [
  { name: "골프동호회", leader: "채승수" },
  { name: "등산/트레킹 동호회", leader: "김정헌" },
  { name: "런닝 동호회", leader: "이우선" },
  { name: "와인 동호회", leader: "손은우" },
  { name: "(투자)연구회 동호회", leader: "채승수" },
  { name: "독서 동호회", leader: null },
];

function ClubCard({ club }: { club: Club }) {
  const { data } = useCommitteeInfo();
  const members = (data.get(infoDocId(club.name))?.members ?? []).map(memberName);
  return (
    // 기본 높이를 위원회 카드만큼 키움(2026-10-13 사용자 "기본적인 카드 높이 높여주고") — 위원이 많아지면 그만큼 더 늘어남.
    <article className="min-h-[400px] rounded-card bg-surface px-4 pt-4 pb-4 shadow-[var(--shadow-card-flat)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[20px] font-bold text-ink">{club.name}</h3>
        {/* 인원 수(장 + 위원) — 위원회 카드와 같은 알약 */}
        <span className="shrink-0 rounded-full bg-fill px-3 py-1 text-[13px] font-bold text-ink-muted tabular-nums">
          {(club.leader ? 1 : 0) + members.length}명
        </span>
      </div>

      {/* 장 — 위원회 카드의 위원장 칸과 같은 옅은 주황 바탕. */}
      <div className="mt-3 rounded-2xl bg-brand-50 px-3.5 py-3">
        <p className="mb-2 text-[13px] font-bold text-brand-500">장</p>
        {club.leader ? (
          <p className="flex items-baseline gap-1.5 text-[17px] leading-tight font-bold text-ink">
            {club.leader}
            {club.role ? <span className="text-[14px] font-medium text-ink-muted">{club.role}</span> : null}
          </p>
        ) : (
          <p className="text-[17px] leading-tight font-bold text-ink-faint">미정</p>
        )}
      </div>

      {/* 위원 — 부위원장 칸과 같은 옅은 회색 칸. 명단은 뒷면 "수정"에서 추가(원우 누구나). */}
      <div className="mt-2 rounded-2xl bg-fill px-3.5 py-3">
        <p className="mb-2 text-[13px] font-bold text-ink-soft">위원</p>
        {members.length > 0 ? (
          <div className="flex flex-col">
            {members.map((name, index) => (
              <p key={index} className="border-t border-line py-2 text-[17px] leading-tight font-bold text-ink first:border-t-0 first:pt-0 last:pb-0">
                {name}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-ink-faint">아직 없어요. 뒷면 &lsquo;수정&rsquo;에서 추가해 주세요.</p>
        )}
      </div>

      {/* 앞면 안내 — 위원회 카드와 같은 모양·자리(12px ÷ --fit-scale). */}
      <p className="mt-2 text-center text-[calc(12px/var(--fit-scale,1))] text-ink-faint">눌러서 뒷면 보기</p>
    </article>
  );
}

/** 동호회 6개 카드 — 소식 탭 동호회 칸에서 올라온 소식 카드 앞에 한 장씩 넘겨 봅니다(committeeSlides와 같은 모양). */
export function clubSlides(): {
  id: string;
  title: string;
  node: React.ReactNode;
  back: React.ReactNode;
}[] {
  return CLUBS.map((club) => ({
    id: `club-${club.name}`,
    title: club.name,
    node: <ClubCard club={club} />,
    back: <CommitteeCardBack committee={club} kind="club" />,
  }));
}
