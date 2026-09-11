import type { Firestore } from "firebase-admin/firestore";

/**
 * 헤더 종 모양 알림함에 쌓이는 알림 한 건을 적습니다 — notices/{자동 id} (2026-09-11).
 *
 * 쓰는 곳은 서버뿐입니다. 폰에 푸시를 보내는 바로 그 자리에서 함께 적습니다.
 *  - 새 일정: /api/push/event (그 기수 원우에게)
 *  - 새 복습 영상·소식: netlify/functions/feed-push.mts → lib/feed-watch.ts (모든 기수)
 * 채팅은 넣지 않습니다 — 하단 채팅 탭에 이미 빨간 점이 있어, 알림함까지 채우면 같은 소식이 두 번 옵니다.
 *
 * ★ 사람마다 한 건씩 적지 않고 한 번만 적습니다(378명이면 378건이 아니라 1건).
 *   앱이 내 기수 것 + "all"을 골라 보여주고, 어디까지 봤는지는 chatReads/{uid}.noticesSeenAt 하나로 셉니다.
 *
 * "server-only"를 붙이지 않고 상대 경로만 씁니다 — 예약 함수는 Next 밖에서 묶이기 때문입니다(lib/service-account.ts).
 * 보안 규칙에서 notices 쓰기는 아무에게도 열지 않았습니다. Admin SDK만 씁니다.
 */

export type NoticeType = "event" | "video" | "news";

export interface NewNotice {
  type: NoticeType;
  title: string;
  body: string;
  /** 누르면 열 앱 안 주소 */
  url: string;
  /** "10기"처럼 한 기수만, 모든 기수면 "all" */
  cohort: string;
}

export async function addNotice(db: Firestore, notice: NewNotice): Promise<void> {
  await db.collection("notices").add({ ...notice, createdAt: new Date() });
}
