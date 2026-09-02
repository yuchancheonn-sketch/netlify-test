import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE, BRAND_BACKGROUND, BRAND_COLOR } from "@/lib/constants";

/**
 * 한글 가독성이 좋은 Noto Sans KR을 씁니다.
 * next/font가 폰트를 직접 호스팅해 주므로 외부 CDN 요청이 생기지 않습니다.
 * (Pretendard로 바꾸고 싶다면 README의 "폰트 바꾸기" 항목을 참고하세요.)
 */
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS에서 "홈 화면에 추가"를 했을 때 쓰이는 아이콘
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // 비공개 커뮤니티이므로 검색엔진에 노출되지 않게 합니다.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
  // 홈 화면에 추가했을 때 노치·홈 인디케이터 영역까지 화면을 씁니다.
  viewportFit: "cover",
  // 키보드가 올라올 때 화면 자체를 줄여서, 채팅 입력창이 키보드에 가리지 않게 합니다.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body
        className="min-h-full font-sans"
        style={{ backgroundColor: BRAND_BACKGROUND }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
