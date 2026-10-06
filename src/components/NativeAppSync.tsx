"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { consumeNativeKakaoState, KAKAO_APP_SCHEME } from "@/lib/kakao-login";
import { isNativeApp } from "@/lib/native";
import { localizeAppPath } from "@/lib/routes";

/**
 * 구글 플레이 앱 안에서만 하는 일 (2026-10-06 사용자 요청 (구글 플레이 출시 준비)) — 화면에는 아무것도 그리지 않습니다.
 * ① 카카오 로그인: 시스템 브라우저에서 카카오를 다녀온 웹 페이지가 `app.web.aegiaeta://kakao?token=…&state=…`로 앱을 다시 엽니다 → 표로 로그인.
 * ② 안드로이드 뒤로 가기 단추: 이전 화면이 있으면 뒤로, 없으면 앱 닫기.
 * ③ 알림을 누르면: 서버가 보낸 data.url 화면으로(채팅방 주소는 앱용 모양으로 바꿔서).
 */
export default function NativeAppSync() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    const cleanups: Array<() => void> = [];
    let cancelled = false;
    void (async () => {
      const [{ App }, { Browser }, { PushNotifications }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
        import("@capacitor/push-notifications"),
      ]);
      if (cancelled) return;
      const handles = await Promise.all([
        App.addListener("appUrlOpen", ({ url }) => {
          if (!url.startsWith(`${KAKAO_APP_SCHEME}://kakao`)) return;
          void Browser.close().catch(() => undefined);
          const params = new URL(url).searchParams;
          const token = params.get("token");
          if (!token || !consumeNativeKakaoState(params.get("state"))) return;
          void signInWithCustomToken(auth, token)
            .then(() => router.replace("/"))
            .catch(() => undefined);
        }),
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.exitApp();
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          const url = notification.data?.url;
          if (typeof url === "string" && url.startsWith("/")) router.push(localizeAppPath(url));
        }),
      ]);
      if (cancelled) handles.forEach((handle) => void handle.remove());
      else cleanups.push(() => handles.forEach((handle) => void handle.remove()));
    })();
    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
