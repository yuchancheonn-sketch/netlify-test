import "server-only";

import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";
import { sendPushToTokens, tokensForUids } from "@/lib/push-send";

/**
 * 받는 사람들의 모든 기기로 푸시 알림을 보냅니다 (Next 서버의 /api/push/chat·event 창구용).
 *
 * pushTokens 에서 그 사람들의 토큰을 모아 한 번에 발송하고,
 * "이제 없는 토큰"이라는 응답이 온 문서는 지웁니다(청소). 실제 발송은 lib/push-send.ts가 합니다 —
 * 새 복습 영상·소식 알림을 보내는 Netlify 예약 함수도 같은 것을 씁니다.
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
  /** 알림을 눌렀을 때 열 앱 내 주소. 예: "/chat/abc__xyz" */
  url: string;
  /** 같은 tag의 알림은 겹쳐서 하나로 보입니다. 예: "chat:abc__xyz" */
  tag: string;
}): Promise<{ sent: number; failed: number }> {
  const messaging = getAdminMessaging();
  const db = getAdminDb();
  if (!messaging || !db) return { sent: 0, failed: 0 };

  const uids = [...new Set(recipientUids)].filter(Boolean);
  if (uids.length === 0) return { sent: 0, failed: 0 };

  const tokens = await tokensForUids(db, uids);
  return sendPushToTokens(db, messaging, tokens, { title, body, url, tag });
}
