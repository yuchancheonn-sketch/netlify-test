import type { Firestore } from "firebase-admin/firestore";

/**
 * 헤더 종 모양 알림함에 쌓이는 알림 한 건을 적습니다 — notices/{자동 id} (2026-09-11).
 *
 * 쓰는 곳은 서버뿐입니다. 폰에 푸시를 보내는 바로 그 자리에서 함께 적습니다.
 *  - 새 일정: /api/push/event (그 기수 원우에게)
 *  - 새 투표·의견 모으기: /api/push/poll (그 기수, "전체 기수"로 열었으면 모든 기수)
 *  - 새 복습 영상·소식: netlify/functions/feed-push.mts → lib/feed-watch.ts (모든 기수)
 * 채팅은 넣지 않습니다 — 하단 채팅 탭에 이미 빨간 점이 있어, 알림함까지 채우면 같은 소식이 두 번 옵니다.
 *
 * ★ 사람마다 한 건씩 적지 않고 한 번만 적습니다(378명이면 378건이 아니라 1건).
 *   앱이 내 기수 것 + "all"을 골라 보여주고, 어디까지 봤는지는 chatReads/{uid}.noticesSeenAt 하나로 셉니다.
 *
 * "server-only"를 붙이지 않고 상대 경로만 씁니다 — 예약 함수는 Next 밖에서 묶이기 때문입니다(lib/service-account.ts).
 * 보안 규칙에서 notices 쓰기는 아무에게도 열지 않았습니다. Admin SDK만 씁니다.
 */

export type NoticeType = "event" | "poll" | "video" | "news";

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

/**
 * 알림을 알림함에 남겨 두는 기간(일). 이보다 오래된 알림은 목록에서 빠지고, 서버가 지웁니다 (2026-09-15 사용자 요청).
 *
 * 두 곳이 같은 값을 봅니다.
 *  - 앱: lib/hooks.ts의 useNotices가 이 기간 안의 알림만 받아 보여줍니다(헤더 종의 빨간 점도 같은 목록).
 *    그래서 서버가 아직 안 지웠어도 7일 지난 알림은 화면에 안 보입니다.
 *  - 서버: 아래 pruneOldNotices를 매시 도는 예약 함수(netlify/functions/feed-push.mts)가 불러 실제 문서를 지웁니다.
 *
 * 이 파일의 firebase-admin은 타입만 가져오므로(import type) 앱 쪽에서 이 상수를 가져다 써도 서버 코드가 딸려 가지 않습니다.
 */
export const NOTICE_KEEP_DAYS = 7;

/** 한 번에 지우는 최대 건수 — Firestore 일괄 쓰기 한도(500) 안쪽. 알림은 하루 몇 건이라 보통 한 번에 끝납니다. */
const PRUNE_BATCH_SIZE = 400;

/**
 * NOTICE_KEEP_DAYS보다 오래된 notices 문서를 지웁니다. 지운(dryRun이면 지울) 건수를 돌려줍니다.
 * 예약 함수는 30초 안에 끝나야 해서, 많이 쌓였을 때도 몇 묶음까지만 지우고 나머지는 다음 시간에 넘깁니다.
 */
export async function pruneOldNotices(
  db: Firestore,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<number> {
  const cutoff = new Date(Date.now() - NOTICE_KEEP_DAYS * 24 * 60 * 60 * 1000);
  let total = 0;

  for (let round = 0; round < 5; round += 1) {
    const snapshot = await db
      .collection("notices")
      .where("createdAt", "<", cutoff)
      .limit(PRUNE_BATCH_SIZE)
      .get();
    if (snapshot.empty) break;

    total += snapshot.size;
    if (dryRun) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    if (snapshot.size < PRUNE_BATCH_SIZE) break;
  }

  return total;
}
