/**
 * 행사 사진 보관소 (Cloudinary)
 * ------------------------------------------------------------------
 * Firebase Storage는 2024년 9월 이후 만든 프로젝트에서 유료 요금제를 요구해서,
 * 카드 등록 없이 쓸 수 있는 Cloudinary 무료 플랜을 사진 보관소로 씁니다.
 *
 * "서명 없는 업로드(unsigned upload)" 방식이라 브라우저에서 바로 올릴 수 있고
 * 비밀 키를 앱에 넣을 필요가 없습니다. 대신 아래 두 값이 필요합니다.
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 *
 * 사진 주소는 추측할 수 없는 임의 문자열로 만들어지므로, 앱 밖으로 주소가
 * 새지 않는 한 다른 사람이 찾아볼 수 없습니다.
 * (Firebase Storage의 다운로드 주소도 같은 방식으로 보호됩니다.)
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** 설정이 채워졌는지. 안 채워졌으면 사진 탭에서 안내 문구를 보여줍니다. */
export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export interface UploadedImage {
  /** 원본 이미지 주소 */
  url: string;
  /** Cloudinary 안에서의 식별자 (나중에 정리할 때 필요) */
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * 사진 한 장을 올립니다.
 * 화면이 멈춘 것처럼 보이지 않도록 진행률을 알려주는 콜백을 받습니다.
 */
export function uploadImage(
  file: Blob,
  fileName: string,
  onProgress?: (ratio: number) => void,
): Promise<UploadedImage> {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error("사진 보관소 설정이 아직 안 되어 있어요."));
  }

  const form = new FormData();
  form.append("file", file, fileName);
  form.append("upload_preset", UPLOAD_PRESET as string);

  /*
   * fetch에는 업로드 진행률을 알려주는 기능이 없어서 XMLHttpRequest를 씁니다.
   * 사진 여러 장을 올릴 때 진행 상황이 보이는 편이 훨씬 안심됩니다.
   */
  return new Promise<UploadedImage>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("사진을 올리지 못했어요."));
        return;
      }
      try {
        const data = JSON.parse(request.responseText);
        resolve({
          url: data.secure_url as string,
          publicId: data.public_id as string,
          width: data.width as number,
          height: data.height as number,
          bytes: data.bytes as number,
        });
      } catch {
        reject(new Error("사진을 올리지 못했어요."));
      }
    };

    request.onerror = () => reject(new Error("네트워크 문제로 사진을 올리지 못했어요."));
    request.ontimeout = () => reject(new Error("업로드가 너무 오래 걸려요. 다시 시도해 주세요."));
    request.send(form);
  });
}

export interface UploadedFile {
  url: string;
  publicId: string;
  /** 확장자. Cloudinary가 안 알려주면 파일 이름에서 뽑습니다. */
  format: string;
  bytes: number;
}

/** 파일 이름 끝의 확장자. 없으면 빈 글자. */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/**
 * 문서 파일 한 개를 올립니다 (PDF·한글·엑셀 등).
 *
 * ★ 사진과 주소가 다릅니다 — `/auto/upload`입니다.
 *   사진은 `/image/upload`로 올리는데, 그 길로 PDF나 한글 파일을 보내면
 *   Cloudinary가 "이미지가 아니다"라며 거절합니다. auto는 받은 것을 보고
 *   사진이면 image로, 아니면 raw로 알아서 갈라 담습니다.
 *
 * ★ Cloudinary 콘솔에서 업로드 프리셋의 resource type을 'auto'로 두어야 합니다.
 *   'image'로 묶여 있으면 이 길로 보내도 문서 파일이 거절당합니다.
 *   (이것만은 앱에서 못 하고 사람이 콘솔에서 해야 합니다.)
 */
export function uploadFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<UploadedFile> {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error("자료 보관소 설정이 아직 안 되어 있어요."));
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("upload_preset", UPLOAD_PRESET as string);

  return new Promise<UploadedFile>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        /*
         * 가장 흔한 실패는 업로드 프리셋이 'image'로 묶여 있는 경우입니다.
         * 영어 원문을 그대로 보여주면 무슨 말인지 알 수 없어서 갈아 끼웁니다.
         */
        reject(new Error("파일을 올리지 못했어요. 보관소 설정을 확인해 주세요."));
        return;
      }
      try {
        const data = JSON.parse(request.responseText);
        resolve({
          url: data.secure_url as string,
          publicId: data.public_id as string,
          format: (data.format as string) || extensionOf(file.name),
          bytes: data.bytes as number,
        });
      } catch {
        reject(new Error("파일을 올리지 못했어요."));
      }
    };

    request.onerror = () => reject(new Error("네트워크 문제로 파일을 올리지 못했어요."));
    request.ontimeout = () => reject(new Error("업로드가 너무 오래 걸려요. 다시 시도해 주세요."));
    request.send(form);
  });
}

/**
 * 자료 탭 파일 목록에 깔 미리보기 그림. 만들 수 없는 파일이면 null.
 *
 * ★ 되는 것과 안 되는 것이 주소로 갈립니다.
 *   Cloudinary는 올라온 것을 보고 image와 raw로 나눠 담습니다(/auto/upload).
 *   **PDF와 사진은 image**로 들어가고, 그러면 첫 장을 그림으로 구워 줍니다.
 *   한글·엑셀·워드·압축 파일은 raw라 그림을 만들 방법이 없어 null입니다
 *   (화면에서는 확장자 배지를 대신 깝니다).
 *
 * pg_1은 "첫 장만". 없으면 여러 장짜리 PDF에서 엉뚱한 장이 나올 수 있습니다.
 * c_fit은 잘라내지 않고 상자 안에 통째로 넣습니다 — 문서는 가장자리가 잘리면
 * 무슨 문서인지 알아보기 어렵습니다(사진 썸네일이 쓰는 c_fill과 다른 점입니다).
 * f_jpg로 못 박는 이유는, 문서 첫 장은 흰 바탕이 대부분이라 png보다 훨씬 가볍기
 * 때문입니다.
 *
 * ※ 원본 PDF 자체를 내려받는 것은 **계정 설정에 따라 막혀 있을 수 있습니다**
 *   (Cloudinary 무료 플랜은 기본이 차단이고 401이 납니다). 그때도 여기서 만든
 *   변환본은 정상으로 내려옵니다 — 막히는 것은 원본 전송뿐입니다.
 */
export function fileThumbnailUrl(url: string, size = 500): string | null {
  if (!url.includes("/image/upload/")) return null;
  return url.replace(
    "/image/upload/",
    `/image/upload/c_fit,w_${size},h_${size},pg_1,q_auto,f_jpg/`,
  );
}

/**
 * 목록에 쓸 작은 이미지 주소를 만듭니다.
 * Cloudinary는 주소 중간에 변환 옵션을 끼워 넣으면 그 크기로 잘라서 내려줍니다.
 * 원본을 그대로 받지 않으므로 목록이 훨씬 빨리 뜨고 데이터도 아낍니다.
 *
 * c_fill: 지정한 비율로 꽉 채워 자르기 / g_auto: 중요한 부분을 알아서 남기기
 * q_auto: 화질 자동 / f_auto: 브라우저가 지원하는 최신 포맷으로 자동 변환
 */
export function thumbnailUrl(url: string, size = 400): string {
  return url.replace("/upload/", `/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

/** 전체화면 뷰어용. 비율은 유지하면서 너무 큰 원본만 줄여서 받습니다. */
export function viewerUrl(url: string, maxSize = 1600): string {
  return url.replace("/upload/", `/upload/c_limit,w_${maxSize},h_${maxSize},q_auto,f_auto/`);
}

/**
 * 원본 저장용 주소.
 * fl_attachment를 붙이면 브라우저에서 열리지 않고 곧바로 내려받아집니다.
 * (다른 도메인의 이미지는 a 태그의 download 속성이 통하지 않아 이 방법을 씁니다.)
 *
 * ★ 아이폰에는 이 주소를 주지 마세요 — saveUrl()을 쓰세요.
 *   이 주소는 Content-Disposition: attachment를 달고 내려오는데, 홈 화면 앱에서 연 아이폰 브라우저는
 *   첨부 파일을 그리지 못해 주소창만 뜬 **흰 화면**에서 멈춥니다(2026-09-09 PDF, 2026-09-11 워드 파일에서 확인).
 */
export function downloadUrl(url: string): string {
  return url.replace("/upload/", "/upload/fl_attachment/");
}

/**
 * 아이폰·아이패드인지. 아이패드는 요즘 "Mac"이라고 스스로를 소개해서, 손가락 입력이 되는지로 한 번 더 봅니다.
 * 누르는 순간에만 부르세요(렌더 중에 부르면 서버 화면과 어긋납니다).
 */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

/**
 * "받기·저장"을 눌렀을 때 열 주소 (2026-09-11).
 *
 *  - 아이폰: 원본 주소 그대로. 아이폰 브라우저가 문서·사진을 미리보기로 열어 주고,
 *    공유 단추에서 "파일에 저장"·"이미지 저장"으로 받습니다. 첨부 주소를 주면 흰 화면에서 멈춥니다.
 *  - 그 밖(안드로이드·컴퓨터): fl_attachment 주소로 곧바로 내려받습니다.
 */
export function saveUrl(url: string): string {
  return isIosDevice() ? url : downloadUrl(url);
}
