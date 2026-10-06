"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { SplashScreen } from "@/components/StageGate";
import { auth } from "@/lib/firebase";
import { consumeKakaoState, fetchKakaoFirebaseToken, isAppKakaoState, KAKAO_APP_SCHEME } from "@/lib/kakao-login";

/**
 * 카카오 동의 화면에서 돌아오는 자리 (/auth/kakao?code=…&state=…, 2026-09-22).
 *
 * code를 서버(/api/auth/kakao)에 넘겨 로그인 표를 받고, 그것으로 로그인한 뒤 시작 지점("/")으로 갑니다.
 * 그 뒤는 StageGate가 알아서 — 처음이면 가입(join) → 프로필 설정, 이미 가입했으면 홈으로.
 *
 * 카카오 화면에서 "취소"를 누르면 code 대신 error가 붙어 옵니다. 그때는 조용히 로그인 화면으로 돌아갑니다.
 */
export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <KakaoCallback />
    </Suspense>
  );
}

function KakaoCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [appLink, setAppLink] = useState<string | null>(null);
  // 개발 모드에서 effect가 두 번 돌아도 code는 한 번만 씁니다(카카오 code는 일회용).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const state = params.get("state");
    /*
     * 2026-10-06 사용자 요청 (구글 플레이 출시 준비): 구글 플레이 앱에서 시작한 로그인.
     * 이 웹 페이지는 시스템 브라우저에서 열린 것이라, 로그인 표를 앱 주소(app.web.aegiaeta://kakao)로 넘겨 앱을 다시 엽니다.
     * 앱 쪽(NativeAppSync)이 state를 확인한 뒤 표로 로그인합니다.
     */
    if (isAppKakaoState(state)) {
      if (!code) {
        window.location.replace(`${KAKAO_APP_SCHEME}://kakao`);
        return;
      }
      void fetchKakaoFirebaseToken(code)
        .then((token) => {
          const link = `${KAKAO_APP_SCHEME}://kakao?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state ?? "")}`;
          setAppLink(link);
          window.location.replace(link);
        })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "카카오 로그인을 마치지 못했어요."));
      return;
    }
    const stateOk = consumeKakaoState(state);
    if (!code) {
      router.replace("/login");
      return;
    }

    void (async () => {
      try {
        if (!stateOk) throw new Error("로그인을 시작한 화면과 달라요. 처음부터 다시 시도해 주세요.");
        const token = await fetchKakaoFirebaseToken(code);
        await signInWithCustomToken(auth, token);
        router.replace("/");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "카카오 로그인을 마치지 못했어요.");
      }
    })();
  }, [params, router]);

  if (!error && appLink) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-7 text-center">
        <h1 className="text-[20px] font-bold text-ink">앱으로 돌아가는 중이에요</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">자동으로 돌아가지 않으면 아래 단추를 눌러 주세요.</p>
        <a
          href={appLink}
          className="mt-8 flex w-full items-center justify-center rounded-2xl bg-brand-500 px-5 py-4 text-[16px] font-bold text-white transition active:scale-[0.99]"
        >
          애기애타 앱 열기
        </a>
      </div>
    );
  }
  if (!error) return <SplashScreen />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-7 text-center">
      <span className="text-[40px]" aria-hidden="true">
        😥
      </span>
      <h1 className="mt-5 text-[20px] font-bold text-ink">로그인하지 못했어요</h1>
      <p role="alert" className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        {error}
      </p>
      <Link
        href="/login"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-brand-500 px-5 py-4 text-[16px] font-bold text-white transition active:scale-[0.99]"
      >
        처음 화면으로
      </Link>
    </div>
  );
}
