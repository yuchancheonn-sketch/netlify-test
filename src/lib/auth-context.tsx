"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";

/**
 * 로그인 이후 사용자가 어느 단계에 있는지 나타내는 값.
 * 화면 접근 제어(RouteGuard)가 이 값 하나만 보고 어디로 보낼지 결정합니다.
 */
export type AuthStage =
  /** 아직 확인 중 */
  | "loading"
  /** 로그인 안 함 */
  | "signedOut"
  /** 로그인은 했지만 초대 코드를 아직 입력하지 않음 */
  | "needsInviteCode"
  /** 가입 신청은 했지만 운영진 승인 대기 중 */
  | "pending"
  /** 승인은 받았지만 최초 프로필 설정을 아직 하지 않음 */
  | "needsOnboarding"
  /** 앱을 자유롭게 쓸 수 있는 상태 */
  | "ready";

interface AuthContextValue {
  /** Firebase Authentication 사용자 (Google 계정 정보) */
  user: User | null;
  /** Firestore users/{uid} 문서. 아직 가입 전이면 null */
  profile: UserDoc | null;
  stage: AuthStage;
  /** 운영진 여부 */
  isAdmin: boolean;
  /** 로그인·가입 과정에서 생긴 오류 메시지 (한국어) */
  authError: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 로그인 실패 원인을 원우가 읽고 이해할 수 있는 문장으로 바꿉니다.
 *
 * 설정이 덜 된 경우("승인된 도메인" 미등록 등)에는 원우가 아무리 다시 눌러도
 * 똑같이 실패하므로, 운영진이 무엇을 고쳐야 하는지 알 수 있게 적어줍니다.
 */
function signInErrorMessage(code: string): string {
  switch (code) {
    case "auth/unauthorized-domain":
      return "이 주소에서는 아직 로그인할 수 없어요. 운영진에게 알려주세요. (Firebase 승인된 도메인에 이 주소를 추가해야 합니다)";
    case "auth/operation-not-allowed":
      return "Google 로그인이 아직 켜져 있지 않아요. 운영진에게 알려주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인하고 다시 시도해 주세요.";
    case "auth/too-many-requests":
      return "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid-please-pass-a-valid-api-key":
      return "앱 설정이 잘못되어 있어요. 운영진에게 알려주세요.";
    default:
      return code
        ? `로그인에 실패했어요. 다시 시도해도 안 되면 운영진에게 이 내용을 알려주세요. (${code})`
        : "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
  }
}

/** 구독해서 받아온 프로필. 어느 계정의 것인지 함께 들고 있어야 계정 전환 시 헷갈리지 않습니다. */
interface ProfileEntry {
  uid: string;
  doc: UserDoc | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileEntry, setProfileEntry] = useState<ProfileEntry | null>(null);
  // Firebase 설정이 없으면 확인할 것이 없으므로 처음부터 "확인 완료"로 둡니다.
  const [authResolved, setAuthResolved] = useState(!isFirebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  // 로그인한 계정의 프로필이 도착했는지. 별도 상태 없이 값에서 바로 끌어냅니다.
  const profileResolved = !user || profileEntry?.uid === user.uid;
  const profile = user && profileEntry?.uid === user.uid ? profileEntry.doc : null;

  // 리디렉트 방식으로 로그인했을 때 돌아온 결과를 처리합니다.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getRedirectResult(auth).catch(() => {
      setAuthError("로그인을 마치지 못했어요. 다시 시도해 주세요.");
    });
  }, []);

  // 로그인 상태 구독
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthResolved(true);
    });
  }, []);

  // 내 프로필 문서 구독. 운영진이 승인하면 새로고침 없이 바로 반영됩니다.
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        setProfileEntry({
          uid,
          doc: snapshot.exists() ? (snapshot.data() as UserDoc) : null,
        });
      },
      () => {
        // 보안 규칙에 막히는 경우(예: 규칙 배포 전)에도 화면이 멈추지 않도록 합니다.
        setProfileEntry({ uid, doc: null });
      },
    );
  }, [user]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? "";
      // 사용자가 팝업을 직접 닫은 경우는 오류로 취급하지 않습니다.
      if (code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
        return;
      }
      // 팝업이 막히는 환경(모바일 홈 화면 앱 등)에서는 리디렉트 방식으로 다시 시도합니다.
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          setAuthError("로그인 창을 열지 못했어요. 브라우저에서 다시 시도해 주세요.");
          return;
        }
      }
      setAuthError(signInErrorMessage(code));
    }
  }, []);

  const logOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const stage = useMemo<AuthStage>(() => {
    if (!authResolved || !profileResolved) return "loading";
    if (!user) return "signedOut";
    if (!profile) return "needsInviteCode";
    if (profile.status !== "approved") return "pending";
    if (!profile.profileCompleted) return "needsOnboarding";
    return "ready";
  }, [authResolved, profileResolved, user, profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      stage,
      isAdmin: profile?.role === "admin",
      authError,
      signIn,
      logOut,
      clearAuthError,
    }),
    [user, profile, stage, authError, signIn, logOut, clearAuthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있어요.");
  }
  return context;
}
