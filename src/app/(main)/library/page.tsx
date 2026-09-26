"use client";

import { LoginRequired, useIsGuest, useRequireLogin } from "@/components/LoginRequired";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import NewsList from "@/components/NewsList";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import CohortPicker from "@/components/CohortPicker";
import PageHeader, { HeaderActions } from "@/components/PageHeader";
import TextTabs from "@/components/TextTabs";
import VideoList from "@/components/VideoList";
import { PlusIcon } from "@/components/icons";
import {
  EmptyState,
  ErrorState,
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  Spinner,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { useViewCohort } from "@/lib/use-view-cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { isCloudinaryConfigured, saveUrl, uploadFile } from "@/lib/cloudinary";
import { dotDate } from "@/lib/format";
import { useFiles } from "@/lib/hooks";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/constants";
import type { FileDoc } from "@/lib/types";

/**
 * 자료 탭 — 복습 영상 · 소식 · 파일.
 *
 *  - 복습 영상: 도산아카데미 유튜브 채널(@dosanacademy) — components/VideoList.tsx
 *  - 소식: 도산아카데미 사이트(dosan21.kr) RSS와 자동으로 이어진 글 — components/NewsList.tsx
 *    (2026-09-22 사용자 요청으로 소식 탭에서 옮겨 옴. 도산아카데미가 내려주는 복습 영상 옆에 둡니다.)
 *  - 파일: 원우가 올리는 PDF·한글·엑셀 등을 최근 올린 순으로 (files)
 *
 * 주소가 /library?tab=news 면 소식 칸을 먼저 엽니다 — 새 소식 알림(lib/feed-watch.ts)이 이 주소로 엽니다.
 * 그 밖에는 복습 영상 칸이 먼저 열립니다(새 영상 알림은 그냥 /library).
 *
 * ★ 2026-09-22 사용자 요청으로 소식 탭의 "복습 영상"과 이 탭의 "행사 사진"을 맞바꿨습니다.
 *   행사 사진(앨범)은 이제 소식 탭(/news)에 있습니다 — components/AlbumList.tsx.
 *   예전엔 "받아오는 것(소식 탭) / 원우가 올리는 것(자료 탭)"으로 갈라 두었는데 그 경계는 이제 없습니다.
 *   (복습 영상은 2026-09-09까지도 이 탭에 있었습니다 — 되돌아온 셈입니다.)
 */
const SUBTABS = [
  { value: "videos", label: "복습 영상" },
  // 칸 이름 "소식" → "일정" (2026-09-23 사용자 요청). 주소(?tab=news)와 내용(도산아카데미 글 목록)은 그대로입니다.
  { value: "news", label: "일정" },
  { value: "files", label: "파일" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function LibraryPage() {
  /*
    주소의 ?tab을 읽는 useSearchParams는 정적 화면에서 Suspense로 감싸야 빌드가 됩니다(Next 문서).
    제목 자리의 고르개가 그 값을 쓰므로 제목 줄까지 안에 두고, 기다리는 동안은 같은 모양의 머리를 그립니다
    (소식 탭에 있을 때 NewsFallback과 같은 방식 — 제목 자리 회색 칸 28px은 TextTabs "header" 글줄 높이).
  */
  return (
    <Suspense
      fallback={
        <>
          {/* 기다리는 동안도 흰 바탕 — 아래 LibraryTabs와 같게. */}
          <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
          <PageHeader
            tone="surface"
            title={<Skeleton className="h-[28px] w-[200px] rounded-lg" />}
            right={<HeaderActions tone="surface" />}
          />
          <div className="px-4 pt-4 pb-24">
            <Skeleton className="aspect-video rounded-2xl" />
          </div>
        </>
      }
    >
      <LibraryTabs />
    </Suspense>
  );
}

function LibraryTabs() {
  const searchParams = useSearchParams();
  // ?tab=files는 파일 칸의 로그인 안내에서 로그인한 뒤 돌아올 때 씁니다 (2026-09-25).
  const [subtab, setSubtab] = useState<Subtab>(() => {
    const tab = searchParams.get("tab");
    return tab === "news" || tab === "files" ? tab : "videos";
  });
  const isGuest = useIsGuest();
  /*
   * 파일은 기수마다 따로입니다. 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서
   * 바꿔 봅니다(파일 목록이 같은 값 useViewCohort를 읽습니다). 복습 영상은 모든 기수가 같습니다.
   */
  const { cohort, canSwitch, setCohort } = useViewCohort();

  return (
    <>
      {/*
        제목 자리에 고르개를 넣습니다 (2026-09-14, 소식 탭과 같은 방식).
        예전에는 제목이 "자료"이고 본문 맨 위에 고르개가 따로 한 줄 서 있었습니다.
        공용 TextTabs의 variant="header"가 글씨를 22px로 키워 다른 화면의 제목과
        같은 크기·같은 자리(화면 끝에서 16px)에 세웁니다.

        ★ 기수 고르개(운영진만 보임)는 그대로 옆에 답니다.
          "자료"가 있던 자리를 고르개가 대신하는 것이지, 기수를 바꾸는 길이
          없어지면 안 됩니다. min-w-0은 폭이 모자랄 때 탭 쪽이 먼저 줄어들며
          가로로 밀리게 하려는 것입니다 — 없으면 기수 고르개가 밀려 잘립니다.
      */}
      {/*
        바탕 흰색 (2026-09-27 사용자 "자료탭 배경색도 흰색으로") — 채팅 탭과 같은 방법.
        화면 전체에 붙인 흰 층(-z-10)을 목록 뒤에 깝니다. 상자에 bg-surface를 주면 MainShell의 <main>이
        높이를 정해 두지 않아 목록이 짧을 때 아래로 회색이 드러납니다(chat/page.tsx 주석).
        제목 줄도 tone="surface"로 맞춥니다.
      */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-surface" />
      <PageHeader
        tone="surface"
        title={
          // 복습 영상·소식은 모든 기수가 같아 기수 고르개는 파일 칸에서만 답니다(2026-09-22).
          canSwitch && subtab === "files" ? (
            <span className="flex min-w-0 items-center gap-2">
              <TextTabs
                variant="header"
                items={SUBTABS}
                value={subtab}
                onChange={setSubtab}
                className="min-w-0"
              />
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            <TextTabs variant="header" items={SUBTABS} value={subtab} onChange={setSubtab} />
          )
        }
        right={<HeaderActions tone="surface" />}
      />

      {/*
        pt-4 — 첫 줄과 제목 줄 사이 16px. 제목 줄의 pb(6px)에 더해 22px입니다.
        홈·원우수첩·소식과 같은 값이라 네 탭의 첫 칸이 같은 높이에서 시작합니다.

        ★ 이 여백을 PageHeader의 pb로 주지 않는 이유
          제목 줄은 붙박이라 그 pb만큼의 본문이 스크롤할 때 제목 아래에 숨습니다.
          여기에 주면 본문과 함께 굴러가므로 아무것도 가리지 않습니다.
      */}
      {/*
        pb-24 — 떠 있는 주황 알약이 마지막 줄을 가리지 않게 밑을 비우는 값입니다.
        알약은 바닥에서 92px 위에 서고 높이가 52px라 바닥 144px까지 가리는데,
        MainShell이 이미 78px을 비워 두므로 96px을 더해 174px를 확보합니다.
        (앨범 화면·모임 탭은 pb-8·pb-6이라 마지막 줄이 알약에 조금 가려 있습니다 —
         거기도 고칠 일이 생기면 같은 셈법을 쓰면 됩니다.)
      */}
      <div className="px-4 pt-4 pb-24">
        {subtab === "videos" ? (
          <VideoList />
        ) : subtab === "news" ? (
          <NewsList />
        ) : isGuest ? (
          /*
            파일 칸은 로그인해야 봅니다 (2026-09-25 사용자 요청). 원우들이 올린 자료라 목록도 원우에게만 —
            firestore.rules의 files 읽기도 원우만입니다. 로그인하면 이 파일 칸으로 돌아옵니다.
          */
          <LoginRequired returnPath="/library?tab=files" />
        ) : (
          <FileList />
        )}
      </div>
    </>
  );
}

/** 파일 크기를 사람이 읽는 단위로. 1KB 미만은 "1KB"로 올려 적습니다. */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/**
 * 원우가 올린 문서 파일 목록 (PDF·한글·엑셀 등).
 *
 * 사진과 달리 앨범으로 묶지 않고 최근 올린 것부터 한 줄씩 늘어놓습니다.
 * 실물은 Cloudinary에 있고 Firestore에는 주소만 담습니다 — 사진과 같은 구조입니다.
 *
 * ★ 지우면 목록에서만 사라지고 Cloudinary의 실물은 남습니다.
 *   지우려면 서명이 필요한데 그 비밀 키를 브라우저에 둘 수는 없습니다.
 *   무료 보관 용량이 25GB라 한동안은 문제가 되지 않지만, 언젠가 콘솔에서
 *   한 번 정리해야 합니다. (행사 사진도 똑같습니다.)
 */
function FileList() {
  const { user, profile, isAdmin } = useAuth();
  const { data: allFiles, loading, error } = useFiles();
  /** 보고 있는 기수의 파일만. 올릴 때도 이 기수로 적습니다. */
  const { cohort } = useViewCohort();
  const files = allFiles.filter((file) => inCohort(file, cohort));
  const [uploading, setUploading] = useState(false);
  /** 0~1. 여러 개를 올릴 때는 지금 올리는 한 개의 진행률입니다. */
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const requireLogin = useRequireLogin();

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    /*
     * 같은 파일을 다시 고를 수 있도록 입력칸을 비웁니다.
     * 안 비우면 값이 그대로라 change가 안 일어나서, 올리다 실패한 파일을
     * 다시 고르는 것이 먹히지 않습니다.
     */
    event.target.value = "";
    if (picked.length === 0 || !user || uploading) return;

    const tooBig = picked.find((file) => file.size > MAX_UPLOAD_FILE_BYTES);
    if (tooBig) {
      setUploadError(
        `"${tooBig.name}"이 너무 커요. 한 개에 ${formatBytes(MAX_UPLOAD_FILE_BYTES)}까지 올릴 수 있어요.`,
      );
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      for (const file of picked) {
        setProgress(0);
        const uploaded = await uploadFile(file, setProgress);
        await addDoc(collection(db, "files"), {
          name: file.name,
          url: uploaded.url,
          publicId: uploaded.publicId,
          format: uploaded.format,
          bytes: uploaded.bytes,
          cohort,
          uploadedBy: user.uid,
          uploadedByName: profile?.name || "원우",
          uploadedAt: serverTimestamp(),
        });
      }
    } catch (caught) {
      setUploadError(
        caught instanceof Error ? caught.message : "파일을 올리지 못했어요.",
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  if (loading) {
    /* 아래 진짜 목록과 같은 짜임 — 박스 없는 줄: 확장자 칸 44px + 이름·정보 두 줄. */
    return (
      <ul className="flex flex-col">
        {[0, 1, 2, 3].map((key) => (
          <li key={key} className="flex items-center gap-[13px] py-[9px]">
            <Skeleton className="h-[48px] w-[48px] shrink-0 rounded-[17.5px]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="mt-2 h-3 w-28 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {/* 빈 안내도 박스 없이 흰 바탕에 그대로 (2026-09-27, 목록을 박스 없이 바꾸며 맞춤). */}
      {!isCloudinaryConfigured ? (
        <EmptyState
          icon={<span className="text-[40px]">📁</span>}
          title="자료 보관소 설정이 아직 안 되어 있어요"
          description="운영진이 Cloudinary 설정을 마치면 파일을 올릴 수 있습니다."
        />
      ) : files.length === 0 ? (
        <EmptyState
          icon={<span className="text-[40px]">📁</span>}
          title="아직 올라온 파일이 없어요"
          description="아래 '파일 올리기'로 강의 자료나 문서를 나눠 보세요."
        />
      ) : (
        /*
          1열 목록 — 채팅 목록처럼 박스 없이 흰 바탕에 줄만 (2026-09-27 사용자 요청).
          -mx-4로 바깥 px-4를 걷고 줄마다 px-4를 두어, 누를 때 옅은 회색이 화면 끝에서 끝까지 깔립니다.
          지나온 모양: 첫 장 썸네일 2열 격자 → 흰 박스 한 줄(2026-09-22, 박스 사이 12px) → 박스 없는 줄.
        */
        <ul className="-mx-4 flex flex-col">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              canManage={file.uploadedBy === user?.uid || isAdmin}
            />
          ))}
        </ul>
      )}

      {/*
        파일 올리기 — 오른쪽 아래에 떠 있는 주황 알약 (2026-09-14).
        예전에는 목록 끝에 폭을 꿉 채우는 흰 칸이었는데, 파일이 많아지면
        끝까지 내려야 보였습니다. 앨범 화면·모임 탭이 쓰는 것과 같은 값입니다.
        bottom의 92px는 하단 탭 알약 위로 올리는 높이입니다.

        올리기는 원우 누구나. 사진 앨범 만들기와 달리 운영진만이 아닙니다.

        <button>이 아니라 <label>인 이유: 안의 숨긴 <input type="file">을
        누르게 하는 것이 label입니다. 올리는 동안은 input을 disabled로
        막아, 다시 눌러도 고르기 창이 뜨지 않습니다.

        예전에 단추 밑에 있던 "한 개에 10MB까지"는 떠 있는 알약에는 붙일
        자리가 없어 부렸습니다. 너무 큰 파일을 고르면 아래 오류 문구가
        크기를 짚어 알려 줍니다.
      */}
      {isCloudinaryConfigured ? (
        <label
          // 둘러보는 사람이 누르면 파일 고르기 창 대신 로그인 안내 (2026-09-24).
          onClick={(event) => {
            if (requireLogin()) event.preventDefault();
          }}
          /*
            "+"만 있는 주황 동그라미 56px (2026-09-27 사용자 요청 — "파일 올리기" 글씨를 빼고).
            글씨가 없으니 aria-label로 무엇인지 알립니다. 올리는 동안은 동그라미 안에 진행률(%)만 작게.
          */
          aria-label="파일 올리기"
          className={`fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[var(--shadow-float)] transition active:scale-95 ${uploading ? "opacity-60" : ""}`}
        >
          {uploading ? (
            <span className="text-[13px] font-bold tabular-nums">{Math.round(progress * 100)}%</span>
          ) : (
            <PlusIcon className="h-7 w-7" />
          )}
          <input
            type="file"
            multiple
            disabled={uploading}
            onChange={handlePick}
            className="hidden"
          />
        </label>
      ) : null}

      {uploadError ? (
        <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
          {uploadError}
        </p>
      ) : null}
    </>
  );
}

/**
 * 파일 한 줄 — 확장자 칸, 이름, 올린 사람·크기·날짜.
 *
 * **박스를 누르면 열어서 봅니다.** 내려받기는 오른쪽 ⋯ 단추 안에 있고,
 * 올린 본인과 운영진에게는 거기에 이름 바꾸기·지우기가 함께 붙습니다.
 */
function FileCard({ file, canManage }: { file: FileDoc; canManage: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /*
    올린 날짜. 방금 올린 파일은 서버가 시각을 적기 전이라 uploadedAt이 잠깐
    비어 있습니다(serverTimestamp). 그때는 날짜를 빼고 적습니다.
  */
  const uploadedOn = file.uploadedAt ? dotDate(file.uploadedAt.toDate()) : "";

  /*
   * ★ 칸을 누르면 **어떤 파일이든** 원본 주소를 그대로 엽니다 — fl_attachment를 붙이면 안 됩니다.
   *
   *   그 주소는 Content-Disposition: attachment를 달고 내려옵니다. 아이폰은
   *   앱 안에서 열린 브라우저에서 첨부 파일을 그리지 못해 **흰 화면만** 뜹니다.
   *   2026-09-09에 PDF에서 겪고 PDF·사진만 원본 주소로 바꿨는데, 워드·한글·엑셀은 여전히
   *   첨부 주소라 2026-09-11에 같은 흰 화면이 떴습니다. 이제 모두 원본 주소입니다.
   *   아이폰은 워드·엑셀·PDF를 미리보기로 열어 주고, 안드로이드·컴퓨터는 못 그리는 파일을 알아서 내려받습니다.
   */
  const openUrl = file.url;

  /** ⋯ → "받기". 누르는 순간 기기를 보고 주소를 고릅니다(아이폰은 원본, 그 밖은 곧바로 내려받기 — lib/cloudinary.ts). */
  function handleSave(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setMenuOpen(false);
    window.open(saveUrl(file.url), "_blank", "noopener,noreferrer");
  }

  /**
   * "삭제"를 누르면 앱 안의 확인 창("진짜 삭제하시겠어요?")을 먼저 띄웁니다 (2026-09-27 사용자 요청).
   * 예전엔 브라우저 기본 확인 창(window.confirm)이었는데, 아이폰 홈 화면 앱에서는 주소가 찍힌 투박한 창이 뜹니다.
   */
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, "files", file.id));
      // 지워지면 이 줄째 목록에서 사라지므로 창을 따로 닫지 않아도 됩니다.
    } catch {
      setDeleting(false);
      setDeleteError("삭제하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <li className="relative">
      {/*
        한 줄 — 박스 없이 채팅 목록과 같은 결 (2026-09-27 사용자 요청; 그 전엔 흰 박스 rounded-3xl p-3.5 shadow-card).
        왼쪽 확장자 칸 / 가운데 이름·정보 / 오른쪽 ⋯ 자리(pr-14, 단추는 아래에서 위에 얹습니다).
        좌우 16px(화면 끝에서)·위아래 9px — 채팅 목록 줄과 같은 값. 누르면 줄 전체가 옅은 회색.
        ★ 확장자 칸·글씨를 같은 비율로 1.1배 (2026-09-27 사용자 — 1.18배로 키웠다가 "너무 커졌다, 1.1배로"):
          칸 44 → 48px(모서리 16 → 17.5px), 확장자 11 → 12px, 이름 15 → 16.5px, 아래 줄 12 → 13px, 사이 12 → 13px.
      */}
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-[13px] py-[9px] pr-14 pl-4 transition-colors active:bg-fill"
      >
        {/* 확장자 칸 — 알림 목록의 아이콘 칸과 같은 크기·색(연한 회색 바탕, 진한 회색 글씨). */}
        <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[17.5px] bg-fill text-[12px] font-bold tracking-wide text-ink-soft uppercase">
          {file.format ? file.format.slice(0, 4) : "파일"}
        </span>

        {/*
          이름은 두 줄까지 보이고 넘치면 "…"입니다(line-clamp-2). 파일 이름은
          길고 끝에 의미가 몰려 있는 일이 많아, 한 줄로 자르면 구별이 안 됩니다.
          아래 한 줄은 올린 사람 · 크기 · 날짜. 방금 올려 날짜가 아직 없으면 날짜만 뺍니다.
        */}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[16.5px] leading-snug font-bold break-all text-ink">
            {file.name}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-faint">
            {file.uploadedByName} · {formatBytes(file.bytes)}
            {uploadedOn ? ` · ${uploadedOn}` : ""}
          </span>
        </span>
      </a>

      {/*
        ⋯ 단추는 **모두에게** 보입니다. 안에 "받기"가 들어 있기 때문입니다.
        칸을 누르는 것은 "열어 보기"이고, 내려받기는 따로 고르는 일입니다 —
        둘을 한 동작에 묶었더니 아이폰에서 흰 화면이 떴습니다(위 openUrl 설명).
        이름 바꾸기·지우기는 올린 본인과 운영진에게만 덧붙습니다.
      */}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={`${file.name} 더보기`}
        className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[17px]! leading-none font-bold text-ink-muted transition active:bg-fill"
      >
        ⋯
      </button>

      {menuOpen ? (
        <>
          {/* 밖을 누르면 닫힙니다. */}
          <span
            aria-hidden="true"
            className="fixed inset-0 z-30"
            onPointerDown={() => setMenuOpen(false)}
          />
          {/*
            채팅 말풍선의 수정·삭제 박스와 같은 모양입니다.
            앱 안에서 "이 하나에 대해 뭘 할지" 고르는 자리는 늘 이 생김새입니다.
          */}
          {/* 박스 세로 가운데의 ⋯ 바로 아래(50% + 단추 반 높이 18px + 4px)에 펼칩니다. */}
          <div className="absolute top-[calc(50%+22px)] right-3 z-40 flex flex-col overflow-hidden rounded-xl bg-[#33383E] shadow-[var(--shadow-float)]">
            {/*
              받기 — 안드로이드·컴퓨터는 fl_attachment 주소로 곧바로 파일 저장, 아이폰은 원본 주소를 열어
              공유 단추로 "파일에 저장"(첨부 주소는 아이폰에서 흰 화면). 주소는 누르는 순간 handleSave가 고릅니다.
              href는 원본 주소로 두어, 길게 눌러 여는 경우에도 흰 화면이 뜨지 않게 합니다.
            */}
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSave}
              className="px-3.5 py-2 text-[13px] font-bold whitespace-nowrap text-white transition active:bg-[#40464D]"
            >
              받기
            </a>

            {canManage ? (
              <>
                <span className="h-px bg-white/15" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenaming(true);
                  }}
                  className="px-3.5 py-2 text-[13px]! font-bold whitespace-nowrap text-white transition active:bg-[#40464D]"
                >
                  이름 바꾸기
                </button>
                <span className="h-px bg-white/15" aria-hidden="true" />
                {/* "지우기" → "삭제" (2026-09-27 사용자 요청). 누르면 아래 확인 창이 뜹니다. */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteError(null);
                    setConfirmingDelete(true);
                  }}
                  disabled={deleting}
                  className="px-3.5 py-2 text-[13px]! font-bold whitespace-nowrap text-red-400 transition active:bg-[#40464D] disabled:opacity-50"
                >
                  삭제
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {renaming ? (
        <FileRenameSheet file={file} onClose={() => setRenaming(false)} />
      ) : null}

      {/*
        삭제 확인 창 — 화면 가운데 흰 상자. 바깥(어두운 막)을 누르거나 "취소"면 닫힙니다.
        bg-ink/40 막은 globals.css가 맨 위 시계 줄 색까지 맞춰 줍니다(확인 창 공용 처리).
      */}
      {confirmingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-8"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${file.id}`}
          onClick={() => {
            if (!deleting) setConfirmingDelete(false);
          }}
        >
          <div
            className="w-full max-w-[320px] rounded-3xl bg-surface px-5 pt-6 pb-4 text-center shadow-[var(--shadow-float)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p id={`delete-title-${file.id}`} className="text-[17px] font-bold text-ink">
              진짜 삭제하시겠어요?
            </p>
            <p className="mt-2 text-[14px] leading-relaxed break-all text-ink-muted">
              &lsquo;{file.name}&rsquo;이(가) 자료 목록에서 사라져요.
            </p>
            {deleteError ? (
              <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-fill py-3 text-[15px]! font-bold text-ink-soft transition active:scale-[0.98] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center rounded-2xl bg-danger py-3 text-[15px]! font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {deleting ? <Spinner className="h-5 w-5" /> : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * 파일 이름을 바꾸는 바텀시트.
 *
 * 바꾸는 것은 **화면에 보이는 이름뿐**입니다. Cloudinary에 올라간 실물의
 * 이름은 그대로입니다 — 그걸 바꾸려면 서명이 필요한데 그 비밀 키를 브라우저에
 * 둘 수 없습니다. 내려받으면 원래 올린 이름으로 저장되는 이유입니다.
 */
function FileRenameSheet({ file, onClose }: { file: FileDoc; onClose: () => void }) {
  const [name, setName] = useState(file.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (trimmed === file.name) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await commitWrite(updateDoc(doc(db, "files", file.id), { name: trimmed }));
      onClose();
    } catch (caught) {
      setError(saveErrorMessage(caught, "이름을 바꾸지 못했어요."));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="파일 이름 바꾸기"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">파일 이름 바꾸기</h2>

        <div className="mb-6">
          <FieldLabel htmlFor="file-name">이름</FieldLabel>
          <input
            id="file-name"
            value={name}
            onChange={(changed) => {
              setName(changed.target.value);
              setError(null);
            }}
            placeholder="예) 3회차 강의자료"
            className={inputClassName}
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            /*
              shrink-0과 whitespace-nowrap이 꼭 필요합니다.
              옆의 PrimaryButton이 w-full이라 자리를 통째로 요구해서, 이 단추가
              0에 가깝게 눌리며 "취소"가 세로로 접혔습니다.
            */
            className="shrink-0 rounded-2xl bg-fill px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ink-muted"
          >
            취소
          </button>
          {/* sm — 다른 단추와 한 줄에 서는 크기입니다 (ui.tsx의 size 설명 참고). */}
          <PrimaryButton type="submit" loading={saving} size="sm">
            저장
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
