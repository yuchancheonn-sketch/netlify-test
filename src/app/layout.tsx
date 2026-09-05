import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE, BRAND_BACKGROUND, BRAND_COLOR } from "@/lib/constants";
import { DISPLAY_SETTINGS_SCRIPT } from "@/lib/display-settings";

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

/**
 * 명조체(세리프). 애기애타의 뜻처럼 붓글씨 느낌이 어울리는 문구에 씁니다.
 * 서예 로고와 결이 맞아 격식 있는 인상을 줍니다.
 */
const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600"],
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
    /*
     * suppressHydrationWarning: 아래 조각 스크립트가 리액트보다 먼저 <html>에
     * data-text-scale·data-mono를 붙입니다. 그러면 서버가 보낸 html 태그와
     * 브라우저의 html 태그가 달라져서 리액트가 "안 맞는다"고 경고합니다.
     * 우리가 일부러 붙인 것이니 이 태그에 한해 눈감아 달라고 알려둡니다.
     */
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full font-sans"
        style={{ backgroundColor: BRAND_BACKGROUND }}
      >
        {/*
          보기 설정(글씨 크기·흑백)을 화면이 그려지기 전에 적용합니다.
          리액트가 켜진 뒤에 적용하면 보통 크기로 한 번 그려졌다가 바뀌면서
          화면이 번쩍입니다.

          <head>에 넣지 않고 본문 맨 앞에 두는 이유: App Router에서는 Next가
          <head>를 직접 관리해서, 우리가 <head>를 그리면 하이드레이션이 어긋납니다.
          여기 두어도 아래 내용보다 먼저 실행되므로 번쩍임은 똑같이 막힙니다.

          우리가 쓴 글이라 밖에서 들어온 값이 섞이지 않습니다.
        */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_SETTINGS_SCRIPT }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
