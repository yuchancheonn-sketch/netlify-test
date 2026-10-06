"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { addDoc, collection, deleteField, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { auth, db } from "@/lib/firebase";
import { requestPush } from "@/lib/push";
import { apiUrl } from "@/lib/api";

/**
 * 신고·차단 (사용자 요청 2026-10-06, 구글 플레이 출시 준비 — 사용자가 올리는 글·사진·채팅이 있는 앱은
 * 앱 안에 신고하기와 차단하기가 있어야 합니다. 뉴웨이브앱 lib/moderation.ts를 옮김).
 *
 *  - 차단: userBlocks/{내 uid} = { blocked: { 상대 uid: true } } — 본인만 읽고 씁니다. 차단한 사람의 글·사진·채팅은 내 화면에서만 사라집니다.
 *  - 신고: reports/{자동 id} — 가입자는 올리기만, 운영진만 읽습니다(운영진 화면 "신고" 탭). 올리면 운영진에게 폰 알림(/api/push/report)이 갑니다.
 * ★ 요금: 차단 목록은 앱을 여는 동안 문서 한 개를 듣습니다(열 때 읽기 1건, 바뀔 때만 추가). 신고 한 번에 쓰기 1건 + 운영진 알림 기록.
 */
const EMPTY: ReadonlySet<string> = new Set();
let state: { uid: string | null; blocked: ReadonlySet<string> } = { uid: null, blocked: EMPTY };
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function follow(uid: string | null) {
  if (state.uid === uid) return;
  unsubscribe?.();
  unsubscribe = null;
  state = { uid, blocked: EMPTY };
  emit();
  if (!uid) return;
  unsubscribe = onSnapshot(
    doc(db, "userBlocks", uid),
    (snapshot) => {
      state = { uid, blocked: new Set(Object.keys((snapshot.data()?.blocked as Record<string, boolean> | undefined) ?? {})) };
      emit();
    },
    () => undefined,
  );
}

/** 내가 차단한 사람들의 uid. 로그아웃 상태에서는 빈 집합입니다. */
export function useBlockedUids(): ReadonlySet<string> {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  useEffect(() => follow(uid), [uid]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => (state.uid === uid ? state.blocked : EMPTY),
    () => EMPTY,
  );
}

export async function blockUser(myUid: string, targetUid: string) {
  await setDoc(doc(db, "userBlocks", myUid), { blocked: { [targetUid]: true } }, { merge: true });
}

export async function unblockUser(myUid: string, targetUid: string) {
  await setDoc(doc(db, "userBlocks", myUid), { blocked: { [targetUid]: deleteField() } }, { merge: true });
}

/**
 * 신고할 수 있는 것의 종류.
 *  message 채팅 메시지 / album 원우소식 / file 자료 파일 / opinion 익명 의견 / poll 투표·의견 모으기 글 /
 *  comment 수업 느낀점 댓글 / video 원우 소개 영상 / user 사람
 */
export type ReportTargetType = "message" | "album" | "file" | "opinion" | "poll" | "comment" | "video" | "user";

export type ReportTarget = {
  type: ReportTargetType;
  /** 글 문서 경로(운영진이 지울 때 씁니다). 사람을 신고할 때는 그 사람의 users/{uid} */
  path: string;
  /** 글쓴이(또는 신고 대상 사람)의 uid·이름. 익명 의견처럼 모르면 빈 문자열 — 이때는 차단을 권하지 않습니다. */
  uid: string;
  name: string;
  /** 어느 글인지 운영진이 알아보도록 앞부분 일부 */
  preview: string;
  cohort: string;
};

export const REPORT_REASONS = ["스팸·광고", "욕설·혐오·괴롭힘", "음란하거나 불쾌한 내용", "개인정보 노출", "기타"] as const;

export async function submitReport(reporter: { uid: string; name: string }, target: ReportTarget, reason: string, detail: string) {
  const ref = await addDoc(collection(db, "reports"), {
    reporterUid: reporter.uid,
    reporterName: reporter.name,
    targetType: target.type,
    targetPath: target.path,
    targetUid: target.uid,
    targetName: target.name,
    preview: target.preview.slice(0, 140),
    cohort: target.cohort,
    reason,
    detail: detail.trim().slice(0, 300),
    status: "open",
    createdAt: serverTimestamp(),
  });
  void requestPush("report", { reportId: ref.id }); // 운영진에게 알림(실패해도 조용히)
}

export type ReportDoc = {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetPath: string;
  targetUid: string;
  targetName: string;
  preview: string;
  reason: string;
  detail: string;
  createdAt?: { toMillis?: () => number } | null;
};

/** 운영진 화면용 — 아직 처리하지 않은 신고들(최신순). 운영진만 읽을 수 있어 enabled는 운영자일 때만 켭니다. */
export function useOpenReports(enabled: boolean): { data: ReportDoc[]; loading: boolean } {
  const [list, setList] = useState<ReportDoc[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      query(collection(db, "reports"), where("status", "==", "open")),
      (snapshot) =>
        setList(
          snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as ReportDoc)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
        ),
      () => setList([]),
    );
  }, [enabled]);
  return { data: enabled ? (list ?? []) : [], loading: enabled && list === null };
}

/** 신고 처리 — delete: 신고된 글을 지우고 처리됨 / dismiss: 글은 두고 처리됨. 서버(/api/report/resolve)가 운영자인지 확인합니다. */
export async function resolveReport(reportId: string, action: "delete" | "dismiss"): Promise<boolean> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return false;
  const response = await fetch(apiUrl("/api/report/resolve"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ reportId, action }),
  });
  return response.ok;
}
