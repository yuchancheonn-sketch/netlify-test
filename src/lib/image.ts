/**
 * 이미지 업로드 전 클라이언트에서 크기를 줄이는 유틸.
 * Storage 사용량과 로딩 속도를 아끼기 위해 원본을 그대로 올리지 않습니다.
 */

/** File을 브라우저가 그릴 수 있는 이미지 객체로 읽어들입니다. */
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
      image.src = url;
    });
    return image;
  } finally {
    // 이미지가 로드된 뒤에는 objectURL을 붙잡고 있을 필요가 없습니다.
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지를 변환하지 못했어요."))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * 프로필 사진용: 가운데를 기준으로 정사각형으로 잘라내고 지정한 크기로 줄입니다.
 * 짧은 변에 맞춰 잘라내기 때문에 인물이 가운데 있으면 자연스럽게 담깁니다.
 */
export async function cropToSquare(file: File, size: number): Promise<Blob> {
  const canvas = await drawSquare(file, size);
  return toBlob(canvas, 0.9);
}

/** 원본을 가운데 정사각형으로 잘라 캔버스에 그립니다. */
async function drawSquare(file: File, size: number): Promise<HTMLCanvasElement> {
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - side) / 2;
  const sourceY = (image.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 편집할 수 없는 브라우저예요.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
  return canvas;
}

/**
 * 프로필 사진을 Firestore에 그대로 담을 수 있는 문자열(data URL)로 만듭니다.
 *
 * Firebase Storage는 2024년 9월 이후 만든 프로젝트에서 유료(Blaze) 요금제를
 * 요구하기 때문에, 비용 없이 운영하려고 사진을 작게 줄여 Firestore에 넣습니다.
 * 화질을 조금씩 낮춰가며 maxBytes 안에 들어오는 가장 좋은 화질을 고릅니다.
 */
export async function cropToSquareDataUrl(
  file: File,
  size: number,
  maxBytes: number,
): Promise<string> {
  const canvas = await drawSquare(file, size);

  for (const quality of [0.82, 0.72, 0.62, 0.5, 0.4]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    // data URL은 문자 하나가 1바이트라 길이가 곧 크기입니다.
    if (dataUrl.length <= maxBytes) return dataUrl;
  }

  // 그래도 크면 사진 자체를 한 단계 더 줄여서 다시 시도합니다.
  const smaller = document.createElement("canvas");
  smaller.width = Math.round(size / 1.5);
  smaller.height = Math.round(size / 1.5);
  const context = smaller.getContext("2d");
  if (!context) throw new Error("이미지를 편집할 수 없는 브라우저예요.");
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, smaller.width, smaller.height);

  const dataUrl = smaller.toDataURL("image/jpeg", 0.6);
  if (dataUrl.length > maxBytes) {
    throw new Error("사진 용량이 너무 커요. 다른 사진으로 시도해 주세요.");
  }
  return dataUrl;
}

/**
 * 일반 사진용: 가로세로 비율은 유지하면서 긴 변이 maxSize를 넘지 않도록 줄입니다.
 * (채팅 이미지 첨부·행사 사진 업로드에서 사용)
 */
export async function resizeImage(file: File, maxSize: number): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 편집할 수 없는 브라우저예요.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return toBlob(canvas, 0.82);
}
