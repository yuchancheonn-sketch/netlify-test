/**
 * 원우가 붙여넣은 영상 주소를 다루는 함수 모음.
 *
 * 유튜브 주소는 형태가 여러 가지라(youtu.be, watch?v=, /embed/, /shorts/)
 * 어느 것을 넣어도 알아보도록 했습니다.
 */

export interface VideoLink {
  kind: "youtube" | "vimeo" | "other";
  /** 유튜브·비메오의 영상 ID. 알아내지 못하면 null */
  id: string | null;
  /** 원우가 입력한 원래 주소 */
  url: string;
}

/** 유튜브 영상 ID를 뽑아냅니다. 못 찾으면 null. */
function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }
  return null;
}

/** 비메오 영상 ID */
function vimeoId(url: string): string | null {
  const match = /vimeo\.com\/(?:video\/)?(\d{6,})/.exec(url);
  return match ? match[1] : null;
}

/** 주소를 뜯어봅니다. 빈 값이거나 주소가 아니면 null. */
export function parseVideoLink(raw: string): VideoLink | null {
  const url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  const youtube = youtubeId(url);
  if (youtube) return { kind: "youtube", id: youtube, url };

  const vimeo = vimeoId(url);
  if (vimeo) return { kind: "vimeo", id: vimeo, url };

  return { kind: "other", id: null, url };
}

/**
 * 목록에 보여줄 미리보기 이미지. 유튜브만 주소만으로 만들 수 있습니다.
 *
 * ★ 이 그림을 담는 상자는 반드시 16:9여야 합니다. (object-cover와 함께)
 *
 *   hqdefault는 480×360(4:3) 판인데, 16:9 영상은 그 안에 480×270으로 들어가고
 *   위아래 45px씩은 검은 띠입니다. 띠가 그림에 박혀 있어서 잘라내는 수밖에
 *   없는데, 상자가 정확히 16:9이면 object-cover가 잘라내는 양이 마침 그 45px과
 *   딱 맞아떨어져 띠가 남김없이 사라집니다.
 *
 *   상자 비율이 16:9에서 벗어나면 그만큼 띠가 남습니다. (원우 목록의 상자가
 *   86×62였을 때 위아래로 검은 줄이 보이던 이유입니다.)
 *
 *   16:9로 나오는 mqdefault(320×180)를 쓰면 비율과 무관하게 띠가 없지만,
 *   가로 320px뿐이라 조금만 크게 깔아도 흐릿합니다. 그래서 해상도가 나은
 *   hqdefault를 두고 상자 비율로 푸는 쪽을 택했습니다.
 */
export function videoThumbnail(link: VideoLink): string | null {
  if (link.kind === "youtube" && link.id) {
    return `https://img.youtube.com/vi/${link.id}/hqdefault.jpg`;
  }
  return null;
}

/**
 * 앱 안에서 바로 재생할 주소.
 * 재생 버튼을 누른 뒤에만 불러오도록 해서, 프로필을 열 때마다
 * 유튜브 스크립트가 따라오지 않게 합니다.
 */
export function videoEmbedUrl(link: VideoLink): string | null {
  if (link.kind === "youtube" && link.id) {
    // nocookie 도메인은 재생 전까지 추적 쿠키를 심지 않습니다.
    return `https://www.youtube-nocookie.com/embed/${link.id}?autoplay=1&rel=0`;
  }
  if (link.kind === "vimeo" && link.id) {
    return `https://player.vimeo.com/video/${link.id}?autoplay=1`;
  }
  return null;
}

/** 입력값이 쓸 만한 영상 주소인지 (폼 검사용) */
export function isSupportedVideoUrl(raw: string): boolean {
  const link = parseVideoLink(raw);
  return link !== null && link.id !== null;
}
