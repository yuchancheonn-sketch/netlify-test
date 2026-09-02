import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
