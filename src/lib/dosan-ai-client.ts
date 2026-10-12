"use client";

import { apiUrl } from "@/lib/api";
import { auth } from "@/lib/firebase";

/**
 * 도산 AI에게 답을 부탁합니다(2026-10-12) — 내 방에 메시지를 쓴 직후 부릅니다. 답은 서버가 방에 직접 쓰므로 화면은 방 구독으로 보게 됩니다.
 * 반환: 성공하면 true, 못 하면 false(화면이 "지금은 답을 못 하고 있어요"를 보여 줌). 서버가 답하는 데 몇 초 걸려 오래 기다립니다.
 */
export async function askDosanAi(): Promise<boolean> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return false;
    const response = await fetch(apiUrl("/api/dosan-ai"), { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
    return response.ok;
  } catch {
    return false;
  }
}
