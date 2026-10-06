import type { NextConfig } from "next";

/**
 * 앱용 빌드 여부 — scripts/build-app.mjs가 NEXT_PUBLIC_APP_TARGET=native로 지정합니다(2026-10-06 사용자 요청 (구글 플레이 출시 준비)).
 * 앱용은 화면 파일을 정적으로 내보내(output: export) Capacitor 앱 안에 담습니다. 서버 창구(/api)는 앱에 담지 않고
 * https://aegiaeta.web.app 에 그대로 두고 부릅니다(src/lib/api.ts). 웹 배포는 이 값이 없어 예전과 똑같습니다.
 */
const isNativeBuild = process.env.NEXT_PUBLIC_APP_TARGET === "native";

/** 서버 창구(/api)를 부를 수 있는 출처 — 웹 사이트 자신과 앱 안 화면(Capacitor: https://localhost, capacitor://localhost, http://localhost). */
const API_ALLOWED_ORIGINS = [
  "https://aegiaeta.web.app",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
];

const nextConfig: NextConfig = {
  /**
   * 개발 서버(npm run dev:phone)를 휴대폰에서 열 때 필요한 설정입니다.
   *
   * Next.js는 개발용 자원(코드를 고치면 화면이 저절로 새로고침되는 기능 등)을
   * localhost 밖에서 요청하면 기본적으로 막습니다. 그래서 폰으로 접속하면
   * 화면은 떠도 수정한 내용이 저절로 반영되지 않습니다.
   *
   * 여기 적은 건 공유기가 나눠주는 집·사무실 안쪽 주소(사설 IP)뿐이고,
   * 이 설정은 개발 서버에만 적용됩니다. 배포본(Netlify)과는 아무 상관이 없습니다.
   * 공유기를 바꿔 IP 앞자리가 달라져도 되도록 세 대역을 모두 적어 둡니다.
   */
  allowedDevOrigins: ["192.168.*.*", "172.*.*.*", "10.*.*.*"],

  /**
   * 개발 서버가 화면 오른쪽 아래에 띄우는 검은 동그라미(N 표시)를 끕니다.
   *
   * 빌드 상태나 라우트 정보를 보여주는 Next.js 개발자 도구 버튼인데,
   * 폰으로 화면을 확인할 때 하단 탭바 위에 겹쳐 보여 방해가 됩니다.
   * 배포본에는 원래 나오지 않으므로, 이 설정은 개발 중 눈에만 영향을 줍니다.
   */
  devIndicators: false,

  ...(isNativeBuild
    ? { output: "export" as const, distDir: "app-dist", trailingSlash: true }
    : {
        /**
         * 앱(다른 출처)이 서버 창구를 부를 수 있게 허용합니다(CORS, 2026-10-06 사용자 요청 (구글 플레이 출시 준비)).
         * 창구는 쿠키가 아니라 Authorization 헤더(로그인 표)로만 본인을 확인합니다. 그래도 모든 출처("*")를 열지 않고
         * 위 목록에 있는 출처만 그대로 되돌려 줍니다(Origin 헤더를 봐서 같으면 그 값을 Access-Control-Allow-Origin에).
         */
        async headers() {
          return [
            {
              source: "/api/:path*",
              has: [{ type: "header", key: "origin", value: `(?<allowedOrigin>${API_ALLOWED_ORIGINS.map((o) => o.replace(/[.]/g, "\\.")).join("|")})` }],
              headers: [
                { key: "Access-Control-Allow-Origin", value: ":allowedOrigin" },
                { key: "Vary", value: "Origin" },
                { key: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,OPTIONS" },
                { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
                { key: "Access-Control-Max-Age", value: "86400" },
              ],
            },
          ];
        },
      }),

  images: {
    // 정적 내보내기는 이미지 최적화 서버가 없어 꺼야 합니다(앱 빌드에서만).
    ...(isNativeBuild ? { unoptimized: true } : {}),
    /**
     * 프로필 사진은 Google 계정(lh3.googleusercontent.com) 또는
     * Cloudinary(res.cloudinary.com — 직접 올린 사진, 2026-09-11부터)에서 옵니다.
     * Firebase Storage 두 줄은 예전 설정의 흔적입니다(이 프로젝트는 Storage를 쓰지 않습니다).
     * 이미지 최적화 비용을 아끼려고 Avatar 컴포넌트에서는 unoptimized로 쓰지만,
     * 호스트 검증은 여기 설정을 따르므로 함께 등록해 둡니다.
     */
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },
};

export default nextConfig;
