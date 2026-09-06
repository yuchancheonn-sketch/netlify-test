"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { ArrowUpIcon, ChatIcon } from "@/components/icons";
import { EmptyState, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatChatListTime } from "@/lib/format";
import { useApprovedMembers, useSessionComments } from "@/lib/hooks";
import {
  addSessionComment,
  deleteSessionComment,
  rootCommentId,
} from "@/lib/session-comments";
import { SESSION_COMMENT_MAX_LENGTH } from "@/lib/constants";
import type { SessionCommentDoc, UserDoc } from "@/lib/types";

/**
 * 그 주 수업에 남기는 느낀점 — 원우 모두가 읽고 서로 답합니다.
 *
 * 답글은 한 겹만 들어갑니다. 답글에 단 답글도 같은 원 댓글 아래로 들어가서,
 * 폰 화면에서 글이 오른쪽으로 계속 밀리지 않습니다.
 */
export default function SessionComments({ week }: { week: number }) {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const { data: comments, loading, error } = useSessionComments(week);
  const { data: members } = useApprovedMembers();

  /** 답글을 달고 있는 원 댓글. null이면 새 댓글을 쓰는 중입니다. */
  const [replyTo, setReplyTo] = useState<SessionCommentDoc | null>(null);

  /*
   * 쓴 사람의 지금 이름과 사진을 uid로 찾아 붙입니다.
   * 댓글에도 이름을 적어 두지만, 원우가 이름을 고치면 예전 댓글까지 함께
   * 바뀌는 편이 자연스럽습니다. (채팅과 같은 방식)
   */
  const memberByUid = useMemo(() => {
    const map = new Map<string, { name: string; photoURL: string | null }>();
    for (const member of members) {
      map.set(member.uid, { name: member.name, photoURL: member.photoURL });
    }
    return map;
  }, [members]);

  /** 맨 위 댓글과 그 아래 답글들로 묶습니다. */
  const threads = useMemo(() => {
    const roots = comments.filter((comment) => !comment.parentId);
    const repliesByRoot = new Map<string, SessionCommentDoc[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = repliesByRoot.get(comment.parentId) ?? [];
      list.push(comment);
      repliesByRoot.set(comment.parentId, list);
    }
    return roots.map((root) => ({
      root,
      replies: repliesByRoot.get(root.id) ?? [],
    }));
  }, [comments]);

  return (
    <section className="px-4 pb-4">
      <h2 className="mb-3 text-[17px] font-bold text-ink">
        느낀점 나누기
        {comments.length > 0 ? (
          <span className="ml-1.5 text-brand-500 tabular-nums">{comments.length}</span>
        ) : null}
      </h2>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      ) : error ? (
        <p role="alert" className="py-6 text-center text-[14px] text-danger">
          {error}
        </p>
      ) : threads.length === 0 ? (
        <div className="rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<ChatIcon className="h-10 w-10" />}
            title="아직 남긴 느낀점이 없어요"
            description="이 수업에서 마음에 남은 것을 먼저 나눠보세요."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map(({ root, replies }) => (
            <li
              key={root.id}
              className="rounded-3xl bg-surface p-4 shadow-[var(--shadow-card)]"
            >
              <CommentRow
                comment={root}
                week={week}
                myUid={uid}
                member={memberByUid.get(root.authorId)}
                onReply={() => setReplyTo(root)}
              />

              {replies.length > 0 ? (
                /*
                  답글은 왼쪽에 선을 긋고 안으로 들여 씁니다.
                  사진(32px) + 사이 간격(10px)만큼 들여, 원 댓글의 글과
                  답글의 사진이 한 줄로 서지 않고 한 칸 안으로 들어갑니다.
                */
                <ul className="mt-3 flex flex-col gap-3 border-l border-line pl-3">
                  {replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentRow
                        comment={reply}
                        week={week}
                        myUid={uid}
                        member={memberByUid.get(reply.authorId)}
                        onReply={() => setReplyTo(root)}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <CommentComposer
        week={week}
        uid={uid}
        profile={profile}
        replyTo={replyTo}
        replyToName={
          replyTo ? (memberByUid.get(replyTo.authorId)?.name ?? replyTo.authorName) : null
        }
        onCancelReply={() => setReplyTo(null)}
        onSent={() => setReplyTo(null)}
        allComments={comments}
      />
    </section>
  );
}

/** 댓글 한 줄 — 사진, 이름, 시각, 내용, 그리고 답글·삭제 */
function CommentRow({
  comment,
  week,
  myUid,
  member,
  onReply,
  compact = false,
}: {
  comment: SessionCommentDoc;
  week: number;
  myUid?: string;
  member?: { name: string; photoURL: string | null };
  onReply: () => void;
  compact?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const name = member?.name || comment.authorName || "원우";
  const mine = comment.authorId === myUid;
  // 서버 시각이 아직 안 온 방금 쓴 댓글은 지금 시각으로 보여줍니다.
  const writtenAt = comment.createdAt?.toDate() ?? new Date();

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm("이 느낀점을 지울까요?")) return;
    setDeleting(true);
    try {
      await deleteSessionComment({ week, commentId: comment.id });
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <Avatar
        src={member?.photoURL ?? null}
        name={name}
        seed={comment.authorId}
        size={compact ? 28 : 32}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span className="truncate text-[14px] font-bold text-ink">{name}</span>
          <time className="shrink-0 text-[12px] text-ink-faint">
            {formatChatListTime(writtenAt)}
          </time>
        </p>

        <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
          {comment.text}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={onReply}
            className="text-[13px] font-bold text-ink-muted transition active:text-brand-500"
          >
            답글
          </button>
          {/* 지우기는 자기 글에만 보입니다. 남의 글은 지울 수 없습니다(보안 규칙). */}
          {mine ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[13px] font-bold text-ink-faint transition active:text-danger disabled:opacity-50"
            >
              지우기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * 아래에 붙어 있는 입력줄.
 *
 * 대화방 입력줄과 같은 모양으로 두어, 앱 안에서 글 쓰는 자리가 하나로 읽힙니다.
 * 답글을 쓰는 중이면 위에 "○○님에게 답글" 줄이 붙습니다.
 */
function CommentComposer({
  week,
  uid,
  profile,
  replyTo,
  replyToName,
  onCancelReply,
  onSent,
  allComments,
}: {
  week: number;
  uid?: string;
  profile: UserDoc | null;
  replyTo: SessionCommentDoc | null;
  replyToName: string | null;
  onCancelReply: () => void;
  onSent: () => void;
  allComments: SessionCommentDoc[];
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !uid || sending) return;

    setSending(true);
    setProblem(null);
    // 실패하면 되돌릴 수 있도록 원본을 들고 있습니다.
    setDraft("");

    try {
      await addSessionComment({
        week,
        author: { uid, profile },
        text,
        // 답글에 단 답글도 맨 위 댓글에 매답니다.
        parentId: replyTo ? rootCommentId(allComments, replyTo) : null,
      });
      onSent();
    } catch {
      setDraft(text);
      setProblem("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="sticky bottom-0 -mx-4 mt-4 bg-canvas/95 px-4 pt-3 pb-2 backdrop-blur">
      {replyTo ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-3.5 py-2">
          <p className="min-w-0 truncate text-[13px] font-bold text-brand-500">
            {replyToName}님에게 답글
          </p>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 text-[13px] font-bold text-ink-muted"
          >
            취소
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          value={draft}
          onChange={(changed) => setDraft(changed.target.value)}
          placeholder={replyTo ? "답글 남기기" : "느낀점 남기기"}
          aria-label={replyTo ? "답글 입력" : "느낀점 입력"}
          maxLength={SESSION_COMMENT_MAX_LENGTH}
          className="min-w-0 flex-1 rounded-full bg-surface px-4.5 py-2.5 text-[16px] leading-6 text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint"
        />
        {/* 동그라미 지름 44px = 입력칸 높이(글줄 24 + 위아래 10씩). 대화방과 같습니다. */}
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="남기기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:bg-brand-200"
        >
          {sending ? (
            <Spinner className="h-[17px] w-[17px]" />
          ) : (
            <ArrowUpIcon className="h-[17px] w-[17px]" />
          )}
        </button>
      </form>

      {problem ? (
        <p role="alert" className="mt-2 text-center text-[12px] font-medium text-danger">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
