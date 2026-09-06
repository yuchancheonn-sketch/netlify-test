import type { MetadataRoute } from "next";
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_TAGLINE,
  BRAND_BACKGROUND,
  BRAND_COLOR,
} from "@/lib/constants";

/**
 * 모바일 브라우저에서 "홈 화면에 추가"를 했을 때 앱처럼 보이게 하는 설정입니다.
 * 아이콘은 `npm run icons`로 public/ 아래에 만들어 둔 PNG를 씁니다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    /*
     * 홈 화면에 추가한 안드로이드 앱은 이 값 하나로 세로에 잠깁니다.
     * 다만 브라우저 탭과 아이폰에는 듣지 않아서, 거기서는 눕혔을 때
     * 덮개(components/PortraitGuard.tsx)가 대신 막습니다.
     */
    orientation: "portrait",
    lang: "ko",
    background_color: BRAND_BACKGROUND,
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
