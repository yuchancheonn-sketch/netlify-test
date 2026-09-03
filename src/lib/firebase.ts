import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Firebase 설정값은 .env.local 에서 읽어옵니다.
 * NEXT_PUBLIC_ 접두사가 붙은 값은 브라우저에 그대로 노출되지만,
 * Firebase 웹 설정값은 원래 공개되는 값이라 문제되지 않습니다.
 * 실제 접근 제어는 Firestore/Storage 보안 규칙이 담당합니다.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** .env.local 을 채우지 않았을 때 원인을 빨리 알아차리기 위한 확인용 플래그 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/**
 * 설정값이 비어 있으면 getAuth()가 즉시 오류를 던져 빌드까지 멈춥니다.
 * 그러면 "설정이 필요해요" 안내 화면조차 띄울 수 없으므로,
 * 값이 없을 때는 형식만 맞는 임시값을 넣어 초기화만 통과시킵니다.
 * 실제 통신은 isFirebaseConfigured가 false인 동안 일어나지 않습니다.
 */
const safeConfig: FirebaseOptions = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: "firebase-config-missing",
      authDomain: "firebase-config-missing.firebaseapp.com",
      projectId: "firebase-config-missing",
      storageBucket: "firebase-config-missing.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    };

// Next.js 개발 모드에서는 모듈이 여러 번 평가될 수 있어 중복 초기화를 막습니다.
const app = getApps().length ? getApp() : initializeApp(safeConfig);

/**
 * Firestore를 시작합니다. 브라우저에서는 오프라인 캐시를 켭니다.
 *
 * 캐시를 켜면 받아온 문서가 기기에 남습니다. 앱을 다시 열 때 목록을 처음부터
 * 다시 받지 않고 "그 사이 바뀐 것"만 받아오기 때문에,
 *  - 무료 한도(하루 읽기 5만 건, 월 전송량 10GiB)를 훨씬 덜 씁니다.
 *    원우수첩처럼 좀처럼 바뀌지 않는 목록에서 특히 크게 아낍니다.
 *  - 지하철처럼 신호가 약한 곳에서도 화면이 곧바로 뜨고, 잠시 끊겨도
 *    보던 내용이 그대로 남습니다.
 *
 * 탭을 여러 개 열어도 캐시를 함께 쓰도록 multipleTab 방식을 씁니다.
 * 사생활 보호 모드처럼 IndexedDB를 쓸 수 없는 환경에서는 조용히
 * 캐시 없는 방식으로 돌아갑니다. (동작은 예전과 같고 한도만 더 씁니다)
 */
function createDb(): Firestore {
  // 서버(빌드·사전 렌더링)에는 브라우저 저장소가 없습니다.
  if (typeof window === "undefined") return getFirestore(app);

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // 이미 시작되었거나(개발 모드에서 모듈 재평가) 캐시를 쓸 수 없는 환경입니다.
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = createDb();
export const storage = getStorage(app);

/** Google 로그인 제공자. 매번 계정을 고를 수 있도록 prompt를 지정합니다. */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
