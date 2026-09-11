import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { parseServiceAccount } from "@/lib/service-account";

/**
 * 서버(라우트 핸들러)에서만 쓰는 Firebase Admin SDK.
 *
 * 이걸로 하는 일은 단 하나 — **웹 푸시 알림 보내기**입니다.
 * Admin SDK는 보안 규칙을 건너뛰므로, 받는 사람들의 기기 토큰(pushTokens)을
 * 훑어 FCM으로 보냅니다. 그 외의 읽기·쓰기는 여전히 클라이언트가
 * 보안 규칙 아래에서 직접 합니다.
 *
 * 인증정보는 FIREBASE_SERVICE_ACCOUNT 환경변수 하나에 서비스 계정 JSON을
 * 통째로(한 줄로) 넣어 전달합니다. NEXT_PUBLIC_ 이 없으므로 브라우저로는
 * 절대 나가지 않습니다. 값이 없으면 아래 함수들이 null을 돌려주고,
 * 알림 기능만 조용히 꺼집니다. (앱의 다른 부분은 영향 없음)
 *
 * 값을 읽는 방법은 lib/service-account.ts에 있습니다 — 새 영상·소식 알림을 보내는
 * Netlify 예약 함수(netlify/functions/feed-push.mts)도 같은 것을 씁니다.
 */

let cached: App | null = null;

function getAdminApp(): App | null {
  if (cached) return cached;
  if (getApps().length) {
    cached = getApps()[0];
    return cached;
  }
  const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!account) return null;
  cached = initializeApp({ credential: cert(account) });
  return cached;
}

/** 알림 발송용. 설정이 없으면 null. */
export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  return app ? getMessaging(app) : null;
}

/** 규칙을 건너뛰고 읽는 Firestore. 설정이 없으면 null. */
export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

/** 요청을 보낸 사람이 진짜 그 사람인지 확인하는 데 씁니다. 설정이 없으면 null. */
export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}
