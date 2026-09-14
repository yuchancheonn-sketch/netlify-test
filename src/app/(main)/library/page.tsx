"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PlusIcon } from "@/components/icons";
import {
  EmptyState,
  ErrorState,
  FieldError,
  FieldLabel,
  PrimaryButton,
  Skeleton,
  inputClassName,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { inCohort } from "@/lib/cohort";
import { useViewCohort } from "@/lib/use-view-cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import {
  fileThumbnailUrl,
  isCloudinaryConfigured,
  saveUrl,
  thumbnailUrl,
  uploadFile,
} from "@/lib/cloudinary";
import { dotDate, todayString } from "@/lib/format";
import { useAlbums, useFiles } from "@/lib/hooks";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/constants";
import type { FileDoc } from "@/lib/types";

/**
 * 자료 탭 — **원우가 직접 올리는 것**을 모읍니다.
 *
 *  - 행사 사진: 행사별 앨범으로 묶어서 (photoAlbums)
 *  - 파일: PDF·한글·엑셀 등을 최근 올린 순으로 (files)
 *
 * 도산아카데미가 만들어 내려주는 것(복습 영상·소식)은 소식 탭(/news)에 있습니다.
 * **받아오는 것과 올리는 것**을 탭으로 갈라 둔 것이 이 둘의 경계입니다.
 * (복습 영상은 예전에 이 탭에 있었지만 2026-09-09에 소식 탭으로 옮겼습니다.)
 */
const SUBTABS = [
  { value: "photos", label: "행사 사진" },
  { value: "files", label: "파일" },
] as const;

type Subtab = (typeof SUBTABS)[number]["value"];

export default function LibraryPage() {
  const [subtab, setSubtab] = useState<Subtab>("photos");
  /*
   * 자료도 기수마다 따로입니다. 원우는 자기 기수로 고정이고, 운영진만 제목 옆에서
   * 바꿔 봅니다. 앨범 목록과 파일 목록은 각자 같은 값(useViewCohort)을 읽습니다.
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
      <PageHeader
        title={
          canSwitch ? (
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
        right={<HeaderActions />}
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
        {subtab === "photos" ? <AlbumList /> : <FileList />}
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
          uploadedByName: profile?.name || profile?.nickname || "원우",
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
    /* 아래 진짜 목록과 같은 짜임 — 2열, 세로로 선 3:4 종이. */
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-[3/4] rounded-lg" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {!isCloudinaryConfigured ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📁</span>}
            title="자료 보관소 설정이 아직 안 되어 있어요"
            description="운영진이 Cloudinary 설정을 마치면 파일을 올릴 수 있습니다."
          />
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📁</span>}
            title="아직 올라온 파일이 없어요"
            description="아래 '파일 올리기'로 강의 자료나 문서를 나눠 보세요."
          />
        </div>
      ) : (
        /*
          2열 격자. 아이폰 파일 앱을 본떠 3열로 두었다가 같은 날 2열로
          바꿨습니다 — 3열은 한 칸이 110px밖에 안 되어 문서 첫 장이 너무 작게
          들어갑니다. 2열이면 165px쯤입니다. 행사 사진 앨범과도 열 수가 맞습니다.
          가로 12px·세로 20px로 다르게 둡니다 — 칸 아래에 글씨가 석 줄까지
          붙으므로, 세로를 가로만큼만 두면 윗칸 글씨와 아랫칸 그림이 붙어 보입니다.
        */
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
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
          className={`fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95 ${uploading ? "opacity-60" : ""}`}
        >
          {uploading ? (
            `올리는 중… ${Math.round(progress * 100)}%`
          ) : (
            <>
              <PlusIcon className="h-5 w-5" />
              파일 올리기
            </>
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
 * 파일 한 칸 — 미리보기 그림, 이름, 올린 사람·크기.
 *
 * **칸을 누르면 열어서 봅니다.** 내려받기는 오른쪽 위 ⋯ 단추 안에 있고,
 * 올린 본인과 운영진에게는 거기에 이름 바꾸기·지우기가 함께 붙습니다.
 * 행사 사진 앨범 칸과 같은 짜임새라 두 서브탭이 한 몸으로 읽힙니다.
 */
function FileCard({ file, canManage }: { file: FileDoc; canManage: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const thumbnail = fileThumbnailUrl(file.url);
  /*
    올린 날짜. 방금 올린 파일은 서버가 시각을 적기 전이라 uploadedAt이 잠깐
    비어 있습니다(serverTimestamp). 그때는 날짜 줄을 아예 그리지 않습니다 —
    "-" 같은 빈 표를 두면 한 칸만 높이가 달라져 격자가 어긋납니다.
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

  async function handleDelete() {
    setMenuOpen(false);
    if (deleting) return;
    if (!window.confirm(`"${file.name}"을 목록에서 지울까요?`)) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "files", file.id));
    } catch {
      setDeleting(false);
    }
  }

  return (
    <li className="relative">
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition active:scale-[0.97]"
      >
        {/*
          미리보기 — 세로로 선 종이 한 장 (2026-09-14, 아이폰 파일 앱을 본떴습니다).

          예전에는 가로 4:3 그림 + 글씨를 한 카드 안에 담았는데, 문서는 대부분
          세로라 가로 칸에 담으면 위아래가 비고 글씨가 작아져 무슨 문서인지
          알아보기 어려웠습니다. 3:4로 세우니 첫 장이 제 비례로 들어옵니다.

          카드(흰 상자)를 씌우지 않고 그림만 둡니다. 아래 글씨는 카드 밖에
          놓여, 종이 석 장이 늘어선 것처럼 보입니다.
        */}
        <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]">
          {thumbnail ? (
            /*
              문서는 c_fit으로 통째로 담아 왔으므로(lib/cloudinary.ts) 여기서도
              object-contain으로 둡니다. object-cover로 채우면 첫 장의 제목이
              잘려 나가 무슨 문서인지 알아볼 수 없습니다.
            */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={`${file.name} 미리보기`}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            /*
              그림을 만들 수 없는 파일(한글·엑셀·워드·압축)은 확장자를 크게 답니다.
              종류마다 아이콘을 그리지 않아도 무엇인지 한눈에 압니다.
            */
            <span className="text-[15px] font-bold tracking-wide text-brand-300 uppercase">
              {file.format ? file.format.slice(0, 5) : "파일"}
            </span>
          )}
        </div>

        {/*
          그림 아래 석 줄 — 이름 / 날짜 / 올린 사람·크기.
          가운데로 모읍니다. 왼쪽으로 붙이면 두 줄짜리 이름의 둘째 줄이
          짧게 끝나 칸마다 들쭉날쭉해 보입니다.

          이름은 두 줄까지 보이고 넘치면 "…"입니다(line-clamp-2). 파일 이름은
          길고 끝에 의미가 몰려 있는 일이 많아, 한 줄로 자르면 구별이 안 됩니다.
        */}
        <p className="mt-2 line-clamp-2 text-center text-[13px] leading-snug font-bold text-ink">
          {file.name}
        </p>
        {uploadedOn ? (
          <p className="mt-0.5 text-center text-[12px] text-ink-faint">{uploadedOn}</p>
        ) : null}
        <p className="truncate text-center text-[12px] text-ink-faint">
          {file.uploadedByName} · {formatBytes(file.bytes)}
        </p>
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
        className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/45 text-[15px]! leading-none font-bold text-white backdrop-blur-sm transition active:scale-95"
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
          <div className="absolute top-9 right-1.5 z-40 flex flex-col overflow-hidden rounded-xl bg-[#33383E] shadow-[var(--shadow-float)]">
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
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3.5 py-2 text-[13px]! font-bold whitespace-nowrap text-red-400 transition active:bg-[#40464D] disabled:opacity-50"
                >
                  지우기
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {renaming ? (
        <FileRenameSheet file={file} onClose={() => setRenaming(false)} />
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

/** 행사(앨범) 목록 */
function AlbumList() {
  const { data: allAlbums, loading, error } = useAlbums();
  /** 보고 있는 기수의 앨범만. 만들 때도 이 기수로 적습니다. */
  const { cohort } = useViewCohort();
  const albums = allAlbums.filter((album) => inCohort(album, cohort));
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <ul className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-square rounded-[20px]" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <>
      {albums.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<span className="text-[40px]">📸</span>}
            title="아직 앨범이 없어요"
            description="아래 '앨범 만들기'로 첫 행사 앨범을 만들어 보세요."
          />
        </div>
      ) : (
        /*
          앨범 칸 — 아이폰 사진 앱 "고정됨" 모음 모양 (2026-09-14, 사용자가 보여 준 화면을 따름).
          정사각형 칸을 대표 사진이 가득 채우고, 아래쪽만 어둡게 번지는 막 위에
          흰 굵은 제목을 왼쪽 아래에 얹습니다. 칸 아래에 따로 있던 흰 글씨 상자
          (제목 + 날짜 · N장)는 걷었습니다 — 그림에 제목 말고는 글이 없어서입니다.

          - aspect-square: 예전 4:3 → 정사각형. 그림의 칸이 정사각형입니다.
          - rounded-[20px]: 그림의 둥글기. 앱의 다른 카드(12~16px)보다 둥급니다.
          - shadow-card-glow: 헤어라인 없는 옅은 그림자만. 사진이 칸 끝까지 차므로
            회색 테두리를 두르면 사진 가장자리에 선이 낍니다.
          - 제목은 **자르지 않습니다** (2026-09-14 사용자 요청). 처음엔 17px 한 줄 + 말줄임(…)이었는데
            긴 행사 이름이 잘려서, 15px로 줄이고 필요한 만큼 여러 줄로 접습니다(보통 두 줄 안).
            break-keep으로 낱말 중간에서 끊지 않고, 낱말 하나가 칸보다 길 때만 글자 사이에서 넘깁니다.
            줄 수를 묶는 line-clamp는 일부러 안 겁니다 — 걸면 세 줄째부터 다시 잘립니다.
            제목은 bottom-3에 붙어 있어 줄이 늘면 위로 자랍니다.
          - 어두운 막: 아래에서 위로 60% 높이까지 검정 60% → 0. 제목이 두세 줄로 위로
            자라도 흰 글씨 뒤가 어둡도록 처음(45%·55%)보다 넓고 조금 짙게 했습니다.
            사진 윗부분은 어둡게 하지 않습니다.
          - 대표 사진이 없는 앨범은 그림의 "최근 삭제된 항목"처럼 위는 옅고 아래로
            짙어지는 회색 칸에 📷을 가운데 둡니다. 흰 제목이 앉을 아래쪽이 짙어야 해서
            단색 fill이 아니라 흐름(gradient)입니다.
        */
        <ul className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/albums/${album.id}`}
                className="relative block aspect-square overflow-hidden rounded-[20px] bg-[linear-gradient(to_bottom,#e7e5e4,#a8a29e)] shadow-[var(--shadow-card-glow)] transition active:scale-[0.98]"
              >
                {album.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl(album.coverImageUrl, 500)}
                    alt={`${album.title} 대표 사진`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-[36px]"
                    aria-hidden="true"
                  >
                    📷
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),rgba(0,0,0,0)_60%)]"
                />
                <p className="absolute right-3 bottom-3 left-3.5 text-[15px] leading-snug font-bold break-keep text-white [overflow-wrap:anywhere]">
                  {album.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/*
        앨범 만들기 — 위 파일 칸의 "파일 올리기"와 같은 자리·같은
        모양의 떠 있는 주황 알약입니다 (2026-09-14). 두 칸은 한 번에 하나만
        보이므로 알약끼리 겹칠 일은 없습니다.

        원우 누구나 봅니다 (2026-09-14, 예전엔 운영진만). 보안 규칙도 원래
        photoAlbums 쓰기를 원우 누구에게나 열어 두었습니다. 새 앨범은 보고 있는
        기수로 적히고, 원우는 자기 기수로 고정이라 늘 자기 기수에 만들어집니다.
      */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95"
      >
        <PlusIcon className="h-5 w-5" />
        앨범 만들기
      </button>

      {creating ? <AlbumCreateSheet onClose={() => setCreating(false)} /> : null}
    </>
  );
}

/** 새 행사 앨범을 만드는 바텀시트 */
function AlbumCreateSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  /** 새 앨범이 올라갈 기수 — 운영진이 자료 화면에서 고른 기수입니다. */
  const { cohort } = useViewCohort();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayString());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    if (!title.trim()) {
      setError("행사 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    // 응답을 잠깐만 기다리고 창을 닫습니다 — 이유는 lib/firestore-commit.ts에.
    try {
      await commitWrite(
        addDoc(collection(db, "photoAlbums"), {
          title: title.trim(),
          eventDate,
          coverImageUrl: null,
          photoCount: 0,
          cohort,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        }),
      );
      onClose();
    } catch (caught) {
      setError(
        saveErrorMessage(caught, "앨범을 만들지 못했어요."),
      );
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="새 앨범 만들기"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[16px] bg-canvas px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] sm:rounded-[16px] sm:pb-7"
      >
        <h2 className="mb-6 text-[20px] font-bold text-ink">새 앨범 만들기</h2>

        <div className="mb-5">
          <FieldLabel htmlFor="album-title">행사 이름</FieldLabel>
          <input
            id="album-title"
            value={title}
            onChange={(changed) => {
              setTitle(changed.target.value);
              setError(null);
            }}
            placeholder="예) 10기 수료식"
            className={inputClassName}
          />
        </div>

        <div className="mb-6">
          <FieldLabel htmlFor="album-date">행사 날짜</FieldLabel>
          <input
            id="album-date"
            type="date"
            value={eventDate}
            onChange={(changed) => setEventDate(changed.target.value)}
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
            만들기
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
