"use client";

import { useEffect } from "react";
import { followSystemTheme } from "@/lib/use-display-settings";

/**
 * 폰의 다크 모드를 앱이 따라가게 지키는 조각. 화면에는 아무것도 그리지 않습니다.
 *
 * 앱을 켜 둔 채로 폰에서 다크 모드를 켜거나 끄면(또는 폰이 시간에 맞춰 저절로
 * 바꾸면) 그 순간 앱에만 걸어둔 고정을 풀고 폰을 따라갑니다.
 *
 * 설정 화면이 열려 있을 때만 듣게 하면 안 되므로 앱 껍데기(layout)에 답니다.
 * 앱을 닫아둔 사이에 폰이 바뀐 경우는 화면이 그려지기 전에 도는 조각
 * 스크립트(DISPLAY_SETTINGS_SCRIPT)가 같은 일을 합니다.
 */
export default function ThemeSync() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", followSystemTheme);
    return () => query.removeEventListener("change", followSystemTheme);
  }, []);

  return null;
}
