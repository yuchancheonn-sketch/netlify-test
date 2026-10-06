/**
 * 앱 안 주소 만들기 (2026-10-06 사용자 요청 (구글 플레이 출시 준비)).
 * 앱용 빌드(scripts/build-app.mjs, NEXT_PUBLIC_APP_TARGET=native)는 화면 파일을 앱에 담는 정적 파일이라
 * 방 id·앨범 id처럼 미리 알 수 없는 값을 주소 경로에 넣을 수 없습니다 — 그래서 앱에서는 쿼리(?id=)를 씁니다.
 * 웹은 예전 주소 그대로입니다. 쿼리로 받는 화면은 chat/room, albums/view, news/week/view, events/edit 입니다.
 */
export const IS_NATIVE_BUILD = process.env.NEXT_PUBLIC_APP_TARGET === "native";

export function chatHref(roomId: string): string {
  return IS_NATIVE_BUILD ? `/chat/room?id=${encodeURIComponent(roomId)}` : `/chat/${roomId}`;
}

export function albumHref(albumId: string): string {
  return IS_NATIVE_BUILD ? `/albums/view?id=${encodeURIComponent(albumId)}` : `/albums/${albumId}`;
}

export function weekNewsHref(weekId: string): string {
  return IS_NATIVE_BUILD ? `/news/week/view?id=${encodeURIComponent(weekId)}` : `/news/week/${weekId}`;
}

export function eventEditHref(eventId: string): string {
  return IS_NATIVE_BUILD ? `/events/edit?id=${encodeURIComponent(eventId)}` : `/events/${eventId}/edit`;
}

/** 서버가 보낸 알림 주소("/chat/abc__xyz" 등)를 이 빌드에서 열 수 있는 주소로 바꿉니다. */
export function localizeAppPath(path: string): string {
  if (!IS_NATIVE_BUILD) return path;
  const chat = path.match(/^\/chat\/([^/?#]+)$/);
  if (chat) return chatHref(decodeURIComponent(chat[1]));
  const album = path.match(/^\/albums\/([^/?#]+)$/);
  if (album) return albumHref(decodeURIComponent(album[1]));
  const week = path.match(/^\/news\/week\/([^/?#]+)$/);
  if (week) return weekNewsHref(decodeURIComponent(week[1]));
  const edit = path.match(/^\/events\/([^/?#]+)\/edit$/);
  if (edit) return eventEditHref(decodeURIComponent(edit[1]));
  return path;
}
