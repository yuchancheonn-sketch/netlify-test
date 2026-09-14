import type { Config } from "@netlify/functions";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { checkFeedsAndNotify } from "../../src/lib/feed-watch";
import { pruneOldNotices } from "../../src/lib/notices";
import { parseServiceAccount } from "../../src/lib/service-account";

/**
 * 새 복습 영상·도산아카데미 소식 알림 — 한 시간마다 도는 Netlify 예약 함수 (2026-09-11).
 *
 * 하는 일은 lib/feed-watch.ts에 있습니다. 여기서는 Admin SDK를 시작해 넘기기만 합니다.
 *
 * ★ 알아 둘 것
 *  - 예약 함수는 **배포본(main에 push → Netlify 배포)에서만** 돕니다. 로컬 개발 서버·미리보기 배포에서는 안 돕니다.
 *  - Netlify 환경변수에 FIREBASE_SERVICE_ACCOUNT가 있어야 합니다(채팅·일정 알림과 같은 값). 없으면 조용히 건너뜁니다.
 *  - 한 번 실행은 30초 안에 끝나야 합니다. 피드 둘을 각각 10초까지만 기다립니다.
 *  - Netlify 화면(Functions → feed-push)에서 "Run now"로 바로 돌려 볼 수 있고, 로그에 결과가 찍힙니다.
 *  - FEED_PUSH_DRY_RUN=1이면 읽기만 하고 적거나 보내지 않습니다(점검용).
 *  - "@/" 별칭 대신 상대 경로로 부릅니다 — 이 파일은 Next 밖에서 묶입니다.
 */
const feedPush = async () => {
  const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!account) {
    console.log("[feed-push] FIREBASE_SERVICE_ACCOUNT가 없어 건너뜁니다.");
    return;
  }

  const app = getApps()[0] ?? initializeApp({ credential: cert(account) });
  const db = getFirestore(app);
  const dryRun = process.env.FEED_PUSH_DRY_RUN === "1";
  const results = await checkFeedsAndNotify({
    db,
    messaging: getMessaging(app),
    dryRun,
  });
  console.log("[feed-push]", JSON.stringify(results));

  /*
   * 알림함 정리 — 일주일(NOTICE_KEEP_DAYS) 지난 알림 문서를 지웁니다 (2026-09-15).
   * 앱은 이미 7일 안의 알림만 보여주므로, 여기서 늦게 지워지거나 한 번 실패해도 원우 화면에는 차이가 없습니다.
   * 그래서 실패해도 위 피드 알림 결과는 그대로 두고 로그만 남깁니다.
   */
  try {
    const pruned = await pruneOldNotices(db, { dryRun });
    console.log("[feed-push] 오래된 알림", dryRun ? "지울 예정" : "지움", pruned);
  } catch (error) {
    console.log("[feed-push] 오래된 알림 정리 실패", error);
  }
};

export default feedPush;

// 매시 정각(UTC 기준이지만 "매시"라 한국 시간으로도 매시 정각)에 돕니다.
export const config: Config = {
  schedule: "@hourly",
};
