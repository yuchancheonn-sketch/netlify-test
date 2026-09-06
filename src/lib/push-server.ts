import "server-only";

import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";
import { PUSH_BODY_MAX_LENGTH } from "@/lib/constants";

/**
 * 받는 사람들의 모든 기기로 푸시 알림을 보냅니다.
 *
 * pushTokens 에서 그 사람들의 토큰을 모아 한 번에 발송하고,
 * "이제 없는 토큰"이라는 응답이 온 문서는 지웁니다(청소).
 * 설정이 없거나 받는 사람이 없으면 조용히 아무 일도 하지 않습니다.
 */
export async function sendPushToUsers({
  recipientUids,
  title,
  body,
  url,
  tag,
}: {
  recipientUids: string[];
  title: string;
  body: string;
  /** 알림을 눌렀을 때 열 앱 내 주소. 예: "/chat/main" */
  url: string;
  /** 같은 tag의 알림은 겹쳐서 하나로 보입니다. 예: "chat:main" */
  tag: string;
}): Promise<{ sent: number; failed: number }> {
  const messaging = getAdminMessaging();
  const db = getAdminDb();
  if (!messaging || !db) return { sent: 0, failed: 0 };

  const uids = [...new Set(recipientUids)].filter(Boolean);
  if (uids.length === 0) return { sent: 0, failed: 0 };

  // Firestore "in" 질의는 한 번에 최대 30개까지라, 나눠서 훑습니다.
  const tokens: string[] = [];
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    const snap = await db.collection("pushTokens").where("uid", "in", chunk).get();
    snap.forEach((doc) => tokens.push(doc.id));
  }
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const trimmedBody =
    body.length > PUSH_BODY_MAX_LENGTH ? `${body.slice(0, PUSH_BODY_MAX_LENGTH)}…` : body;

  /*
   * notification 없이 data만 보냅니다. 서비스워커가 이 값으로 알림을 직접
   * 띄우기 때문에(제목·아이콘·tag를 우리가 정한 대로), 브라우저가 멋대로
   * 띄우는 기본 알림과 겹치지 않습니다.
   */
  /*
   * fcmOptions.link 는 일부러 쓰지 않습니다. FCM은 그 값이 https 로 시작하는
   * 온전한 주소이기를 요구해서 "/chat/main" 같은 앱 안 주소를 넣으면 발송
   * 자체가 거절당합니다. 게다가 data만 보내는 알림에는 쓰이지도 않습니다 —
   * 누르면 어디로 갈지는 서비스워커의 notificationclick 이 data.url 로 정합니다.
   */
  const response = await messaging.sendEachForMulticast({
    tokens,
    data: { title, body: trimmedBody, url, tag },
    webpush: {
      headers: { Urgency: "high", TTL: "1800" },
    },
  });

  // 죽은 토큰 청소
  const dead: string[] = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;
    const code = result.error?.code ?? "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      dead.push(tokens[index]);
    }
  });
  await Promise.all(
    dead.map((token) => db.collection("pushTokens").doc(token).delete().catch(() => {})),
  );

  return { sent: response.successCount, failed: response.failureCount };
}
