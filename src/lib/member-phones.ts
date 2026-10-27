"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * 원우수첩에 보일 전화번호 (2026-10-27 사용자 요청 "번호를 따로 분리해서 보관, 유닝앱처럼").
 * 번호는 users 문서가 아니라 본인·운영진만 읽는 users/{uid}/private/main에 있어서, 다른 원우의 번호는 서버 창구(/api/members/phones)가
 * "번호 공개를 켠 사람 + 내 번호"(운영진은 전원)만 내려줍니다. 앱이 켜져 있는 동안 한 번 받아 두고, 내가 번호나 공개 설정을 고치면 refreshMemberPhones()로 다시 받습니다.
 */
type Phones = Record<string, string>;

const listeners = new Set<() => void>();
let cache: { uid: string; phones: Phones } | null = null;

async function load(uid: string, getToken: () => Promise<string>): Promise<Phones> {
  const response = await fetch(apiUrl("/api/members/phones"), {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`phones ${response.status}`);
  const body = (await response.json()) as { phones?: Phones };
  const phones = body.phones ?? {};
  cache = { uid, phones };
  listeners.forEach((notify) => notify());
  return phones;
}

/** 번호·공개 설정을 고친 뒤 다시 받아 옵니다(실패해도 조용히). */
export function refreshMemberPhones(uid: string, getToken: () => Promise<string>): void {
  load(uid, getToken).catch(() => undefined);
}

/** { uid → 번호 } — 아직 못 받았거나 못 받으면 빈 목록(그동안은 번호가 안 보임). */
export function useMemberPhones(): Phones {
  const { user, profile } = useAuth();
  const uid = user?.uid ?? "";
  const approved = profile?.status === "approved";
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!uid || !approved || !user) return;
    const notify = () => rerender((n) => n + 1);
    listeners.add(notify);
    if (!cache || cache.uid !== uid) load(uid, () => user.getIdToken()).catch(() => undefined);
    return () => void listeners.delete(notify);
  }, [uid, approved, user]);

  return uid && cache && cache.uid === uid ? cache.phones : EMPTY;
}

const EMPTY: Phones = {};
