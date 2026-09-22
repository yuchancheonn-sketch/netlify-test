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
- **배포·push는 사용자가 "배포해줘/배포하자"고 할 때만** 합니다. 커밋은 작업 단위마다 쌓아둡니다.
- ★ **사용자가 "배포해줘"라고 하면 되묻지 말고 바로 이렇게 합니다** (2026-09-22 사용자 요청):
  1. `git status`로 커밋 안 된 수정을 확인합니다. 사용자와 함께 고친 것이면 **전부 커밋**합니다
     (예전 대화에서 고치고 커밋 안 한 것도 포함 — 2026-09-22에 이걸 빠뜨려 원우탭 디자인이 배포에서 빠졌습니다).
     커밋 전에 연락처 같은 개인정보가 없는지 봅니다. 무엇인지 모를 수정이 섞여 있으면 그것만 사용자에게 묻습니다.
  2. `npm run build`로 빌드가 되는지 확인합니다.
  3. **`npm run deploy`** — push, 커밋된 것만 뽑기, 보안 규칙 게시, App Hosting 배포(5~10분),
     web.app 캐시 비우기, 새 판 확인까지 한 번에 합니다(scripts/deploy.mjs). 오래 걸리니 백그라운드로 돌립니다.
  4. 끝나면 web.app이 새 판인지(스크립트 마지막 줄) 보고 사용자에게 알립니다.
  ★ **push만으로는 배포되지 않습니다**(App Hosting이 GitHub와 연결돼 있지 않음). 자세한 짜임은 README "배포하기".
  ★ firebase CLI 로그인이 풀려 있으면 사용자에게 터미널에서 `firebase.cmd login`을 부탁합니다(브라우저 승인 필요).
- **`firestore.rules`는 고치기만 해서는 효과가 없습니다.** 게시해야 적용되고, 이제는 `npm run deploy`가
  함께 게시합니다(2026-09-22부터 — 콘솔에 붙여넣지 않아도 됨). 새 컬렉션을 만들면 규칙에
  직접 추가해야 하고, 안 적으면 조용히 막힙니다.
- effect 안에서 `setState` 하지 마세요. `react-hooks/set-state-in-effect` 린트가
  켜져 있어 **빌드가 멈춥니다.** 브라우저 상태는 `useSyncExternalStore`로
  끌어옵니다 (`lib/use-push.ts`, `lib/use-display-settings.ts`가 본보기).
