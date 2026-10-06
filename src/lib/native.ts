import { Capacitor } from "@capacitor/core";

/** 구글 플레이(앱) 안에서 도는 중인지 — 웹·홈 화면 앱이면 false (2026-10-06 사용자 요청 (구글 플레이 출시 준비)). */
export const isNativeApp = () => Capacitor.isNativePlatform();
