"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  MONO_KEY,
  TEXT_SCALE_KEY,
  type DisplaySettings,
  type TextScale,
} from "@/lib/display-settings";

/*
 * 지금 값을 이 파일 안에 한 벌 들고 있습니다.
 *
 * 리액트가 화면을 그릴 때마다 <html>을 새로 읽으면, 읽을 때마다 새 객체가
 * 나와서 "값이 바뀌었다"고 오해하고 끝없이 다시 그립니다. 그래서 한 번만
 * 읽어 여기 담아두고, 설정을 바꿀 때만 갈아끼웁니다.
 */
let current: DisplaySettings | null = null;
const listeners = new Set<() => void>();

function snapshot(): DisplaySettings {
  if (!current) {
    const root = document.documentElement;
    const scale = root.getAttribute("data-text-scale");
    current = {
      textScale: scale === "small" || scale === "large" ? scale : "normal",
      mono: root.getAttribute("data-mono") === "on",
    };
  }
  return current;
}

/** 서버에는 브라우저 저장소가 없으니 기본값으로 그립니다. */
function serverSnapshot(): DisplaySettings {
  return DEFAULT_DISPLAY_SETTINGS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: DisplaySettings) {
  current = next;
  for (const listener of listeners) listener();
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
    update({ ...settings, textScale });
  }

  function setMono(mono: boolean) {
    const root = document.documentElement;
    if (mono) root.setAttribute("data-mono", "on");
    else root.removeAttribute("data-mono");

    save(MONO_KEY, mono ? "on" : "off");
    update({ ...settings, mono });
  }

  return { ...settings, setTextScale, setMono };
}
