/**
 * 웹 푸시 알림용 서비스워커를 `/firebase-messaging-sw.js` 로 내려주는 창구.
 *
 * 왜 정적 파일(public/)이 아니라 라우트인가 ─────────────────────
 * 이 서비스워커는 안에서 firebase.initializeApp(설정)을 불러야 하는데,
 * 그 설정값은 .env.local 에만 있고 저장소에는 없습니다. public/ 에 두면
 * 값을 파일에 박아 커밋해야 합니다. 라우트로 두면 빌드할 때 환경변수를
 * 읽어 넣을 수 있어, 설정이 한 곳(env)에만 남습니다.
 *
 * force-static 이라 빌드 시점에 한 번 만들어지고, 그 뒤로는 Netlify가
 * 정적 파일처럼 돌려줍니다 — 화면을 열 때마다 함수가 도는 일이 없습니다.
 *
 * 서비스워커 안에서는 npm 모듈을 못 쓰므로, 브라우저용으로 미리 묶인
 * compat 빌드를 gstatic 에서 importScripts 로 불러옵니다. (FCM 표준 방식)
 */

export const dynamic = "force-static";

const FIREBASE_SDK_VERSION = "10.14.1";

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const body = `/* 이 파일은 src/app/firebase-messaging-sw.js/route.ts 가 만들어 냅니다. */
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

/*
 * 서버는 notification 없이 data 만 담아 보냅니다. 그래야 브라우저가 제멋대로
 * 띄우지 않고, 아래에서 제목·아이콘·묶음(tag)까지 우리가 정한 대로 보입니다.
 */
messaging.onBackgroundMessage((payload) => {
  const d = (payload && payload.data) || {};
  const title = d.title || "애기애타 10기";
  self.registration.showNotification(title, {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag || undefined,
    renotify: true,
    data: { url: d.url || "/" },
  });
});

/* 알림을 누르면 이미 열린 앱 창을 그 화면으로 옮기고, 없으면 새로 엽니다. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      for (const client of list) {
        if ("navigate" in client && "focus" in client) {
          return client.navigate(target).then(() => client.focus());
        }
      }
      return clients.openWindow(target);
    }),
  );
});
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
