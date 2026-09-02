"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import MemberEditSheet from "@/components/MemberEditSheet";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { PlusIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  affiliationLine,
  buildDirectory,
  entryMatches,
  type DirectoryEntry,
} from "@/lib/directory";
import { formatBirthday, formatPhone, phoneHref } from "@/lib/format";
import { useApprovedMembers, useRoster } from "@/lib/hooks";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import type { MemberType } from "@/lib/types";

type Filter = "all" | MemberType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "general", label: "일반원우" },
  { value: "youth", label: "대학생 원우" },
];

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  general: "일반원우",
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
      <PageHeader title="원우수첩" right={<ProfileAvatarButton />} />

      <div className="px-5">
        {/* 검색 */}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
          {/*
            글자 크기는 16px 그대로 두고 위아래 여백만 줄였습니다.
            16px보다 작게 하면 iOS에서 입력칸을 누를 때 화면이 확대됩니다.
          */}
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름·회사·직책으로 찾기"
            aria-label="원우 검색"
            className="w-full rounded-xl border border-transparent bg-white py-2.5 pr-4 pl-10 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        {/* 필터 칩 + 인원수 */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {FILTERS.map(({ value, label }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-white text-ink-muted shadow-[var(--shadow-card)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {!busy && !error ? (
            <p className="shrink-0 text-[13px] text-ink-faint">
              원우 <span className="font-bold text-ink-soft">{visible.length}</span>명
            </p>
          ) : null}
        </div>

        {/* 사용법 안내 */}
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
          사진을 누르면 크게 보이고, 이름을 누르면 회사·직책·휴대폰·자기소개를 볼 수 있어요.
          <span className="font-bold text-ink-muted"> 수정</span> 버튼으로 서로의 정보를
          채워줄 수 있고, 맨 아래 <span className="font-bold text-ink-muted">원우 추가하기</span>로
          수첩에 빠진 원우를 올릴 수 있습니다.
        </p>

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
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
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

          {/* 아직 가입하지 않은 원우 올리기 */}
          {!busy && !error ? (
            <button
              type="button"
              onClick={() => setEditing({ entry: null })}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-stone-300 py-2.5 text-[14px] font-bold text-ink-muted transition active:scale-[0.99]"
            >
              <PlusIcon className="h-4 w-4" />
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
    <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[var(--shadow-card)]">
      {/* 사진 · 영상 썸네일 */}
      <button
        type="button"
        onClick={videoLink?.id ? onOpenVideo : onEnlargePhoto}
        aria-label={
          videoLink?.id ? `${entry.name} 소개 영상 보기` : `${entry.name} 사진 크게 보기`
        }
        className="relative h-[62px] w-[86px] shrink-0 overflow-hidden rounded-2xl bg-canvas transition active:scale-95"
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
        <div className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-[15px] font-bold text-brand-700 tabular-nums">
            {number}.
          </span>
          <span className="truncate text-[17px] font-bold text-ink">{entry.name}</span>
          {entry.councilRole ? (
            <span className="shrink-0">
              <Badge>{entry.councilRole}</Badge>
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          {affiliation || entry.bio || "정보를 기다리는 중이에요"}
        </p>
      </button>

      {/* 원우 누구나 서로 채워줄 수 있어서, 내 칸이라고 달리 보이지 않습니다. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${entry.name} 정보 수정`}
        className="shrink-0 rounded-xl border border-stone-200 px-3 py-2 text-[13px] font-bold text-ink-muted transition active:scale-95"
      >
        ✎ 수정
      </button>
    </div>
  );
}

/** 원우 카드를 눌렀을 때 아래에서 올라오는 상세 시트 */
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

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} 상세 정보`}
      onClick={onClose}
    >
      <div
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-white px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
        onClick={(event) => event.stopPropagation()}
      >
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

        {/* 휴대폰 — 눌러서 바로 전화·문자 */}
        {entry.phone ? (
          <div className="mt-6 flex gap-3">
            <a
              href={`tel:${phoneHref(entry.phone)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]"
            >
              📞 전화
            </a>
            <a
              href={`sms:${phoneHref(entry.phone)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-50 py-3.5 text-[15px] font-bold text-brand-700 transition active:scale-[0.99]"
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
            className="mt-2 block text-center text-[13px] font-bold text-brand-700"
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
          className="mt-4 w-full rounded-2xl bg-brand-50 py-4 text-[15px] font-bold text-brand-700"
        >
          ✎ {isMe ? "내 정보 수정하기" : "정보 채워주기"}
        </button>

        {isMe ? (
          <Link
            href="/profile"
            className="mt-3 flex w-full items-center justify-center rounded-2xl bg-white py-4 text-[15px] font-bold text-ink-soft shadow-[var(--shadow-card)]"
          >
            사진·자기소개까지 고치기
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl bg-stone-100 py-4 text-[15px] font-bold text-ink-soft"
        >
          닫기
        </button>
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
