import type { NextConfig } from "next";

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

  images: {
    /**
     * 프로필 사진은 Google 계정(lh3.googleusercontent.com) 또는
     * Firebase Storage에서 옵니다. 두 곳만 허용합니다.
     * 이미지 최적화 비용을 아끼려고 Avatar 컴포넌트에서는 unoptimized로 쓰지만,
     * 호스트 검증은 여기 설정을 따르므로 함께 등록해 둡니다.
     */
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },
};

export default nextConfig;
