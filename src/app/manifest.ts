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
     * 방향을 잠그지 않습니다 (2026-09-09에 "portrait"에서 바꿨습니다).
     *
     * 예전에는 홈 화면에 추가한 안드로이드 앱을 이 값으로 세로에 잠그고,
     * 브라우저 탭과 아이폰은 덮개로 막았습니다. 가로로 써도 앱이 망가지지
     * 않는데 미관 때문에 막아둔 것이었는데, 그 덮개가 자판이 올라온 세로
     * 화면에서도 잘못 떠서 없앴습니다(globals.css의 "세로가 짧을 때" 참고).
     *
     * 덮개를 없앤 이상 여기도 함께 풉니다. 안 그러면 안드로이드에 설치한
     * 원우만 못 눕히고 아이폰·브라우저는 눕혀지는, 사람마다 다르게 도는
     * 앱이 됩니다.
     */
    orientation: "any",
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
