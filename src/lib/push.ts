"use client";

/**
 * 웹 푸시 알림(FCM)을 이 기기에서 켜고 끄는 일.
 *
 * 알림 허용은 **기기·브라우저마다 따로**입니다(폰 크롬, 집 태블릿 등).
 * 그래서 설정은 서버가 아니라 이 기기에 남고, "받는 사람 목록"은
 * pushTokens 컬렉션에 기기 단위 문서로 쌓입니다.
 *
 * iOS는 사파리에서 바로 안 되고, "홈 화면에 추가"로 설치한 PWA 안에서만
 * (그리고 iOS 16.4 이상) 알림이 옵니다. isPushSupported()가 그 여부까지
 * 브라우저 기능 유무로 판단합니다.
 */

import { doc, deleteDoc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getToken, deleteToken } from "firebase/messaging";
import { auth, db, getMessagingIfSupported } from "@/lib/firebase";

const SW_URL = "/firebase-messaging-sw.js";
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * "이 기기에서 알림을 껐다"는 표시. 보기 설정과 같은 방식으로 이 기기에만 남깁니다.
 *
 * 브라우저 권한만으로는 켬/끔을 알 수 없습니다 — 설정에서 껐다고 해서
 * 한 번 허용한 권한이 "default"로 돌아가지는 않기 때문입니다.
 */
const PUSH_KEY = "agikaeta:push";

/**
 * "이 기기에서 알림을 받겠냐고 이미 물어봤다"는 표시.
 *
 * 처음 로그인한 뒤 한 번만 묻고, 나중에 하겠다고 하면 다시 묻지 않습니다.
 * 볼 때마다 물으면 그게 곧 잔소리라, 그다음부터는 설정에서 켜게 둡니다.
 * 알림 권한과 마찬가지로 기기 단위라 서버가 아니라 이 기기에 남깁니다.
 */
const ASKED_KEY = "agikaeta:push-asked";

/**
 * "이 일이 생겼으니 관련된 사람들에게 알림을 보내달라"고 서버에 부탁합니다.
 *
 * Cloud Functions(유료 요금제 필요)를 쓰지 않으므로, 일을 벌인 쪽이 직접
 * 서버 창구를 두드립니다. 남의 이름으로 부를 수 없도록 로그인 토큰을 함께
 * 보내고, 받는 사람이 누구인지는 서버가 원본 문서를 보고 정합니다.
 *
 * 실패해도 아무것도 하지 않습니다. 알림이 한 번 안 온 것뿐이라
 * 원우에게 오류를 띄울 만한 일이 아닙니다.
 */
export async function requestPush(
  path: "chat" | "event" | "poll",
  payload: Record<string, string>,
): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`/api/push/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
      // 보내자마자 화면을 옮겨도 요청이 끊기지 않게 합니다.
      keepalive: true,
    });
  } catch {
    // 조용히 넘어갑니다.
  }
}

/** 이 기기에서 알림을 켤 수 있는지 (브라우저가 필요한 기능을 갖췄는지) */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/** 지금 이 기기의 알림 권한 상태 */
export function getPushPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
}

/** 설정이 덜 됐을 때(운영진이 VAPID 키를 안 넣음) */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_KEY);
}

function rememberChoice(on: boolean): void {
  try {
    localStorage.setItem(PUSH_KEY, on ? "on" : "off");
  } catch {
    // 시크릿 모드처럼 저장할 수 없는 곳 — 이번 방문에만 켜진 셈이 됩니다.
  }
}

/** 이 기기에 알림을 받겠냐고 물어본 적이 있는지 */
export function wasPushAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === "yes";
  } catch {
    // 저장할 수 없는 곳에서는 매번 처음인 셈이 됩니다.
    return false;
  }
}

/** 물어봤다고 적어 둡니다. 허용했든 나중에 하겠다고 했든 한 번이면 됩니다. */
export function rememberPushAsked(): void {
  try {
    localStorage.setItem(ASKED_KEY, "yes");
  } catch {
    // 시크릿 모드처럼 저장할 수 없는 곳 — 다음에 또 물어보게 됩니다.
  }
}

/**
 * 지금 이 기기에 "알림 받으시겠어요?"를 띄워도 되는지.
 *
 * 넷을 모두 만족해야 합니다.
 *  - 이 브라우저가 알림을 쓸 수 있고 (아이폰은 홈 화면에 추가한 앱 안에서만)
 *  - 운영진이 VAPID 키를 넣어 두었고
 *  - 아직 한 번도 물어본 적이 없고
 *  - 브라우저 권한이 아직 "안 정함"일 때. 이미 허용했거나 거절했다면
 *    물어봐야 아무 일도 일어나지 않습니다 — 거절한 사람에게 다시 물으면
 *    브라우저가 창을 띄우지도 않고 곧바로 denied를 돌려줍니다.
 */
export function shouldAskPush(): boolean {
  return (
    isPushSupported() &&
    isPushConfigured() &&
    !wasPushAsked() &&
    getPushPermission() === "default"
  );
}

/** 지금 이 기기에서 알림이 켜져 있는지 (권한이 있고, 내가 끄지 않았는지) */
export function isPushOn(): boolean {
  if (getPushPermission() !== "granted") return false;
  try {
    return localStorage.getItem(PUSH_KEY) !== "off";
  } catch {
    return true;
  }
}

/** 서비스워커를 등록(또는 이미 등록된 것을 회수)합니다. */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL);
}

/**
 * 이 기기의 FCM 토큰을 받아 pushTokens 에 적어 둡니다.
 * 권한이 이미 "granted"일 때만 부릅니다 — 여기서 권한을 묻지는 않습니다.
 */
async function upsertToken(uid: string): Promise<string> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) throw new Error("이 브라우저에서는 알림을 쓸 수 없어요.");
  if (!VAPID_KEY) {
    throw new Error(
      "알림 설정이 아직 안 되어 있어요. 운영진에게 알려주세요. (VAPID 키 미설정)",
    );
  }

  const registration = await registerServiceWorker();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("알림 토큰을 받지 못했어요.");

  const ref = doc(db, "pushTokens", token);
  // createdAt은 처음 한 번만 남기고, 이후로는 refreshedAt만 갱신합니다.
  const snap = await getDoc(ref).catch(() => null);
  const userAgent = navigator.userAgent.slice(0, 300);
  if (snap?.exists()) {
    await setDoc(ref, { uid, userAgent, refreshedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, {
      uid,
      userAgent,
      createdAt: serverTimestamp(),
      refreshedAt: serverTimestamp(),
    });
  }
  return token;
}

/**
 * 이 기기에서 알림 켜기.
 * 권한을 묻고(처음이면 브라우저 팝업), 허용되면 토큰을 등록합니다.
 * 돌려주는 값이 최종 권한 상태입니다.
 */
export async function enablePush(uid: string): Promise<PushPermission> {
  if (!isPushSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushPermission;

  await upsertToken(uid);
  rememberChoice(true);
  return "granted";
}

/** 이 기기에서 알림 끄기. 토큰을 지우고 브라우저 구독도 해제합니다. */
export async function disablePush(): Promise<void> {
  // 끔 표시부터 남깁니다. 아래에서 실패하더라도 다시 켜지지는 않아야 합니다.
  rememberChoice(false);

  const messaging = await getMessagingIfSupported();
  if (!messaging || !VAPID_KEY) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration ?? undefined,
    }).catch(() => null);

    if (token) {
      await deleteDoc(doc(db, "pushTokens", token)).catch(() => {});
    }
    await deleteToken(messaging).catch(() => {});
  } catch {
    // 이미 꺼져 있거나 토큰이 없는 경우 — 그냥 넘어갑니다.
  }
}

/**
 * 앱을 열 때 조용히 토큰을 새로 고칩니다.
 *
 * 토큰은 브라우저가 말없이 바꿔버릴 때가 있어서(앱 재설치, 오래 미사용 등),
 * 이미 알림을 켠 기기라면 열 때마다 최신 토큰을 다시 적어 둡니다.
 * 권한을 묻지 않고, 실패해도 조용합니다.
 */
export async function syncPushToken(uid: string): Promise<void> {
  if (!isPushOn() || !VAPID_KEY) return;
  try {
    await upsertToken(uid);
  } catch {
    // 조용히 넘어갑니다. 다음에 열 때 다시 시도됩니다.
  }
}
