"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  THEME_KEY,
  TEXT_SCALE_KEY,
  type DisplaySettings,
  type ResolvedTheme,
  type TextScale,
  type Theme,
} from "@/lib/display-settings";

/*
 * 지금 값을 이 파일 안에 한 벌 들고 있습니다.
 *
 * 리액트가 화면을 그릴 때마다 <html>을 새로 읽으면, 읽을 때마다 새 객체가
 * 나와서 "값이 바뀌었다"고 오해하고 끝없이 다시 그립니다. 그래서 한 번만
 * 읽어 여기 담아두고, 설정을 바꿀 때만 갈아끼웁니다.
 */
type Snapshot = DisplaySettings & {
  /** 지금 실제로 눈에 보이는 밝기. theme이 "system"이면 폰 설정을 읽어 채웁니다. */
  resolved: ResolvedTheme;
};

let current: Snapshot | null = null;
const listeners = new Set<() => void>();

/** 폰이 다크 모드인지 알려주는 질의. 한 번만 만들어 재사용합니다. */
let darkQuery: MediaQueryList | null = null;
function prefersDark(): MediaQueryList {
  if (!darkQuery) darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  return darkQuery;
}

function snapshot(): Snapshot {
  if (!current) {
    const root = document.documentElement;
    const scale = root.getAttribute("data-text-scale");
    const marked = root.getAttribute("data-theme");
    // 표시가 없으면 아직 아무것도 고르지 않은 것 — 폰 설정을 따르는 중입니다.
    const theme: Theme = marked === "light" || marked === "dark" ? marked : "system";
    current = {
      textScale: scale === "small" || scale === "large" ? scale : "normal",
      theme,
      resolved: theme === "system" ? (prefersDark().matches ? "dark" : "light") : theme,
    };
  }
  return current;
}

/** 서버에는 브라우저 저장소가 없으니 기본값으로 그립니다. */
const SERVER_SNAPSHOT: Snapshot = { ...DEFAULT_DISPLAY_SETTINGS, resolved: "light" };
function serverSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function invalidate() {
  current = null;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  /*
   * 폰 설정이 바뀌는 것도 함께 듣습니다.
   *
   * 아직 아무것도 고르지 않았다면(=시스템) 폰에서 다크 모드를 켜는 순간
   * 화면은 CSS가 알아서 바꿔주지만, 설정 화면에서 어느 칸에 불이 켜져야
   * 하는지는 아무도 다시 계산해주지 않습니다. 그래서 여기서 듣고 있다가
   * 바뀌면 다시 읽게 합니다.
   */
  const query = prefersDark();
  query.addEventListener("change", invalidate);

  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", invalidate);
  };
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장만 못 할 뿐, 이번에 켜 둔 동안에는 고른 대로 보입니다.
  }
}

/**
 * 보기 설정을 읽고 바꾸는 훅. 설정 화면에서만 씁니다.
 *
 * 바꾸는 즉시 <html>의 표시를 갈아끼워 화면에 바로 반영하고,
 * localStorage에도 적어 다음에 열 때 그대로 나오게 합니다.
 */
export function useDisplaySettings() {
  const settings = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  function setTextScale(textScale: TextScale) {
    const root = document.documentElement;
    if (textScale === "normal") root.removeAttribute("data-text-scale");
    else root.setAttribute("data-text-scale", textScale);

    save(TEXT_SCALE_KEY, textScale);
    invalidate();
  }

  /**
   * 라이트·다크 중 하나로 고정합니다.
   *
   * 되돌리는 칸("시스템")은 화면에 두지 않았습니다. 한 번 고르면 그때부터
   * 이 기기에서는 그 밝기로 고정됩니다.
   */
  function setTheme(theme: ResolvedTheme) {
    document.documentElement.setAttribute("data-theme", theme);
    save(THEME_KEY, theme);
    invalidate();
  }

  return { ...settings, setTextScale, setTheme };
}
