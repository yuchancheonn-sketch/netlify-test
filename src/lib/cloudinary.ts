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
 */
export function downloadUrl(url: string): string {
  return url.replace("/upload/", "/upload/fl_attachment/");
}
