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

  /**
   * 개발 서버가 화면 오른쪽 아래에 띄우는 검은 동그라미(N 표시)를 끕니다.
   *
   * 빌드 상태나 라우트 정보를 보여주는 Next.js 개발자 도구 버튼인데,
   * 폰으로 화면을 확인할 때 하단 탭바 위에 겹쳐 보여 방해가 됩니다.
   * 배포본에는 원래 나오지 않으므로, 이 설정은 개발 중 눈에만 영향을 줍니다.
   */
  devIndicators: false,

  images: {
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
