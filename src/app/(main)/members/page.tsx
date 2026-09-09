"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import MemberEditSheet from "@/components/MemberEditSheet";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import { ChatIcon, PlusIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { ensureDirectRoom } from "@/lib/chat-rooms";
import {
  affiliationLine,
  buildDirectory,
  entryMatches,
  shortCouncilRole,
  type DirectoryEntry,
} from "@/lib/directory";
import { formatBirthday, formatPhone, phoneHref } from "@/lib/format";
import { useApprovedMembers, useRoster } from "@/lib/hooks";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import type { MemberType } from "@/lib/types";

type Filter = "all" | MemberType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "general", label: "일반 원우" },
  { value: "youth", label: "대학생 원우" },
];

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반 원우",
  youth: "대학생 원우",
};

/** 수정 시트가 열려 있는 상태. entry가 null이면 새 이름 추가입니다. */
type Editing = { entry: DirectoryEntry | null } | null;

export default function MembersPage() {
  const { data: members, loading, error } = useApprovedMembers();
  const roster = useRoster();
  const { profile } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  /** 사진만 크게 보기 */
  const [enlarged, setEnlarged] = useState<DirectoryEntry | null>(null);
  /** 시트를 열자마자 영상을 재생할지 (영상 썸네일을 눌러 들어온 경우) */
  const [autoPlay, setAutoPlay] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  /** 가입한 원우 + 아직 가입 전인 이름을 한 권으로 (이름 가나다순) */
  const entries = useMemo(
    () => buildDirectory(members, roster.data),
    [members, roster.data],
  );

  /**
   * 수첩 번호. 검색이나 필터를 걸어도 번호가 흔들리지 않도록
   * 전체 명단에서의 자리를 그대로 씁니다.
   */
  const numberOf = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry, index) => map.set(entry.key, index + 1));
    return map;
  }, [entries]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && entry.memberType !== filter) return false;
      return entryMatches(entry, needle);
    });
  }, [entries, keyword, filter]);

  function openEntry(entry: DirectoryEntry, playVideo = false) {
    setAutoPlay(playVideo);
    setSelected(entry);
  }

  const busy = loading || roster.loading;

  return (
    <>
      <PageHeader title="원우수첩" right={<HeaderActions />} />

      <div className="px-4">
        {/* 검색 */}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
          {/*
            글자 크기는 16px 그대로 두고 위아래 여백만 줄였습니다.
            16px보다 작게 하면 iOS에서 입력칸을 누를 때 화면이 확대됩니다.
            오른쪽에는 지금 몇 명이 보이는지를 넣어, 따로 줄을 만들지 않습니다.
          */}
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름·회사·직책으로 찾기"
            aria-label="원우 검색"
            /*
              눌렀을 때 둘러지던 주황 테두리는 뺐습니다. 글자를 치는 칸이라
              깜빡이는 커서와 올라온 자판만으로도 어디에 쓰고 있는지 알 수
              있습니다. (대화방 입력칸도 같은 이유로 뺐습니다.)
              오른쪽은 인원 수 자리만큼(pr-16) 비워 글자와 겹치지 않게 합니다.
            */
            className="w-full rounded-xl bg-surface py-2.5 pr-16 pl-10 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
          />
          {!busy && !error ? (
            <p className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] font-medium text-ink-soft">
              원우 <span className="font-bold text-ink">{visible.length}</span>명
            </p>
          ) : null}
        </div>

        {/*
          필터 — 자료 탭의 서브탭과 같은 짜임새입니다.
          흰 알약 하나 안에 셋을 담고, 고른 것만 주황 알약에 흰 글씨가 됩니다.
          나머지는 배경 없이 흐린 글씨로만 두어 어디에 서 있는지 색 하나로 읽힙니다.
          알약은 화면 폭을 꽉 채워 아래 원우 카드와 좌우 끝이 맞습니다.
        */}
        <div className="mt-3 flex rounded-full bg-surface p-1 shadow-[var(--shadow-card)]">
          {FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={active}
                /*
                  위 6px(pt-1.5) + 아래 10px(pb-2.5).
                  두 값의 합(16px)이 py-2(8+8)와 같아서 알약 높이는 그대로이고,
                  두 값의 차(4px) 때문에 글씨만 2px 위에 앉습니다.
                  높이를 건드리지 않고 글씨만 올리려면 이렇게 합을 지켜야 합니다.
                */
                className={`flex flex-1 items-center justify-center rounded-full px-3 pt-1.5 pb-2.5 text-[13px] font-bold transition ${
                  active ? "bg-brand-500 text-white" : "text-ink-muted"
                }`}
              >
                {/*
                  글씨를 감싸서 알약 한가운데에 앉힙니다.
                  leading-none로 글줄 높이를 글자 크기와 같게 잘라내고 1px 올립니다 —
                  한글 폰트는 내림 부분(descender)이 커서, 상자 한가운데에 맞춰도
                  눈으로는 살짝 아래에 앉아 보입니다.
                */}
                <span className="-mt-px leading-none">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 목록 */}
        <div className="mt-4 pb-6">
          {busy ? (
            <ul className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((key) => (
                <li key={key}>
                  <Skeleton className="h-[92px] rounded-3xl" />
                </li>
              ))}
            </ul>
          ) : error ? (
            <ErrorState message={error} />
          ) : visible.length === 0 ? (
            <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title={
                  entries.length === 0
                    ? "아직 수첩이 비어 있어요"
                    : "조건에 맞는 원우가 없어요"
                }
                description={
                  entries.length === 0
                    ? "아래 원우 추가하기로 우리 기수 원우를 한 명씩 채워보세요."
                    : "검색어나 필터를 바꿔보세요."
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((entry) => (
                <li key={entry.key}>
                  <MemberRow
                    entry={entry}
                    number={numberOf.get(entry.key) ?? 0}
                    onOpen={() => openEntry(entry)}
                    onOpenVideo={() => openEntry(entry, true)}
                    onEnlargePhoto={() => setEnlarged(entry)}
                    onEdit={() => setEditing({ entry })}
                  />
                </li>
              ))}
            </ul>
          )}

          {/*
            아직 가입하지 않은 원우 올리기.

            자료 탭의 "앨범 만들기"·"파일 올리기"와 **똑같은 모양**입니다.
            셋 다 "목록 아래에서 새로 하나 더하기"라는 같은 일을 하므로,
            생김새가 다르면 다른 종류의 단추처럼 읽힙니다.
            (예전에는 여기만 테두리만 두른 회색 단추였습니다.)
            한쪽을 고치면 나머지 둘도 같이 맞춰 주세요.
          */}
          {!busy && !error ? (
            <button
              type="button"
              onClick={() => setEditing({ entry: null })}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 text-[15px] font-bold text-brand-500 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
            >
              <PlusIcon className="h-5 w-5" />
              원우 추가하기
            </button>
          ) : null}
        </div>
      </div>

      {selected ? (
        <MemberDetailSheet
          entry={selected}
          autoPlay={autoPlay}
          isMe={!!selected.member && selected.member.uid === profile?.uid}
          onEnlargePhoto={() => setEnlarged(selected)}
          onEdit={() => {
            setEditing({ entry: selected });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {enlarged ? (
        <PhotoLightbox entry={enlarged} onClose={() => setEnlarged(null)} />
      ) : null}

      {editing ? (
        <MemberEditSheet
          entry={editing.entry}
          existingNames={entries.map((item) => item.name)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

/**
 * 수첩 한 줄.
 * 왼쪽 사진, 가운데 이름, 오른쪽 수정 버튼이 서로 다른 곳으로 가기 때문에
 * 버튼을 나눠 두었습니다. (버튼 안에 버튼을 넣을 수는 없습니다.)
 */
function MemberRow({
  entry,
  number,
  onOpen,
  onOpenVideo,
  onEnlargePhoto,
  onEdit,
}: {
  entry: DirectoryEntry;
  number: number;
  onOpen: () => void;
  onOpenVideo: () => void;
  onEnlargePhoto: () => void;
  onEdit: () => void;
}) {
  const videoLink = parseVideoLink(entry.introVideoUrl);
  const thumbnail = videoLink ? videoThumbnail(videoLink) : null;
  const affiliation = affiliationLine(entry);

  return (
    /*
     * gap-3 = 썸네일과 이름 사이 12px. 이 값이 이름 줄의 왼쪽 자리를 정합니다.
     *
     * 예전에는 gap-4(16px)였습니다. 썸네일 폭(112px)은 16:9를 지켜야 해서
     * 줄일 수 없으므로, 네 글자 직위(정무특보)가 붙어도 이름이 안 잘리게 할
     * 자리를 여기서 8px(양옆 두 칸) 냈습니다.
     */
    <div className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-[var(--shadow-card)]">
      {/* 사진 · 영상 썸네일 */}
      <button
        type="button"
        onClick={videoLink?.id ? onOpenVideo : onEnlargePhoto}
        aria-label={
          videoLink?.id ? `${entry.name} 소개 영상 보기` : `${entry.name} 사진 크게 보기`
        }
        /*
          112×63 — 정확히 16:9입니다. 이 비율이어야 유튜브 미리보기의 위아래
          검은 띠가 남김없이 잘려 나갑니다(자세한 까닭은 lib/video.ts).
          비율을 바꾸면 검은 줄이 다시 보이니 폭과 높이를 함께 고쳐야 합니다.
          영상이 없는 원우는 여기에 프로필 사진이 들어오고, 그때는 가로로
          넓게 잘립니다.
        */
        className="relative h-[63px] w-[112px] shrink-0 overflow-hidden rounded-2xl bg-canvas transition active:scale-95"
      >
        {thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            <span className="absolute right-1.5 bottom-1.5 flex h-5 items-center rounded-md bg-black/65 px-1.5 text-[11px] font-bold text-white">
              ▶ 영상
            </span>
          </>
        ) : entry.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photoURL}
            alt={`${entry.name} 프로필 사진`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Avatar name={entry.name} seed={entry.key} size={46} />
          </span>
        )}
      </button>

      {/* 이름 · 회사 · 직책 */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 py-1 text-left transition active:opacity-70"
      >
        {/*
          ★ 이름은 절대 자르지 않습니다.

          예전에는 이름에 truncate가 걸려 있어서, 자리가 모자라면 이름부터
          잘렸습니다. 수첩에서 가장 먼저 읽혀야 하는 것이 이름인데 "정무특보"
          같은 네 글자 직위가 붙으면 이름이 두세 글자만 남았습니다.

          지금은 순서를 뒤집었습니다 — 이름은 shrink-0으로 제 폭을 지키고,
          자리가 정말 모자라면 이 줄의 overflow-hidden이 **오른쪽 끝(배지)부터**
          잘라냅니다. 배지는 없어도 누구인지 알 수 있지만 이름은 그렇지 않습니다.
        */}
        <div className="flex items-baseline gap-1.5 overflow-hidden">
          <span className="shrink-0 text-[17px] font-bold text-ink tabular-nums">
            {number}.
          </span>
          <span className="shrink-0 whitespace-nowrap text-[17px] font-bold text-ink">
            {entry.name}
          </span>
          {/*
            목록에서는 짧은 이름으로 답니다 (문화·홍보위원장 → 문화·홍보).
            상세 화면에서는 전체를 보여줍니다.

            ★ 공용 Badge를 쓰지 않고 여기만 따로 그립니다.
              공용 Badge는 12px에 px-2.5인데, 이 줄은 이름·직위·수정 단추가
              폭을 다투는 자리라 그 크기가 이름을 밀어냅니다. 한 단씩만
              좁혀(11px, px-2) 8px을 벌었고, 그 자리를 수정 단추를 키우는 데
              썼습니다. 상세 화면은 배지가 이름 아래 줄에 혼자 서므로
              거기서는 공용 Badge를 그대로 씁니다.
          */}
          {entry.councilRole ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-500">
              {shortCouncilRole(entry.councilRole)}
            </span>
          ) : null}
        </div>
        {/*
          회사·직책일 때만 주황으로 띄웁니다.
          같은 자리에 한 줄 소개나 "아직 정보가 입력 안 됐어요"가 대신 들어올 때는
          강조할 내용이 아니라 회색 그대로 둡니다.
          흰 바탕의 주황은 대비가 약해서 굵기를 한 단계 올려 읽기 쉽게 했습니다.
        */}
        <p
          className={`mt-0.5 truncate text-[13px] ${
            affiliation ? "font-medium text-brand-500" : "text-ink-muted"
          }`}
        >
          {affiliation || entry.bio || "아직 정보가 입력 안 됐어요"}
        </p>
      </button>

      {/* 원우 누구나 서로 채워줄 수 있어서, 내 칸이라고 달리 보이지 않습니다. */}
      {/*
        테두리 색을 글씨와 같은 --color-ink-muted로 둡니다. 예전에는 텍스트만
        이 색이고 테두리는 stone-200이었는데, 그건 화면 색을 따라가지 않는
        고정 팔레트라 어두운 화면에서 흰 테두리처럼 도드라졌습니다.
      */}
      {/*
        ★ 글씨 크기 뒤의 !가 꼭 필요합니다.

        globals.css의 `button { font-size: 16px }`는 레이어 밖에 있어서
        @layer utilities 안의 text-[12px]를 이깁니다. 그래서 이 단추는
        12px이 아니라 **16px로 그려지고 있었고**, 의도보다 20px 가까이
        넓어져 이름이 설 자리를 빼앗고 있었습니다.
        (그 규칙은 아이폰에서 입력칸을 눌렀을 때 화면이 확대되는 것을
         막는 것이라 없앨 수 없습니다.)

        앞에 붙어 있던 연필 기호(✎)는 뺐습니다. 기호 하나가 16px인데 그게 곧
        이름 한 글자라, 네 글자 직위(정무특보)가 붙었을 때 마지막까지 모자라던
        자리였습니다. 무엇을 하는 단추인지는 글씨와 aria-label로 충분합니다.

        ★ 크기는 가로와 세로를 따로 봅니다.

          가로만 이름과 자리를 다툽니다. 그래서 글씨(13px)와 좌우 여백
          (px-2.5)은 넉넉히 두되, 늘어난 만큼은 아래 직위 배지를 한 단
          좁혀 벌충했습니다.

          세로는 아무것도 밀어내지 않지만, 그렇다고 키울 이유도 아닙니다.
          한때 py-2까지 올렸다가 단추가 카드 안에서 혼자 두툼해 보여
          py-1로 되돌렸습니다. 이 줄에서 눈에 먼저 들어와야 하는 것은
          이름이고, 수정은 그 다음입니다.
      */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${entry.name} 정보 수정`}
        className="shrink-0 rounded-lg border border-ink-muted px-2.5 py-1 text-[13px]! font-bold text-ink-muted transition active:scale-95"
      >
        수정
      </button>
    </div>
  );
}

/** 원우 카드를 눌렀을 때 아래에서 올라오는 상세 시트 */
/**
 * 이 원우와의 1:1 대화로 넘어가는 버튼.
 *
 * 방 문서는 미리 만들지 않습니다 — 실제로 메시지를 보내야 sendChatMessage가
 * 만듭니다. 그래야 들어와 보기만 하고 아무 말도 안 하면 채팅 목록에
 * 빈 방이 뜨지 않습니다. 여기서는 두 uid로 정해지는 방 id로 이동만 합니다.
 */
function StartChatButton({ otherUid, name }: { otherUid: string; name: string }) {
  const router = useRouter();
  const { user } = useAuth();

  function handleClick() {
    if (!user) return;
    router.push(`/chat/${ensureDirectRoom(user.uid, otherUid)}`);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]"
      >
        <ChatIcon className="h-5 w-5" />
        {name} 원우와 채팅
      </button>
    </div>
  );
}

function MemberDetailSheet({
  entry,
  autoPlay,
  isMe,
  onEnlargePhoto,
  onEdit,
  onClose,
}: {
  entry: DirectoryEntry;
  autoPlay: boolean;
  isMe: boolean;
  onEnlargePhoto: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  // 재생 버튼을 누르기 전에는 유튜브를 불러오지 않습니다.
  const [playing, setPlaying] = useState(autoPlay);
  const videoLink = parseVideoLink(entry.introVideoUrl);
  const thumbnail = videoLink ? videoThumbnail(videoLink) : null;
  const affiliation = affiliationLine(entry);
  const member = entry.member;

  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} 상세 정보`}
      onClick={onClose}
    >
      {/* 손잡이는 스크롤 밖에 따로 둡니다 — 이유는 MemberEditSheet의 같은 자리 설명을 참고하세요. */}
      <div
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-surface sm:rounded-[16px]"
        onClick={(event) => event.stopPropagation()}
        style={sheetStyle}
      >
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7">
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={onEnlargePhoto}
              aria-label={`${entry.name} 사진 크게 보기`}
              className="rounded-full transition active:scale-95"
            >
              <Avatar
                src={entry.photoURL}
                name={entry.name}
                seed={entry.key}
                size={104}
              />
            </button>
            <div className="mt-4 flex items-center justify-center gap-2">
              <p className="text-[22px] font-bold text-ink">{entry.name}</p>
              {entry.councilRole ? <Badge>{entry.councilRole}</Badge> : null}
            </div>
            {affiliation ? (
              <p className="mt-1 text-[15px] text-ink-muted">{affiliation}</p>
            ) : null}
            {entry.nickname && entry.nickname !== entry.name ? (
              <p className="mt-1 text-[13px] text-ink-faint">별칭 · {entry.nickname}</p>
            ) : null}
            <div className="mt-3">
              <Badge tone={entry.memberType === "youth" ? "brand" : "neutral"}>
                {MEMBER_TYPE_LABEL[entry.memberType]}
              </Badge>
            </div>
          </div>

          {/*
            앱 안에서 둘만의 대화 시작하기.
            계정이 있는 원우에게만, 그리고 나 자신에게는 보이지 않습니다.
          */}
          {member && !isMe ? <StartChatButton otherUid={member.uid} name={entry.name} /> : null}

          {/* 휴대폰 — 눌러서 바로 전화·문자 */}
          {entry.phone ? (
            <div className="mt-3 flex gap-3">
              <a
                href={`tel:${phoneHref(entry.phone)}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]"
              >
                📞 전화
              </a>
              <a
                href={`sms:${phoneHref(entry.phone)}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-50 py-3.5 text-[15px] font-bold text-brand-500 transition active:scale-[0.99]"
              >
                ✉️ 문자
              </a>
            </div>
          ) : null}

          {/* 본인이 올린 소개 영상 */}
          {videoLink?.id ? (
            <div className="mt-6 overflow-hidden rounded-2xl bg-black">
              {playing ? (
                <iframe
                  src={videoEmbedUrl(videoLink) ?? ""}
                  title={`${entry.name} 소개 영상`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="소개 영상 재생"
                  className="relative block aspect-video w-full"
                >
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-[22px] text-white">
                      ▶
                    </span>
                  </span>
                </button>
              )}
            </div>
          ) : null}

          {/*
            영상에 따라 앱 안에서 재생이 막혀 있을 수 있어(퍼가기 금지 설정),
            유튜브 앱·웹으로 바로 넘어가는 길을 함께 둡니다.
          */}
          {videoLink?.id ? (
            <a
              href={videoLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-center text-[13px] font-bold text-brand-500"
            >
              {videoLink.kind === "vimeo" ? "비메오에서 보기" : "유튜브에서 보기"} ↗
            </a>
          ) : null}

          <dl className="mt-6 flex flex-col gap-3 rounded-2xl bg-canvas p-5">
            {entry.company ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-[14px] text-ink-faint">회사·소속</dt>
                <dd className="text-right text-[15px] font-bold text-ink">{entry.company}</dd>
              </div>
            ) : null}
            {entry.position ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[14px] text-ink-faint">직책</dt>
                <dd className="text-[15px] font-bold text-ink">{entry.position}</dd>
              </div>
            ) : null}
            {entry.phone ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[14px] text-ink-faint">휴대폰</dt>
                <dd className="text-[15px] font-bold text-ink">{formatPhone(entry.phone)}</dd>
              </div>
            ) : null}
            {member ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[14px] text-ink-faint">생일</dt>
                <dd className="text-[15px] font-bold text-ink">
                  {formatBirthday(
                    member.birthdayMonthDay,
                    member.birthdayYear,
                    member.birthdayYearPublic,
                  )}
                </dd>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-[14px] text-ink-faint">한 줄 소개</dt>
              <dd className="text-right text-[15px] leading-relaxed text-ink">
                {entry.bio || "아직 소개가 없어요"}
              </dd>
            </div>
          </dl>

          {/* 본인이 쓴 자기소개 전문 */}
          {entry.introduction ? (
            <div className="mt-4 rounded-2xl bg-canvas p-5">
              <p className="mb-2 text-[14px] text-ink-faint">자기소개</p>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                {entry.introduction}
              </p>
            </div>
          ) : null}

          {/* 누가 채워줬는지 (본인이 정리한 경우에는 굳이 보여주지 않습니다) */}
          {entry.updatedByName && entry.updatedBy !== member?.uid ? (
            <p className="mt-4 text-center text-[12px] text-ink-faint">
              {entry.updatedByName} 님이 채워주셨어요
            </p>
          ) : null}

          <button
            type="button"
            onClick={onEdit}
            className="mt-4 w-full rounded-2xl bg-brand-50 py-4 text-[15px] font-bold text-brand-500"
          >
            ✎ {isMe ? "내 정보 수정하기" : "정보 채워주기"}
          </button>

          {isMe ? (
            <Link
              href="/profile"
              className="mt-3 flex w-full items-center justify-center rounded-2xl bg-surface py-4 text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
            >
              사진·자기소개까지 고치기
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-2xl bg-fill py-4 text-[15px] font-bold text-ink-soft"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 프로필 사진을 화면 가득 크게 보여주는 화면 */
function PhotoLightbox({
  entry,
  onClose,
}: {
  entry: DirectoryEntry;
  onClose: () => void;
}) {
  // 뒤쪽 목록이 같이 스크롤되지 않게 막고, Esc로도 닫을 수 있게 합니다.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} 사진 크게 보기`}
      onClick={onClose}
    >
      <div
        className="flex justify-end px-4 py-3"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[26px] leading-none text-white active:bg-white/15"
        >
          ×
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        {entry.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photoURL}
            alt={`${entry.name} 프로필 사진`}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        ) : (
          <Avatar name={entry.name} seed={entry.key} size={220} />
        )}
      </div>

      <div
        className="px-5 py-5 text-center"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <p className="text-[17px] font-bold text-white">{entry.name}</p>
        {affiliationLine(entry) ? (
          <p className="mt-1 text-[13px] text-white/60">{affiliationLine(entry)}</p>
        ) : null}
      </div>
    </div>
  );
}
