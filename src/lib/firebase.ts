import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

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
/*
 * Firebase Storage는 쓰지 않습니다 — 이 프로젝트는 무료 요금제라 Storage가
 * 막혀 있어서, 프로필 사진은 문서 안 data URL로, 나머지 사진은 Cloudinary로
 * 갑니다. 예전에는 여기서 getStorage()를 불러 export 해두었는데 아무도 쓰지
 * 않으면서 firebase/storage 뭉치(개발 모드 기준 136KB)만 매 화면에 딸려
 * 왔습니다. 다시 쓸 일이 생기면 그때 여기에 되살리면 됩니다.
 */

/** Google 로그인 제공자. 매번 계정을 고를 수 있도록 prompt를 지정합니다. */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * 웹 푸시 알림(FCM)을 쓸 수 있는 환경에서만 Messaging을 시작합니다.
 *
 * getMessaging()은 서비스워커·Notification·PushManager가 없는 환경(서버,
 * 옛 브라우저, 알림을 막은 iOS 사파리 등)에서 곧바로 오류를 던집니다.
 * 그래서 isSupported()로 먼저 확인하고, 안 되면 null을 돌려줍니다.
 * 결과는 한 번만 만들어 재사용합니다.
 */
let messagingPromise: Promise<Messaging | null> | null = null;
export function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (typeof window === "undefined" || !isFirebaseConfigured) return null;
      try {
        return (await isSupported()) ? getMessaging(app) : null;
      } catch {
        return null;
      }
    })();
  }
  return messagingPromise;
}

export default app;
