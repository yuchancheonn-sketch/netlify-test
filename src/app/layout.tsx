import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/lib/auth-context";
import { APP_NAME, APP_SHORT_NAME, APP_TAGLINE, BRAND_COLOR } from "@/lib/constants";
import { DISPLAY_SETTINGS_SCRIPT } from "@/lib/display-settings";

/**
 * 한글 가독성이 좋은 Noto Sans KR을 씁니다.
 * next/font가 폰트를 직접 호스팅해 주므로 외부 CDN 요청이 생기지 않습니다.
 * (Pretendard로 바꾸고 싶다면 README의 "폰트 바꾸기" 항목을 참고하세요.)
 */
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  // 600은 2026-09-25에 더함 — 모임 카드 제목을 700보다 "아주아주 조금만 더 얇게"(사용자 요청). 없으면 600이 700으로 그려집니다.
  weight: ["400", "500", "600", "700", "900"],
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
    // 아이폰 홈 화면 아이콘 아래 이름 — manifest의 short_name과 맞춥니다.
    title: APP_SHORT_NAME,
    /*
     * black-translucent — 홈 화면에 추가한 아이폰 앱이 상태바(시계·배터리 줄) 뒤까지 그립니다 (2026-09-26 사용자 "시도해봐").
     * 시트를 열 때 까는 어두운 막이 상태바까지 덮어, 그 줄만 흰 띠로 남던 것을 없애려는 것입니다.
     * ★ 대가: 상태바 글씨(시계·배터리)가 늘 흰색입니다 — 밝은 화면 위에서는 잘 안 보일 수 있습니다.
     *   되돌리려면 "default"(앱이 상태바 아래부터 그림, 상태바는 흰 띠 + 검은 글씨).
     * 상태바 높이만큼은 제목 줄(.page-header)·로그인·대화방 등이 env(safe-area-inset-top)으로 비워 둡니다.
     */
    statusBarStyle: "black-translucent",
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
     * data-text-scale·data-theme을 붙입니다. 그러면 서버가 보낸 html 태그와
     * 브라우저의 html 태그가 달라져서 리액트가 "안 맞는다"고 경고합니다.
     * 우리가 일부러 붙인 것이니 이 태그에 한해 눈감아 달라고 알려둡니다.
     */
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        배경색은 globals.css의 body 규칙(var(--color-canvas))이 정합니다.
        예전에는 여기에 인라인 style로 밝은 회색을 박아두었는데, 인라인은
        CSS를 이기기 때문에 어두운 화면에서도 배경만 밝은 채로 남았습니다.
      */}
      {/*
        suppressHydrationWarning (2026-09-24): 카카오톡 안 브라우저(아이폰)가 리액트보다 먼저 <body>에
        style="-webkit-text-size-adjust:100%"를 붙여서, 카톡에서 링크를 열면 개발 서버에 하이드레이션 경고가 떴습니다.
        우리 코드가 아니라 카톡이 붙인 것이라 이 태그의 속성 차이만 눈감습니다(안쪽 내용은 그대로 검사됩니다).
      */}
      <body className="min-h-full font-sans" suppressHydrationWarning>
        {/*
          보기 설정(글씨 크기·화면 밝기)을 화면이 그려지기 전에 적용합니다.
          리액트가 켜진 뒤에 적용하면 보통 크기로 한 번 그려졌다가 바뀌면서
          화면이 번쩍입니다.

          <head>에 넣지 않고 본문 맨 앞에 두는 이유: App Router에서는 Next가
          <head>를 직접 관리해서, 우리가 <head>를 그리면 하이드레이션이 어긋납니다.
          여기 두어도 아래 내용보다 먼저 실행되므로 번쩍임은 똑같이 막힙니다.

          우리가 쓴 글이라 밖에서 들어온 값이 섞이지 않습니다.
        */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_SETTINGS_SCRIPT }} />
        {/* 앱을 켜 둔 채로 폰의 다크 모드가 바뀌면 그때도 따라가게 합니다. */}
        <ThemeSync />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
