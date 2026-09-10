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
  downloadUrl,
  fileThumbnailUrl,
  isCloudinaryConfigured,
  thumbnailUrl,
  uploadFile,
} from "@/lib/cloudinary";
import { formatDotDate, todayString } from "@/lib/format";
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
      <PageHeader
        title={
          canSwitch ? (
            <span className="flex items-center gap-2">
              자료
              <CohortPicker value={cohort} onChange={setCohort} />
            </span>
          ) : (
            "자료"
          )
        }
        right={<HeaderActions />}
      />

      <div className="px-4 pb-8">
        {/* 끝만 둥근 상자 고르개 — 모서리 값의 이유는 원우수첩 필터의 설명에. */}
        <div className="flex rounded-xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {SUBTABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtab(value)}
              aria-pressed={subtab === value}
              /*
                위 4px(pt-1) + 아래 8px(pb-2).
                두 값의 합(12px)이 py-1.5(6+6)와 같아서 칸 높이는 그대로이고,
                두 값의 차(4px) 때문에 글씨만 2px 위에 앉습니다.
                원우수첩의 서브탭과 같은 방식입니다.
              */
              className={`flex-1 rounded-lg pt-1 pb-2 text-[14px] font-bold transition ${
                subtab === value ? "bg-brand-500 text-white" : "text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {subtab === "photos" ? <AlbumList /> : <FileList />}
        </div>
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
    // 행사 사진 앨범과 같은 2열 자리표시입니다.
    return (
      <ul className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Skeleton className="aspect-[4/3] rounded-2xl" />
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
        /* 행사 사진 앨범과 같은 2열 격자 */
        <ul className="grid grid-cols-2 gap-3">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              canManage={file.uploadedBy === user?.uid || isAdmin}
            />
          ))}
        </ul>
      )}

      {/* 파일 올리기는 원우 누구나. 사진 앨범 만들기와 달리 운영진만이 아닙니다. */}
      {isCloudinaryConfigured ? (
        <>
          <label
            className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 text-[15px] font-bold shadow-[var(--shadow-card)] transition active:scale-[0.99] ${
              uploading ? "text-ink-faint" : "text-brand-500"
            }`}
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

          <p className="mt-2 text-center text-[12px] text-ink-faint">
            한 개에 {formatBytes(MAX_UPLOAD_FILE_BYTES)}까지
          </p>
        </>
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
   * 브라우저가 그대로 열어 보여줄 수 있는 파일인지 (PDF·사진).
   *
   * 미리보기 그림을 만들 수 있다는 것은 Cloudinary가 image로 담았다는 뜻이고,
   * 그런 파일은 주소를 그냥 열면 화면에 그려집니다. 한글·엑셀 같은 raw 파일은
   * 열어봐야 볼 것이 없으므로 곧바로 내려받게 합니다.
   */
  const viewable = thumbnail !== null;

  /*
   * ★ 누르면 가는 곳에 fl_attachment를 붙이면 안 됩니다.
   *
   *   그 주소는 Content-Disposition: attachment를 달고 내려옵니다. 아이폰은
   *   앱 안에서 열린 브라우저에서 첨부 파일을 그리지 못해 **흰 화면만** 뜹니다.
   *   (2026-09-09에 실제로 그랬습니다.) 썸네일을 누르는 사람은 내려받으려는
   *   것이 아니라 보려는 것이므로, 볼 수 있는 파일은 그냥 주소로 엽니다.
   */
  const openUrl = viewable ? file.url : downloadUrl(file.url);

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
        className="block overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)] transition active:scale-[0.98]"
      >
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-canvas">
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

        <div className="px-3 py-2.5">
          <p className="line-clamp-2 text-[14px] leading-snug font-bold text-ink">
            {file.name}
          </p>
          <p className="mt-1 truncate text-[12px] text-ink-faint">
            {file.uploadedByName} · {formatBytes(file.bytes)}
          </p>
        </div>
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
              여기는 fl_attachment가 붙은 주소가 맞습니다. 내려받겠다고 고른
              것이니, 브라우저가 열어 보이지 말고 파일로 저장해야 합니다.
            */}
            <a
              href={downloadUrl(file.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
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
  const { isAdmin } = useAuth();
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
            <Skeleton className="aspect-[4/3] rounded-2xl" />
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
            description={
              isAdmin
                ? "아래 '앨범 만들기'로 첫 행사 앨범을 만들어 보세요."
                : "운영진이 행사 앨범을 만들면 여기에 표시됩니다."
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/albums/${album.id}`}
                className="block overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)] transition active:scale-[0.98]"
              >
                <div className="aspect-[4/3] w-full bg-brand-50">
                  {album.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl(album.coverImageUrl, 500)}
                      alt={`${album.title} 대표 사진`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center text-[32px]"
                      aria-hidden="true"
                    >
                      📷
                    </span>
                  )}
                </div>
                <div className="px-3.5 py-3">
                  <p className="truncate text-[15px] font-bold text-ink">{album.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    {formatDotDate(album.eventDate)} · {album.photoCount ?? 0}장
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 앨범 만들기는 운영진만 */}
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 text-[15px] font-bold text-brand-500 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          <PlusIcon className="h-5 w-5" />
          앨범 만들기
        </button>
      ) : null}

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
        saveErrorMessage(caught, "앨범을 만들지 못했어요. 운영진 권한인지 확인해 주세요."),
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
