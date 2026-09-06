"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { syncPushToken } from "@/lib/push";

/**
 * 알림을 이미 켜 둔 기기의 토큰을 앱을 열 때마다 새로 적어 둡니다.
 *
 * FCM 토큰은 브라우저가 말없이 바꿔버릴 때가 있습니다(앱 재설치, 오래
 * 안 씀 등). 그러면 서버가 옛 토큰으로 보내다 조용히 실패하고, 원우는
 * "알림을 켰는데 안 온다"고 느낍니다. 열 때 한 번 다시 적어두면 그 틈이 없습니다.
 *
 * 권한을 새로 묻지는 않습니다 — 이미 허용한 기기만 조용히 갱신합니다.
 * 화면에는 아무것도 그리지 않습니다.
 */
export default function PushSync() {
  const { user, stage } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (stage !== "ready" || !uid) return;
    void syncPushToken(uid);
  }, [stage, uid]);

  return null;
}
