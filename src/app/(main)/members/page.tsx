"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PageHeader, { ProfileAvatarButton } from "@/components/PageHeader";
import { SearchIcon, UsersIcon } from "@/components/icons";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatBirthday, formatPhone, phoneHref } from "@/lib/format";
import { useApprovedMembers, useRoster } from "@/lib/hooks";
import { parseVideoLink, videoEmbedUrl, videoThumbnail } from "@/lib/video";
import type { MemberType, UserDoc } from "@/lib/types";

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

/** 카드에 "회사 · 직책" 한 줄로 합칩니다. 둘 다 비었으면 빈 문자열. */
function affiliationLine(member: UserDoc): string {
  return [member.company, member.position].filter(Boolean).join(" · ");
}

export default function MembersPage() {
  const { data: members, loading, error } = useApprovedMembers();
  const roster = useRoster();
  const { profile } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<UserDoc | null>(null);
  /** 사진만 크게 보기 (영상이 없는 원우의 사진을 눌렀을 때) */
  const [enlarged, setEnlarged] = useState<UserDoc | null>(null);
  /** 시트를 열자마자 영상을 재생할지 (영상 썸네일을 눌러 들어온 경우) */
  const [autoPlay, setAutoPlay] = useState(false);

  /**
   * 수첩 번호. 검색이나 필터를 걸어도 번호가 흔들리지 않도록
   * 전체 명단(이름 가나다순)에서의 자리를 그대로 씁니다.
   */
  const numberOf = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((member, index) => map.set(member.uid, index + 1));
    return map;
  }, [members]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return members.filter((member) => {
      if (filter !== "all" && member.memberType !== filter) return false;
      if (!needle) return true;
      // 이름·별칭뿐 아니라 회사·직책·직위로도 찾을 수 있게 합니다.
      return [
        member.name,
        member.nickname,
        member.company,
        member.position,
        member.councilRole,
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [members, keyword, filter]);

  /**
   * 운영진이 명단에 올려뒀지만 아직 가입하지 않은 원우들.
   * 이름만 흐리게 보여주어 "우리 기수 전체"가 한눈에 들어오게 합니다.
   */
  const notJoinedYet = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return roster.data.filter((entry) => {
      if (entry.linkedUid) return false;
      if (filter !== "all" && entry.memberType !== filter) return false;
      if (!needle) return true;
      return entry.name.toLowerCase().includes(needle);
    });
  }, [roster.data, keyword, filter]);

  function openMember(member: UserDoc, playVideo = false) {
    setAutoPlay(playVideo);
    setSelected(member);
  }

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
                  className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${
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
          {!loading && !error ? (
            <p className="shrink-0 text-[13px] text-ink-faint">
              원우 <span className="font-bold text-ink-soft">{visible.length}</span>명
            </p>
          ) : null}
        </div>

        {/* 사용법 안내 */}
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
          사진을 누르면 크게 보이고, 이름을 누르면 회사·직책·휴대폰·자기소개를 볼 수 있어요.
          내 정보는 카드의 <span className="font-bold text-ink-muted">수정</span> 버튼으로
          채우면 됩니다.
        </p>

        {/* 목록 */}
        <div className="mt-4 pb-6">
          {loading ? (
            <ul className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((key) => (
                <li key={key}>
                  <Skeleton className="h-[92px] rounded-3xl" />
                </li>
              ))}
            </ul>
          ) : error ? (
            <ErrorState message={error} />
          ) : visible.length === 0 && notJoinedYet.length === 0 ? (
            <div className="rounded-3xl bg-white shadow-[var(--shadow-card)]">
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title={
                  members.length === 0
                    ? "아직 등록된 원우가 없어요"
                    : "조건에 맞는 원우가 없어요"
                }
                description={
                  members.length === 0
                    ? "원우들이 가입하고 프로필을 채우면 여기에 보입니다."
                    : "검색어나 필터를 바꿔보세요."
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((member) => (
                <li key={member.uid}>
                  <MemberRow
                    member={member}
                    number={numberOf.get(member.uid) ?? 0}
                    isMe={profile?.uid === member.uid}
                    onOpen={() => openMember(member)}
                    onOpenVideo={() => openMember(member, true)}
                    onEnlargePhoto={() => setEnlarged(member)}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* 명단에는 있지만 아직 가입하지 않은 원우 */}
          {!loading && notJoinedYet.length > 0 ? (
            <section className="mt-8">
              <p className="mb-3 text-[13px] font-bold text-ink-faint">
                아직 가입 전 {notJoinedYet.length}명
              </p>
              <ul className="flex flex-col gap-2.5">
                {notJoinedYet.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-4 rounded-3xl bg-white/70 p-4"
                  >
                    <Avatar
                      name={entry.name}
                      seed={entry.id}
                      size={44}
                      className="opacity-40 grayscale"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink-muted">
                        {entry.name}
                      </p>
                      <p className="text-[12px] text-ink-faint">
                        {MEMBER_TYPE_LABEL[entry.memberType]} · 가입하면 자동으로 이어집니다
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {selected ? (
        <MemberDetailSheet
          member={selected}
          autoPlay={autoPlay}
          isMe={profile?.uid === selected.uid}
          onEnlargePhoto={() => setEnlarged(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {enlarged ? (
        <PhotoLightbox member={enlarged} onClose={() => setEnlarged(null)} />
      ) : null}
    </>
  );
}

/**
 * 수첩 한 줄.
 * 왼쪽 사진(또는 소개 영상 썸네일)과 오른쪽 이름 영역이 서로 다른 곳으로 가기 때문에
 * 버튼을 둘로 나눠 두었습니다. (버튼 안에 버튼을 넣을 수는 없습니다.)
 */
function MemberRow({
  member,
  number,
  isMe,
  onOpen,
  onOpenVideo,
  onEnlargePhoto,
}: {
  member: UserDoc;
  number: number;
  isMe: boolean;
  onOpen: () => void;
  onOpenVideo: () => void;
  onEnlargePhoto: () => void;
}) {
  const videoLink = parseVideoLink(member.introVideoUrl ?? "");
  const thumbnail = videoLink ? videoThumbnail(videoLink) : null;
  const affiliation = affiliationLine(member);
  const displayName = member.name || member.nickname;

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[var(--shadow-card)]">
      {/* 사진 · 영상 썸네일 */}
      <button
        type="button"
        onClick={videoLink?.id ? onOpenVideo : onEnlargePhoto}
        aria-label={
          videoLink?.id ? `${displayName} 소개 영상 보기` : `${displayName} 사진 크게 보기`
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
        ) : member.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoURL}
            alt={`${displayName} 프로필 사진`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Avatar name={displayName} seed={member.uid} size={46} />
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
          <span className="truncate text-[17px] font-bold text-ink">{displayName}</span>
          {member.councilRole ? (
            <span className="shrink-0">
              <Badge>{member.councilRole}</Badge>
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          {affiliation || member.bio || "정보를 기다리는 중이에요"}
        </p>
      </button>

      {/* 본인만 수정할 수 있습니다. */}
      {isMe ? (
        <Link
          href="/profile"
          className="shrink-0 rounded-xl border border-stone-200 px-3 py-2 text-[13px] font-bold text-ink-muted transition active:scale-95"
        >
          ✎ 수정
        </Link>
      ) : null}
    </div>
  );
}

/** 원우 카드를 눌렀을 때 아래에서 올라오는 상세 시트 */
function MemberDetailSheet({
  member,
  autoPlay,
  isMe,
  onEnlargePhoto,
  onClose,
}: {
  member: UserDoc;
  autoPlay: boolean;
  isMe: boolean;
  onEnlargePhoto: () => void;
  onClose: () => void;
}) {
  // 재생 버튼을 누르기 전에는 유튜브를 불러오지 않습니다.
  const [playing, setPlaying] = useState(autoPlay);
  const videoLink = parseVideoLink(member.introVideoUrl ?? "");
  const thumbnail = videoLink ? videoThumbnail(videoLink) : null;
  const affiliation = affiliationLine(member);
  const displayName = member.name || member.nickname;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} 상세 정보`}
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-[480px] rounded-t-[28px] bg-white px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={onEnlargePhoto}
            aria-label={`${displayName} 사진 크게 보기`}
            className="rounded-full transition active:scale-95"
          >
            <Avatar
              src={member.photoURL}
              name={displayName}
              seed={member.uid}
              size={104}
            />
          </button>
          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="text-[22px] font-bold text-ink">{displayName}</p>
            {member.councilRole ? <Badge>{member.councilRole}</Badge> : null}
          </div>
          {affiliation ? (
            <p className="mt-1 text-[15px] text-ink-muted">{affiliation}</p>
          ) : null}
          {member.nickname && member.nickname !== member.name ? (
            <p className="mt-1 text-[13px] text-ink-faint">별칭 · {member.nickname}</p>
          ) : null}
          <div className="mt-3">
            <Badge tone={member.memberType === "youth" ? "brand" : "neutral"}>
              {MEMBER_TYPE_LABEL[member.memberType]}
            </Badge>
          </div>
        </div>

        {/* 휴대폰 — 눌러서 바로 전화·문자 */}
        {member.phone ? (
          <div className="mt-6 flex gap-3">
            <a
              href={`tel:${phoneHref(member.phone)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]"
            >
              📞 전화
            </a>
            <a
              href={`sms:${phoneHref(member.phone)}`}
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
                title={`${displayName} 소개 영상`}
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

        <dl className="mt-6 flex flex-col gap-3 rounded-2xl bg-canvas p-5">
          {member.company ? (
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-[14px] text-ink-faint">회사·소속</dt>
              <dd className="text-right text-[15px] font-bold text-ink">{member.company}</dd>
            </div>
          ) : null}
          {member.position ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[14px] text-ink-faint">직책</dt>
              <dd className="text-[15px] font-bold text-ink">{member.position}</dd>
            </div>
          ) : null}
          {member.phone ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[14px] text-ink-faint">휴대폰</dt>
              <dd className="text-[15px] font-bold text-ink">{formatPhone(member.phone)}</dd>
            </div>
          ) : null}
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
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-[14px] text-ink-faint">한 줄 소개</dt>
            <dd className="text-right text-[15px] leading-relaxed text-ink">
              {member.bio || "아직 소개가 없어요"}
            </dd>
          </div>
        </dl>

        {/* 본인이 쓴 자기소개 전문 */}
        {member.introduction ? (
          <div className="mt-4 rounded-2xl bg-canvas p-5">
            <p className="mb-2 text-[14px] text-ink-faint">자기소개</p>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
              {member.introduction}
            </p>
          </div>
        ) : null}

        {isMe ? (
          <Link
            href="/profile"
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-brand-50 py-4 text-[15px] font-bold text-brand-700"
          >
            ✎ 내 정보 수정하기
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
function PhotoLightbox({ member, onClose }: { member: UserDoc; onClose: () => void }) {
  const displayName = member.name || member.nickname;

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
      aria-label={`${displayName} 사진 크게 보기`}
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
        {member.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoURL}
            alt={`${displayName} 프로필 사진`}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        ) : (
          <Avatar name={displayName} seed={member.uid} size={220} />
        )}
      </div>

      <div
        className="px-5 py-5 text-center"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <p className="text-[17px] font-bold text-white">{displayName}</p>
        {affiliationLine(member) ? (
          <p className="mt-1 text-[13px] text-white/60">{affiliationLine(member)}</p>
        ) : null}
      </div>
    </div>
  );
}
