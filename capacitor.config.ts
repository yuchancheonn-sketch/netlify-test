import type { CapacitorConfig } from "@capacitor/cli";

/**
 * 앱(Capacitor) 설정 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱 capacitor.config.ts를 옮김).
 *  - appId는 구글 플레이에 올린 뒤에는 바꿀 수 없습니다. app.web.aegiaeta 는 사용자 확정(2026-10-06 — aegiaeta.web.app을 거꾸로 쓴 관례 이름).
 *    바꾸면 Firebase 안드로이드 앱 등록·google-services.json·assetlinks도 같이 바꿔야 합니다.
 *  - webDir: `npm run build:app` 이 만드는 정적 화면 파일(app-dist). 서버 창구는 앱에 담지 않고 https://aegiaeta.web.app 을 부릅니다.
 *  - androidScheme https: 앱 안 화면의 주소를 https://localhost 로 해서 쿠키·저장소·보안 기능이 웹과 같게 동작하게 합니다.
 *  - 색: 시작 화면·바탕은 주황(BRAND_COLOR #FD5702), 화면 바탕은 회색(BRAND_BACKGROUND #ECECEB, src/lib/constants.ts와 같아야 함).
 */
const config: CapacitorConfig = {
  appId: "app.web.aegiaeta",
  appName: "애기애타",
  webDir: "app-dist",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#ECECEB" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#FD5702" },
    StatusBar: { backgroundColor: "#ECECEB", style: "LIGHT" },
    Keyboard: { resize: "body" },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ["google.com", "phone"] },
  },
};

export default config;
