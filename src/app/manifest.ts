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
