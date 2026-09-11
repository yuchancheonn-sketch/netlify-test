/**
 * 서비스 계정 JSON(환경변수 FIREBASE_SERVICE_ACCOUNT, 한 줄)을 Admin SDK의 cert()에 넘길 모양으로 읽습니다.
 *
 * Next 서버(lib/firebase-admin.ts)와 Netlify 예약 함수(netlify/functions/feed-push.mts)가 함께 씁니다.
 *
 * ★ "server-only"를 붙이지 않습니다.
 *   예약 함수는 Next 밖에서(esbuild) 묶이는데, 그 표시는 Next만 풀 수 있어서 붙이면
 *   함수가 아예 묶이지 않습니다. 이 파일에는 비밀값이 없고 환경변수를 읽는 방법만 있지만,
 *   그래도 브라우저 코드에서는 부르지 마세요 — 서버에만 있는 환경변수를 읽습니다.
 */

export interface ServiceAccountCredential {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function parseServiceAccount(raw: string | undefined): ServiceAccountCredential | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    // 환경변수에 붙여넣을 때 줄바꿈이 \n 두 글자로 바뀌는 경우가 많아 되돌립니다.
    const privateKey =
      typeof parsed.private_key === "string" ? parsed.private_key.replace(/\\n/g, "\n") : "";
    if (!privateKey || !parsed.client_email || !parsed.project_id) return null;
    return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey };
  } catch {
    return null;
  }
}
