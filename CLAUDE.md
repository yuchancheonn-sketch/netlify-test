@AGENTS.md

# 이 프로젝트를 처음 여는 경우

코드를 뒤지기 전에 **[ARCHITECTURE.md](ARCHITECTURE.md)** 를 먼저 읽으세요.
어떤 서비스가 무슨 역할을 맡고, 코드가 어디서 도는지(브라우저 / 서버 /
서비스워커), 데이터가 어떻게 흐르는지가 한 장에 정리돼 있습니다.

**배포 주소는 https://aegiaeta.web.app (Firebase App Hosting)** 입니다. 2026-09에 Netlify 크레딧
한도 때문에 옮겼습니다. 문서 곳곳의 "Netlify"는 옮기기 전 기록입니다(ARCHITECTURE.md 맨 위 안내 참고).
설치·콘솔 설정 절차는 [README.md](README.md)에 있습니다.

## 꼭 지킬 것

- **`origin`은 공개 저장소입니다.** 원우 연락처 같은 개인정보를 절대 커밋하지 마세요.
- **push는 사용자가 "배포하자"고 할 때만** 합니다. 커밋은 작업 단위마다 쌓아둡니다.
  (Netlify 시절엔 push = 자동 배포였습니다. App Hosting에서도 그런지는 확인 필요 — README 배포하기.)
- **`firestore.rules`는 고쳐도 효과가 없습니다.** Firebase 콘솔 규칙 탭에
  파일 전체를 붙여넣고 "게시"해야 적용됩니다. 새 컬렉션을 만들면 규칙에
  직접 추가해야 하고, 안 적으면 조용히 막힙니다.
- effect 안에서 `setState` 하지 마세요. `react-hooks/set-state-in-effect` 린트가
  켜져 있어 **빌드가 멈춥니다.** 브라우저 상태는 `useSyncExternalStore`로
  끌어옵니다 (`lib/use-push.ts`, `lib/use-display-settings.ts`가 본보기).
