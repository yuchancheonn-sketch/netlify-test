import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";
import { PUSH_BODY_MAX_LENGTH } from "./constants";

/**
 * 푸시 알림을 실제로 보내는 부분 — 기기 토큰 모으기, 발송, 죽은 토큰 청소.
 *
 * Next 서버의 알림 창구(lib/push-server.ts → /api/push/chat·event)와
 * Netlify 예약 함수(netlify/functions/feed-push.mts — 새 복습 영상·소식 알림)가 함께 씁니다.
 * db·messaging을 받아서 쓰기만 하고 Admin SDK를 직접 시작하지 않습니다.
 * 시작하는 자리가 Next 서버와 예약 함수로 서로 달라서입니다.
 *
 * ★ import는 상대 경로("./constants")로 둡니다. 예약 함수는 Next 밖에서 묶여
 *   "@/" 별칭을 모를 수 있습니다. "server-only"를 붙이지 않은 이유는 lib/service-account.ts에.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 열 앱 안 주소. 예: "/chat/abc__xyz", "/library?tab=news" */
  url: string;
  /** 같은 tag의 알림은 겹쳐서 하나로 보입니다. 예: "chat:abc__xyz", "feed:news" */
  tag: string;
  /**
   * 폰이 꺼져 있을 때 FCM이 알림을 들고 기다려 줄 시간(초). 기본 30분.
   * 채팅은 늦게 받으면 의미가 줄지만, 새 영상·소식은 반나절 뒤에 받아도 쓸모가 있습니다.
   */
  ttlSeconds?: number;
}

/** FCM이 한 번에 받는 토큰 수 상한. 넘기면 그 발송이 통째로 거절됩니다. */
const FCM_MULTICAST_LIMIT = 500;

/**
 * 기기 토큰 묶음 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱과 같음) — 웹(서비스워커가 알림을 띄움)과
 * 앱(안드로이드 등, FCM이 알림을 띄움)은 보내는 모양이 달라 나눕니다.
 */
export interface PushTargets {
  web: string[];
  native: string[];
}

/** 그 사람들의 모든 기기 토큰. Firestore "in" 질의는 한 번에 최대 30개까지라 나눠서 훑습니다. platform이 없는 옛 문서는 웹입니다. */
export async function tokensForUids(db: Firestore, uids: string[]): Promise<PushTargets> {
  const tokens: PushTargets = { web: [], native: [] };
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await db
      .collection("pushTokens")
      .where("uid", "in", uids.slice(i, i + 30))
      .get();
    snap.forEach((doc) => {
      const platform = doc.get("platform");
      (platform === "android" || platform === "ios" ? tokens.native : tokens.web).push(doc.id);
    });
  }
  return tokens;
}

/**
 * 토큰들로 알림을 보냅니다. 500개씩 끊어 보내고, "이제 없는 토큰"이라는 응답이 온
 * pushTokens 문서는 지웁니다. 원우 전원(378명·여러 기기)에게 보낼 때 500을 넘길 수 있습니다.
 */
export async function sendPushToTokens(
  db: Firestore,
  messaging: Messaging,
  targets: PushTargets,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const first = await sendToGroup(db, messaging, targets.web, payload, false);
  const second = await sendToGroup(db, messaging, targets.native, payload, true);
  return { sent: first.sent + second.sent, failed: first.failed + second.failed };
}

async function sendToGroup(
  db: Firestore,
  messaging: Messaging,
  tokens: string[],
  payload: PushPayload,
  native: boolean,
): Promise<{ sent: number; failed: number }> {
  const unique = [...new Set(tokens)].filter(Boolean);
  if (unique.length === 0) return { sent: 0, failed: 0 };

  const body =
    payload.body.length > PUSH_BODY_MAX_LENGTH
      ? `${payload.body.slice(0, PUSH_BODY_MAX_LENGTH)}…`
      : payload.body;

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  for (let i = 0; i < unique.length; i += FCM_MULTICAST_LIMIT) {
    const chunk = unique.slice(i, i + FCM_MULTICAST_LIMIT);
    /*
     * notification 없이 data만 보냅니다. 서비스워커가 이 값으로 알림을 직접
     * 띄우기 때문에(제목·아이콘·tag를 우리가 정한 대로), 브라우저가 멋대로
     * 띄우는 기본 알림과 겹치지 않습니다.
     *
     * fcmOptions.link 는 일부러 쓰지 않습니다. FCM은 그 값이 https 로 시작하는
     * 온전한 주소이기를 요구해서 "/chat/…" 같은 앱 안 주소를 넣으면 발송
     * 자체가 거절당합니다. 누르면 어디로 갈지는 서비스워커의 notificationclick 이 data.url 로 정합니다.
     */
    /*
     * 앱(안드로이드)은 서비스워커가 없어서 data만 보내면 앱이 꺼져 있을 때 알림이 뜨지 않습니다 — notification을 함께 보냅니다
     * (2026-10-06 사용자 요청 (구글 플레이 출시 준비)). 알림을 누르면 앱이 열리고 data.url을 앱이 읽어 그 화면으로 갑니다(components/NativeAppSync.tsx).
     */
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      data: { title: payload.title, body, url: payload.url, tag: payload.tag },
      ...(native
        ? {
            notification: { title: payload.title, body },
            android: {
              priority: "high" as const,
              ttl: (payload.ttlSeconds ?? 1800) * 1000,
              notification: { tag: payload.tag, channelId: "default" },
            },
          }
        : { webpush: { headers: { Urgency: "high", TTL: String(payload.ttlSeconds ?? 1800) } } }),
    });
    sent += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(chunk[index]);
      }
    });
  }

  // 죽은 토큰 청소
  await Promise.all(
    dead.map((token) => db.collection("pushTokens").doc(token).delete().catch(() => {})),
  );

  return { sent, failed };
}
