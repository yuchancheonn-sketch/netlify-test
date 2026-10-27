@AGENTS.md

# 이 프로젝트를 처음 여는 경우

코드를 뒤지기 전에 **[ARCHITECTURE.md](ARCHITECTURE.md)** 를 먼저 읽으세요.
어떤 서비스가 무슨 역할을 맡고, 코드가 어디서 도는지(브라우저 / 서버 /
서비스워커), 데이터가 어떻게 흐르는지가 한 장에 정리돼 있습니다.

**배포 주소는 https://aegiaeta.web.app (Firebase App Hosting)** 입니다. 2026-09에 Netlify 크레딧
한도 때문에 옮겼습니다. 문서 곳곳의 "Netlify"는 옮기기 전 기록입니다(ARCHITECTURE.md 맨 위 안내 참고).
설치·콘솔 설정 절차는 [README.md](README.md)에 있습니다.

## ★ 컴퓨터가 바뀌어도 이어서 — GitHub이 유일한 원본 (2026-09-22 사용자 요청)

컴퓨터를 바꾸면서, 이 컴퓨터에만 있던 커밋 안 한 작업과 다른 곳에서 올린 배포본이 서로 어긋나
헷갈린 일이 있었습니다. 그래서 **GitHub을 유일한 원본으로 삼습니다.**
Claude Code와 이 저장소만 있으면 어느 컴퓨터에서든 바로 이어서 고칠 수 있어야 합니다.

1. **대화를 시작하면 무엇보다 먼저 `npm run sync`** 를 돌립니다. GitHub의 새 커밋을 받아 오고
   (다른 컴퓨터에서 한 작업), 커밋 안 된 수정·push 안 한 커밋·새 컴퓨터 준비물이 없는지 알려 줍니다.
   남은 수정이 있으면 사용자에게 알리고 먼저 커밋합니다.
2. ★ **무언가 고치면 바로 커밋하고 `git push origin main`까지 합니다 — 묻지 않고 늘** (2026-09-22 사용자 결정:
   "수정하고 나서 github에 푸시는 항상 자동으로 해주고, 배포만 내가 지시했을 때만 해").
   커밋 안 된 수정이나 push 안 한 커밋을 남겨 두지 않습니다. 커밋 전에 개인정보가 없는지 봅니다.
   **push는 배포가 아니므로** 앱은 바뀌지 않습니다. (이날 앞서 "푸시는 내가 말하면" 규칙이 있었지만 이것으로 바뀌었습니다.)
3. **배포는 사용자가 "배포해줘"라고 할 때만** 합니다(아래 "꼭 지킬 것").
4. 새 컴퓨터 준비는 README "새 컴퓨터에서 이어서 하기" — clone → `npm install` →
   `firebase.cmd login` → `npm run setup:env`(.env.local을 apphosting.yaml + Secret Manager에서 다시 만듦).
5. 기억해 둘 결정·사용자 취향은 Claude 개인 메모(이 컴퓨터에만 있음)가 아니라 **이 파일이나 코드 주석**에 적습니다.

## 꼭 지킬 것

- **`origin`은 공개 저장소입니다.** 원우 연락처 같은 개인정보를 절대 커밋하지 마세요.
- **배포는 사용자가 "배포해줘/배포하자"고 할 때만** 합니다. 커밋·push는 고칠 때마다 자동으로 합니다(위 2번).
- ★ **사용자가 "배포해줘"라고 하면 되묻지 말고 바로 이렇게 합니다** (2026-09-22 사용자 요청):
  1. `npm run sync`로 GitHub과 맞춘 뒤, 커밋 안 된 수정을 확인합니다. 사용자와 함께 고친 것이면 **전부 커밋**합니다
     (예전 대화에서 고치고 커밋 안 한 것도 포함 — 2026-09-22에 이걸 빠뜨려 원우탭 디자인이 배포에서 빠졌습니다).
     커밋 전에 연락처 같은 개인정보가 없는지 봅니다. 무엇인지 모를 수정이 섞여 있으면 그것만 사용자에게 묻습니다.
  2. `npm run build`로 빌드가 되는지 확인합니다.
  3. **`npm run deploy`** — push, 커밋된 것만 뽑기, 보안 규칙 게시, App Hosting 배포(약 3~4분),
     web.app 캐시 비우기, 새 판 확인까지 한 번에 합니다(scripts/deploy.mjs). 오래 걸리니 백그라운드로 돌립니다.
  4. 끝나면 web.app이 새 판인지(스크립트 마지막 줄) 보고 사용자에게 알립니다.
  ★ **push만으로는 배포되지 않습니다**(App Hosting이 GitHub와 연결돼 있지 않음). 자세한 짜임은 README "배포하기".
  ★ firebase CLI 로그인이 풀려 있으면 사용자에게 터미널에서 `firebase.cmd login`을 부탁합니다(브라우저 승인 필요).
- **`firestore.rules`는 고치기만 해서는 효과가 없습니다.** 게시해야 적용되고, 이제는 `npm run deploy`가
  함께 게시합니다(2026-09-22부터 — 콘솔에 붙여넣지 않아도 됨). 새 컬렉션을 만들면 규칙에
  직접 추가해야 하고, 안 적으면 조용히 막힙니다.
- ★ **사용자에게 하는 말은 무조건 한국어로** 합니다(2026-09-24 사용자 요청: "앞으로는 무조건 한국어로 말해줘").
  답변·중간 안내·표 모두 한국어이고, 코드·명령어·파일 경로만 그대로 둡니다.
- **사용자 취향 (옮겨 적음, 2026-09-22):** 화면을 고칠 때 사용자는 "1px 올려줘"처럼 아주 작은 단위로 맞춥니다.
  값을 바꾸면 그 자리 주석에 날짜와 사용자 요청이었음을 남기는 것이 이 저장소의 방식입니다.
  고친 뒤에는 무엇을 바꿨는지 짧게 알리고, 화면을 직접 보지 못했으면 그렇다고 말합니다.
- effect 안에서 `setState` 하지 마세요. `react-hooks/set-state-in-effect` 린트가
  켜져 있어 **빌드가 멈춥니다.** 브라우저 상태는 `useSyncExternalStore`로
  끌어옵니다 (`lib/use-push.ts`, `lib/use-display-settings.ts`가 본보기).

## 보안 점검 후 수정 (2026-10-06)

보안 점검에서 나온 것을 고쳤습니다(사용자 요청). **규칙·서버 코드가 함께 나가야 동작**하고, 규칙 문법은 에뮬레이터로 아직 못 돌려 봤습니다
(`scripts/rules-test/rules.test.mjs`는 작성만 함 — 실행법은 그 파일 맨 위. `npm i -D @firebase/rules-unit-testing` + Java 필요).

- **계정 탈취 차단**: 예전엔 원우 누구나 남의 `users.phone`을 고칠 수 있었고, `/api/account/link`가 그 phone을 믿어 남(운영진 포함) 계정의
  로그인 표를 내줬습니다. ① `firestore.rules` users update: 남의 문서는 수첩 칸(회사·직책·직위·소개 영상·구분 + updatedBy*)만, 본인은 uid·createdAt·verifiedPhone* 불가,
  create는 가입 화면이 적는 칸만. ② `lib/account-link-server.ts`: users.phone은 후보 힌트일 뿐, 후보가 번호를 **서버에서 증명**해야 합침 —
  `verifiedPhones/{번호}`={uid(본계정),at}(서버만, 규칙에 안 적음; link·resolve·adopt에서 문자 인증 토큰을 볼 때 기록) 또는 후보(·별칭)의 Firebase Auth
  phoneNumber(옛 휴대폰 가입 계정은 첫 합치기 때 자동으로 `verifiedPhones`에 이월). ★ 이월 한계: 구글·카카오로 가입하고 번호를 **손으로만 적은** 계정은
  증명이 없어 나중 로그인과 자동으로 합쳐지지 않음(그 원우가 한 번 번호 인증하거나 운영진이 합쳐 줌). 운영진 계정도 같은 기준.
  `MemberEditSheet`는 남의 가입 계정의 이름·기수·휴대폰 칸을 잠급니다(명단 roster 칸·내 정보는 그대로).
- **`/api/public/directory`**: 둘러보는 사람에겐 이름·기수·사진·구분만(uid·명단 id는 해시). 생일·회사·소개·영상·직위·역할 제거.
- **컬렉션 좁힘**: roster(지우기 운영진만, linkedUid는 내 uid로 처음 잇기만), photoAlbums(createdBy 본인·올린 사람/운영진만 고침·지움, 공감은 likedBy의 내 uid만,
  사진 더하기 협업용 photoCount ±범위·대표 사진), photos(uploadedBy 본인, 지우기는 올린 사람·앨범 주인·운영진), files(Cloudinary https 주소만),
  committeeInfo(칸·2000자 제한, 누구나 고침 유지), sessions(운영진만 — 앱에서 쓰는 곳 없음), chatRooms(칸 제한·1:1 memberUids=id의 두 uid·방 지우기 금지, 방 id는 uid 두 개).
  ★ Cloudinary 클라우드 이름(qz4f4bh5)이 규칙 `isCloudinaryUrl`에 박혀 있음 — 바꾸면 같이 고칠 것.
- **`/api/push/chat`**: 승인된 원우만, 문구는 `messageId`로 방의 실제 메시지에서 읽음(보낸 사람 일치·2분 이내), 같은 메시지 1회(pushLog `chat:방:메시지`),
  보낸 사람당 분당 20건(pushLog `chatrate:uid:분`), 1:1 방 memberUids 확인. 클라이언트(`lib/chat-rooms.ts`)는 `{roomId, messageId}`를 보냄 — 옛 화면은 알림이 안 감.
- **카카오 로그인**: `redirectUri`는 서버 허용 목록(`https://aegiaeta.web.app/auth/kakao`, 개발 중 localhost:3000, `KAKAO_EXTRA_ALLOWED_ORIGINS` 환경변수/`EXTRA_ALLOWED_ORIGINS`)과 글자 그대로 같을 때만.
  `state` 확인은 이미 클라이언트(`consumeKakaoState`)에 있었음. 사설 IP 폰 테스트 주소는 환경변수에 적어야 함.
- **배포 순서**: 웹(App Hosting) **먼저**, 규칙 **나중**(`npm run deploy`가 이 순서가 아닐 수 있으니 확인). 새 규칙에서 옛 웹은 남의 가입 계정 이름·기수·휴대폰 저장이 막힘.
- **열어 둔 권고(미구현)**: ① 가입을 pending+운영진 승인으로(지금은 approved — 사용자 결정, 누구나 원우 연락처를 읽음) ② Cloudinary 서명 업로드(지금 unsigned preset)
  ③ 보안 헤더(next.config.ts 담당 작업) ④ 다른 푸시 창구·퀴즈 등의 속도 제한 ⑤ users 문서 전체를 가입자 누구나 읽음(번호 분리 문서 필요).

## 구글 플레이 출시 준비 (2026-10-06)

사용자 요청으로 뉴웨이브앱(`/newave`, 같은 길을 먼저 끝냄)을 거울삼아 안드로이드 앱(Capacitor)을 준비했습니다. 패키지 **`app.web.aegiaeta`**(첫 업로드 후 변경 불가), 이름 애기애타.
★ 이 컴퓨터(리눅스)에서는 Gradle 빌드·폰 실행·푸시 도착을 **확인하지 못했습니다**(web 빌드·`build:app`·`cap sync`·lint·tsc만 통과).

- **B 방식**: 화면 파일을 앱 안에 담습니다(`npm run build:app` → `app-dist/` 정적 내보내기, `scripts/build-app.mjs`). 서버 창구(`src/app/api`)는 앱에 담지 않고
  `https://aegiaeta.web.app`을 부릅니다(`src/lib/api.ts`의 `apiUrl`, `next.config.ts`의 CORS). **새 `/api/…` 호출은 반드시 `fetch(apiUrl("/api/…"))`.**
- **명령**: `npm run app:sync`(= build:app + `cap sync android`, 웹 화면을 고칠 때마다 다시) · `npm run icons:android`(아이콘·시작 화면·스토어 그림, `public/icon-maskable-512.png`에서 愛己愛他 글자를 뽑아 씀 — 기러기 무늬는 안 들어감) ·
  `cd android && gradlew.bat assembleDebug|bundleRelease`(JDK 21 필요). `android/app/build.gradle`의 versionCode는 업로드마다 +1(지금 1).
- **주소 매핑**(정적 내보내기는 동적 경로를 못 만듦, `src/lib/routes.ts`): 앱은 `/chat/room?id=` · `/albums/view?id=` · `/news/week/view?id=` · `/events/edit?id=` 쿼리 화면, 웹은 기존 `/chat/<id>` 등.
  서버가 보낸 알림 주소는 `localizeAppPath()`로 바꿉니다. 링크는 `chatHref`/`albumHref`/`weekNewsHref`/`eventEditHref`.
- **앱 로그인**: 구글 = `@capacitor-firebase/authentication` `signInWithGoogle` → idToken → `signInWithCredential`(`lib/auth-context.tsx`, `skipNativeAuth`). 휴대폰 = 플러그인으로 문자 → `verificationId`+6자리로 웹 SDK 로그인/연결(`lib/phone-login.ts` `sendNativeCode`).
  카카오 = `@capacitor/browser`로 시스템 브라우저 → 리디렉트 `https://aegiaeta.web.app/auth/kakao`(state가 `app-`로 시작) → 그 웹 페이지가 서버에서 표를 받아 `app.web.aegiaeta://kakao?token&state`로 앱 재오픈
  (AndroidManifest intent-filter) → `components/NativeAppSync.tsx`가 state(localStorage) 확인 후 `signInWithCustomToken`. NativeAppSync는 알림 누르기(`data.url`)·안드로이드 뒤로 가기도 맡고 `app/layout.tsx`에 붙어 있음.
  ★ 서버(`/api/auth/kakao`)의 redirectUri 허용 목록에 `https://aegiaeta.web.app/auth/kakao`가 있어야 함(앱도 같은 주소를 보냄 — 웹 로그인과 같아서 이미 포함돼야 함).
- **앱 푸시**: `lib/push.ts` 앱 분기(`@capacitor/push-notifications`, 채널 "default", 권한은 localStorage 캐시 `agikaeta:push-native-perm`), pushTokens에 `platform`("android"/"ios") 저장(웹은 없음 = 웹으로 봄).
  서버 `lib/push-send.ts`: `tokensForUids`/`feed-watch`가 `{web, native}`를 돌려주고 웹=data만, 앱=notification+data(+android 채널). 규칙(`pushTokens`)은 칸을 제한하지 않아 platform 칸이 그대로 통과함.
  ★ 앱에서는 VAPID 키가 필요 없지만 웹은 여전히 필요. 앱 푸시는 `google-services.json`이 있어야 동작.
- **공개 페이지**: `/privacy`·`/terms`(다른 작업)와 `/account-deletion`(구글 플레이가 요구하는 삭제 안내, `LegalPage` 사용)은 `(main)` 바깥이라 로그인 없이 열림. 내용은 실제 탈퇴 동작(`lib/account-withdraw-server.ts`)과 같아야 함.
- **스토어 자료**: `store-assets/`(listing-ko.md, play-console-answers.md, production-access-notes.md, 아이콘·대표 그림), `docs/play-store-checklist.md`(Windows에서 사용자가 할 일 전체). 심사용 계정: `node scripts/play-review-account.mjs create|delete`.
- **사용자가 아직 해야 할 일**: 웹 배포(+`CONTACT_EMAIL` 입력) → JDK 21·Android Studio → Firebase에 안드로이드 앱 등록(디버그 SHA-1/256, `google-services.json`을 `android/app/`에) → `npm run app:sync` → 폰 시험 → 업로드 키 생성(저장소 밖) +
  `android/keystore.properties` → `bundleRelease` → Play Console 입력·비공개 테스트 12명 14일 → **첫 업로드 뒤 앱 서명 SHA-1/256을 Firebase에 추가**(안 하면 스토어 앱에서 구글 로그인·휴대폰 인증 실패).
- **보안 주의**: ① 카카오 앱 복귀는 커스텀 스킴이라 다른 앱이 가로챌 수 있음 → 나중에 App Links(assetlinks.json)로. ② **심사용 시험 계정은 심사가 끝나면 반드시 `delete`** (번호+코드를 아는 누구나 로그인 가능, 이 앱은 가입자 누구나 원우수첩을 읽어 원우 정보가 노출됨).
  ③ 키스토어·비밀번호·서비스 계정은 저장소에 넣지 않음(`android/.gitignore`·루트 `.gitignore`가 `keystore.properties`·`*.jks` 차단). `allowBackup=false`. ④ 규칙·서버 배포는 웹 먼저, 규칙 나중(위 "보안 점검 후 수정").

## 도산 AI (2026-10-12 사용자 "뉴웨이브앱의 신앙 AI처럼 도산 안창호 선생에 대해 대화할 수 있는 AI를 채팅창에 추가")

채팅 탭 목록 맨 위에 모든 원우에게 늘 있는 "도산 AI [AI]"(프로필은 도산아카데미 로고 — 주황 바탕·흰 기러기, `public/dosan-ai.png`, 2026-10-12 사용자가 편집해 준 그림을 로고가 정중앙에 오게 다시 맞춘 512px. 처음엔 흰 "島" 글자였음) — 뉴웨이브앱 신앙 AI와 같은 방식.
- **방**: 평범한 1:1 방 `uid__dosan-ai`(`lib/dosan-ai.ts` DOSAN_AI_UID·dosanRoomId). 한 마디도 없어도 목록에 빈 껍데기로 서 있음. 보안 규칙은 **바꾸지 않음**(원우가 자기 방에 쓰고, AI 답은 서버 Admin SDK가 씀).
- **답**: 원우가 보낸 뒤 브라우저가 `askDosanAi()`(`lib/dosan-ai-client.ts`, apiUrl 사용)로 `/api/dosan-ai`를 부름 → 서버가 최근 24개 대화 + 지시문을 **Gemini 무료 키**(`GEMINI_API_KEY`)로 보내 카톡체 짧은 답 1~3개를 받아 방에 AI 이름(senderId dosan-ai)으로 씀(1.5~5초 뒤 하나씩, 방 위에 "입력 중…" 말풍선).
- **지어내지 않기**: 지시문 끝 "참고 자료"로 이 앱이 확인해 둔 사실(`dosan-quiz-answers.ts`의 해설 전부 = `DOSAN_QUIZ_FACTS`)과 흥사단 "도산의 말씀"(`quotes.ts`)을 깔고, 자료에 없는 말씀은 도산이 한 것처럼 인용하지 말고 출처 불분명하다고 말하게 함. 선생 본인인 척(1인칭) 금지, 정치 편들기·코딩·숙제 사양, 평가가 갈리는 주제는 공정하게. 해설을 고치면 AI 자료도 같이 바뀜.
- **시험 결과**(2026-10-12, 로컬 + 실제 DB 시험 후 방·한도 문서 삭제): 임시정부 초대 대통령 함정 질문 바로잡음(이승만, 도산은 내무총장), 출처 없는 "청년이여 꿈을 꾸어라" 인용 거절, "사람이야?"에 AI라고 답, 자살 신호에 공감 + 109 안내, 선거·코딩 사양, 광복 못 보심·점진학교(1899, 강서) 정확. ★ 그래도 틀릴 수 있어 방 위에 안내가 있음. 지시문(`SYSTEM`)은 운영진이 한 번 읽어 보면 좋음.
- **위기·한도**: 자해·자살 말이 걸리면(CRISIS) 109 안내를 서버가 덧붙임. 한 사람 하루 30번·전체 하루 600번(`dosanAiUsage`, 서버만), 방 25초 잠금. 탈퇴하면 방·메시지 통째로 삭제(`account-withdraw-server.ts`). 개인정보 처리방침에 Gemini 전송·대화 삭제 안내(2026-10-12). ★ 무료 Gemini는 Google이 서비스 개선에 쓸 수 있음 — 민감한 대화가 늘면 유료 등급으로.
- **사람 채팅과 다른 점**: 푸시 알림 없음(AI 방엔 `requestPush` 안 함), 상대 탈퇴·차단·인원수·신고 차단 없음(AI 말풍선 메뉴엔 차단 빠짐).
- ★★ **켜는 일(배포 때, 사용자가 "배포해줘" 하면)**: ① Secret Manager에 `GEMINI_API_KEY` 만들기(`firebase.cmd apphosting:secrets:set GEMINI_API_KEY --project aegiaeta10` — 뉴웨이브와 같은 결제 없는 무료 키, 값은 로컬 .env.local에 있음) — **이 명령이 apphosting.yaml에 secret 줄을 자동으로 넣으니 직접 또 적지 말 것(중복이면 빌드 실패)**, 백엔드 접근 허용 `apphosting:secrets:grantaccess GEMINI_API_KEY --backend agikaeta` ② `npm run deploy`. 키가 없으면 AI가 "지금은 답을 못 하고 있어요"만 보임.

- **다크 모드 바탕은 순수 검정**(2026-10-12 사용자 "다크 모드일 때 모든 탭의 배경색 검은색으로"): `--dark-canvas` #121315 → **#000000**(홈·위원회 등 canvas 바탕), 원우·채팅·자료·알림·내 프로필·일정 화면처럼 화면 전체를 흰 층으로 깔던 곳은 새 토큰 `--color-page-surface`(밝은 화면 #fff, 어두운 화면 #000)로 바꿈(`PageHeader` tone="surface" 포함, 대화방 바탕·제목 줄·입력줄도). 카드·칸은 그대로 `--color-surface`(어두운 화면 #1d1f22)라 검정 바탕 위에 떠 보임. 상단 표시줄 색(`BRAND_BACKGROUND_DARK`)도 #000000. ★ 새 화면에서 "화면 전체 바탕"으로 깔 때는 bg-surface가 아니라 bg-page-surface를 쓸 것. 밝은 화면은 변화 없음. 시험: 다크 모드로 홈·원우·위원회·채팅·자료 body·제목 줄 배경이 모두 rgb(0,0,0).

- **복습 영상 제목 검색**(2026-10-12 사용자 "뉴웨이브앱처럼 복습영상 탭에서 제목 검색, 검색 박스는 원우수첩과 아예 똑같게"): `components/VideoList.tsx` 맨 위 검색 박스 — 원우수첩 검색 박스와 같은 값(`rounded-[14px] bg-search-box pt-[7.5px] pr-14 pb-[11.5px] pl-5 text-[17px]`, 돋보기 28px)·같은 안내 문구 크기, 띄어쓰기·대소문자 무시 제목 검색, 못 찾으면 "찾는 영상이 없어요". 영상이 있을 때만 나옴. 뉴웨이브처럼 위에 붙박이(sticky)는 아니고 목록과 함께 스크롤됨(제목 줄 높이를 알 수 없어 단순하게). 시험: 영상 15개 중 "스페이스" 3개, 없는 단어 → 안내, 밝은·어두운 화면 모두 박스 색 정상. ★ 이 컴퓨터의 로컬 개발 서버(`next dev`)는 구글 글꼴을 못 받아 오류 화면이 뜨고 `/api/videos`도 500이라(배포본은 정상), 화면 시험은 `npm run build` + `npx next start -p 3300`으로 함.

- **대화방 말풍선 좌우 위치를 뉴웨이브앱과 똑같이**(2026-10-12 사용자): 메시지 한 줄(`MessageRow`)에 상대 말(사진 원·이름·말풍선)은 `-ml-[8.5px]`(왼쪽 끝에 8.5px 더 붙임), 내 말풍선은 `-mr-1.5`(오른쪽 끝에 6px 더 붙임)를 줌 — 뉴웨이브 `app/(main)/chat/[roomId]/room.tsx`의 같은 줄과 같은 값. 대화 상자 좌우 여백(`px-4`)·말풍선 최대 폭(70%)·사진 크기(32px)·간격(gap-2)은 원래 두 앱이 같음. 도산 AI "입력 중…" 말풍선도 같은 값. ★ 폰·브라우저로 직접 겹쳐 비교하지는 못함(코드 값만 맞춤).

- **대화방에서 상대 이름 표시**(2026-10-12 사용자 "개인·전체 모든 방에서 상대 이름이 보이게, 실명으로"): 상대가 연달아 보낸 말풍선 묶음의 첫 말풍선 위에 이름 한 줄(뉴웨이브와 같은 모양 — 12.5px 보통 굵기 회색, 왼쪽 4px, 높이 18px). 이름은 `resolveSenderName`이 정하는 **실명**(원우수첩의 지금 이름 → 메시지에 적어 둔 이름 → 옛 별칭 순; 별칭 기능은 2026-09-15에 없앴음)이라 별도 작업 없이 늘 본명. 도산 AI 방은 "도산 AI". ★ 폰으로 직접 확인은 못 함.

- **알림함 디자인을 뉴웨이브앱과 똑같이**(2026-10-12 사용자): `src/app/(main)/notifications/page.tsx` — 구역 제목(오늘·어제·최근 7일·이전 활동) 아래에 줄: 왼쪽 큰 동그라미(54px, 옅은 회색 바탕에 종류 그림 — 일정 달력·투표 도장·영상 재생·소식 확성기) + 글 한 덩어리(굵은 제목 + 끝에 옅은 짧은 시간 "방금·20분·10시간·1일·2주") + 옅은 본문 최대 두 줄, 이번에 새로 온 줄(기존 `baseline` 방식 그대로)은 오른쪽에 **주황 점**(뉴웨이브는 파랑 — 앱 색), 박스·구분선·줄 바탕·꺾쇠 없음. 바탕은 다크 모드에서 검정(page-surface). 이 앱 알림은 사람이 올린 글이 아니라(일정·영상·소식·투표) 프로필 사진 대신 늘 종류 그림. 시험: 밝은·어두운 화면에서 구역 제목·54px 동그라미·시간·본문 확인(알림이 1건뿐이라 새 점·여러 구역은 못 봄).

- **오늘의 OX 퀴즈 정답 축하 효과**(2026-10-12 사용자 "뉴웨이브앱처럼 축하 애니메이션"): 뉴웨이브앱 `PartyEffects`(폭죽 색종이·크기와 색이 다른 풍선 9개·파티 얼굴/박수/폭죽 이모지, 약 2.3초 `pace 0.45`)를 `src/components/PartyEffects.tsx`로 그대로 옮기고(색종이 색만 앱 주황 계열), 풍선·이모지 움직이는 그림 5개는 `public/anim/`(구글 Noto 움직이는 이모지, CC BY 4.0). `DosanQuizCard`가 **방금 채점해서 열린 해설이고 정답일 때만** 터뜨림(나중에 "해설 보기"로 다시 열 때·틀렸을 때는 안 나옴, `justGraded`). 움직임 줄이기 설정이면 안 함, 안드로이드는 폭죽 때 진동. 시험(2026-10-12, 로그인 없이 풀기 — 기록 안 남음): 정답 해설이 열리면 이모지 12개·색종이가 뜨고 4초 뒤 모두 사라짐. 앱(Capacitor) 빌드에도 public/anim이 함께 담김.
- **2026-10-12 자료 탭 검색 박스 공통화**(사용자 "복습 영상 뿐만 아니라 일정·파일에도 같은 검색 박스"): `components/SearchBox.tsx`(원우수첩 검색과 같은 모양) + `matchesSearch`(띄어쓰기·대소문자 무시, 한글은 NFC로 맞춰 비교 — 맥·아이폰에서 올린 파일 이름은 자모가 풀어진 NFD로 저장돼 있어 그대로 비교하면 못 찾음). 복습 영상(`VideoList`)·일정(`NewsList`)·파일(`library/page.tsx` FileList)이 같이 씀. 브라우저(빌드+start)로 세 곳 확인, 폰은 못 봄.
- **2026-10-12 채팅방 자판 위에 최근 메시지 유지**(사용자 "뉴웨이브앱 코드 그대로"): `chat/[roomId]/room.tsx`가 뉴웨이브와 같은 방식 — 대화방을 visualViewport(위 끝·높이)에 못 박고 입력줄은 그 안 맨 아래(absolute), 입력줄 높이를 ResizeObserver로 재서 대화 상자 아래 여백으로, `stickBottom`(맨 아래를 보고 있는지)·`scrollToLatest`로 자판이 오르내리는 동안·새 메시지·보낸 뒤 맨 아래 유지. ★ tsc·eslint 통과, 자판 동작은 아이폰에서만 보여 직접 못 확인.

- **2026-10-13 동호회 편성 변경**(사용자): 소식 탭 동호회 칸 카드를 6개로 — 골프동호회(채승수)·등산/트레킹 동호회(김정헌)·런닝 동호회(이우선)·와인 동호회(손은우)·(투자)연구회 동호회(채승수)·독서 동호회(장 미정). 카드의 "담당" 칸 이름을 "장"으로, 예전 직함(부회장·위원장)은 목록에 없어 뺌. 목록은 `CommitteeRoster.tsx`의 `CLUBS`. 뒷면 글은 `committeeInfo/{이름}`에 저장되는데 문서 id에 "/"를 못 써서 `infoDocId`가 "/"를 "-"로 바꿔 읽고 씀("등산/트레킹 동호회" → "등산-트레킹 동호회"; 예전 "예술/와인동호회"는 저장이 안 되던 상태였음). 이전 7개 동호회 카드의 뒷면 글이 있었다면 같은 이름("골프동호회")만 이어지고 나머지는 새로 적어야 함. ★ 배포해야 반영.
- **2026-10-13 동호회 카드 높이·위원 명단**(사용자): 동호회 앞면 카드 기본 높이를 400px로 키움(`ClubCard` `min-h-[400px]`, 위원이 많아지면 더 늘어남). 앞면에 "장" 칸 아래 "위원" 칸(인원 알약은 장+위원). 뒷면 "수정"(원우 누구나)을 누르면 뉴웨이브 "채팅방에 공유" 창처럼 **원우 목록에서 동그라미로 고르는** 위원 선택(`ClubMemberPicker`: 가입한 원우 + 가입 전 명단 칸) + 목표 글을 한 번에 저장. 저장은 `committeeInfo/{이름}.members`(배열, "u:<uid>|이름" 또는 "r:<명단 id>|이름", 최대 60) — 카드엔 고를 때의 이름이 보여(이름을 나중에 고치면 다시 저장해야 갱신). `firestore.rules` committeeInfo에 members 칸(list, 60 이하) 추가. ★ **규칙을 게시해야 위원 저장이 됨**(`npm run deploy`가 함께 게시, 배포 순서는 웹 먼저·규칙 나중). 로그인 없이 보는 화면만 직접 확인함 — 수정 창(동그라미 고르기)·저장은 아직 못 봄, 규칙은 에뮬레이터로 시험 안 함.
- **2026-10-13 동호회 설명**(사용자 "카드에 동호회 설명도 적을 수 있도록"): 동호회 수정 창에 "동호회 설명" 칸(위원 고르기 위, 최대 1000자)이 생김 — 저장은 `committeeInfo/{이름}.description`. 앞면은 장 칸 위에 최대 3줄, 뒷면은 "동호회 설명" → "목표" 순으로 전체. 설명이 없으면 앞면엔 칸이 안 보임. `firestore.rules` committeeInfo에 description 칸(문자열 1000자 이하) 추가 — ★ 규칙을 게시해야 저장됨(시험은 안 함).
- **2026-10-13 동호회·위원회 수정 창 저장 단추**(사용자 "뉴웨이브앱처럼"): 고친 게 없으면 저장 단추가 옅은 색으로 눌리지 않고(`disabled:bg-brand-200`), 목표·동호회 설명·위원 중 하나라도 처음과 달라지면 원래 색(`CommitteeEditSheet`의 `changed`).
- **2026-10-13 위원회 탭 글자 탭 순서**(사용자): 위원회 · **동호회 · 원우소식** (예전: 위원회·원우소식·동호회). `news/page.tsx`의 `SUBTABS`.
- **2026-10-20 동호회 변경·부원 반영**(사용자, 회장님 지시): 독서 동호회 → **미식 동호회**(장 박준영). 동호회별 부원 이름을 `CLUBS`의 `members`에 코드로 적음(골프 7·등산 7·런닝 5·와인 4·투자 4·미식 3). 카드는 Firestore `committeeInfo.members`(뒷면 수정에서 저장)가 있으면 그것을, 없으면 이 코드 명단을 보임. 수정 창 위원 고르기는 코드 명단을 모르므로 처음엔 빈 상태 — 저장하면 고른 명단으로 대체됨. 옛 "독서 동호회" 문서는 고아로 남음. ★ 배포해야 반영.

## 전화번호 공개 선택 (2026-10-27 사용자 요청 "뉴웨이브앱처럼 번호 공개는 본인이 선택, 디자인도 똑같이")

뉴웨이브(`users.phonePublic`, `PhoneVisibilitySwitch`)와 같은 방식. **기본은 비공개** — 본인이 내 프로필의 전화번호 칸 아래 "전화번호 공개" 스위치(`components/PhoneVisibilitySwitch.tsx`, 알약 52×30·손잡이 20px, 켜짐은 앱 주황)를 켜야 다른 원우에게 번호가 보임. 본인·운영진은 늘 봄.
- `lib/directory.ts buildDirectory(members, roster, viewer)`가 **가입한 원우**의 번호(명단에 적혀 있던 번호 포함)를 viewer가 남이고 운영자가 아니며 phonePublic이 아니면 비우고 `phoneHidden`을 켬. 수첩 화면(`members/page.tsx`)이 viewer를 넘김. 번호가 비면 전화·문자 단추와 번호 줄이 저절로 안 나옴. 남의 가입 계정을 고치는 창(`MemberEditSheet`)의 번호 칸은 원래 잠겨 있고 비공개일 땐 "비공개" 안내만.
- 규칙(firestore.rules)은 바꾸지 않음(본인은 phonePublic을 포함한 칸을 고칠 수 있음). 개인정보처리방침에 한 줄 추가.
- ★ **화면에서 가리는 것이라 users 문서 자체는 로그인한 원우에게 내려옴**(뉴웨이브와 같은 한계) — 개발자 도구로 보면 번호를 읽을 수 있음. 서버에서 막으려면 번호를 별도 문서(본인·운영진만 읽기)로 분리해야 함. ★ **가입 전(roster) 명단 번호는 이 스위치와 무관하게 원우에게 보임.** ★ 기본이 비공개라 **이미 가입한 원우의 번호는 본인이 켜기 전까지 다른 원우에게 안 보임**(배포 후 달라지는 점).

## 전화번호 분리 보관 (2026-10-27 사용자 요청 "뉴웨이브는 정식 출시 후에, 애기애타는 지금 바로 유닝앱처럼")

번호는 이제 `users/{uid}` 가 아니라 **`users/{uid}/private/main.phone`**(본인·운영진만 읽고 씀 — firestore.rules `match /private/{docId}`)에 둠. 공개 여부(`users.phonePublic`)는 users 문서에 그대로(비밀이 아님). 화면 디자인은 그대로.
- **읽기**: `lib/auth-context.tsx`가 내 private 번호를 구독해 `profile.phone`에 합쳐 줌(옛 `users.phone`은 private가 없을 때만 대신 씀) → ProfileForm·계정 합치기 화면 등은 그대로. 다른 원우의 번호는 **서버 창구 `/api/members/phones`**(승인된 원우만)가 "번호 공개를 켠 사람 + 내 번호"(운영진은 전원)만 `{uid: 번호}`로 내려줌 → `lib/member-phones.ts useMemberPhones()` → `buildDirectory(…, phones)`. 내가 저장하면 `refreshMemberPhones`로 다시 받음.
- **쓰기**: ProfileForm 저장 = private 문서에 phone(+`users.phone` 삭제), MemberEditSheet의 가입 계정 번호도 private로(남의 계정 칸은 원래 잠김).
- **서버**: `account-link-server samePhoneMembers`가 `collectionGroup("private").where("phone","in",…)`(+ 옮기기 전 옛 users.phone)로 후보를 찾음 — **`firestore.indexes.json` fieldOverrides(private.phone, 컬렉션 그룹 범위)가 게시돼야 함**(`npm run deploy`가 규칙과 함께 올림). 탈퇴(`account-withdraw-server`)는 번호를 **공개였던 사람만** 명단으로 옮기고 private까지 `recursiveDelete`.
- **옮기기**: `node scripts/migrate-phones.mjs`(점검) → `--copy`(복사, 옛 칸 유지) → 화면 확인 → `--delete`(옛 users.phone 삭제, 되돌릴 수 없음). ★ 새 코드를 **먼저 배포**하고 그다음 `--copy`(배포 전에 옮기면 옛 화면은 번호가 비어 보임). 시험 계정 스크립트·탈퇴·합치기는 private 기준으로 고침. `scripts/make-admin.mjs`가 번호로 사람을 찾는 부분은 users.phone 기준이라 `--delete` 뒤엔 번호 검색이 안 됨.
- 못 막는 것: 가입 전(roster) 명단의 번호는 roster 문서에 있어 원우가 읽음(스위치와 무관). ★ 배포·옮기기는 아직 안 함, 화면·서버는 폰·실데이터로 확인하지 못함(타입·린트·빌드·규칙 컴파일만).

## 알림함 읽음 처리를 뉴웨이브앱과 똑같이 (2026-10-27 사용자 요청)

`src/app/(main)/notifications/page.tsx` — 뉴웨이브 알림함과 같은 운영 방식: ① 안 읽은(마지막으로 알림함을 본 시각 `chatReads.noticesSeenAt` 이후에 온) 알림은 오른쪽 점이 아니라 **줄 전체에 옅은 주황 바탕**(`color-mix(brand-500 14%)`, 뉴웨이브는 파랑) ② **알림함을 나갈 때** 모두 읽음으로 적음(`markNoticesSeen`, 엄격 모드의 껐다 켬은 setTimeout 0 + mountedRef로 무시) → 다시 들어오면 바탕이 없고, 종의 빨간 점도 알림함을 **나간 뒤**에 꺼짐(예전엔 여는 순간 꺼졌음) ③ 줄을 누르면 그 순간 읽음. 이 앱의 알림은 모든 원우에게 같은 글이라 받는 사람별 `read` 칸이 없어 읽음을 "마지막으로 본 시각" 하나로 적음(뉴웨이브는 알림마다 read). ★ 배포해야 반영, 화면은 직접 못 봄(타입·린트만).

## 도산 AI 대화창을 뉴웨이브 신앙 AI 방과 똑같이 (2026-10-27 사용자 요청, 색은 애기애타 주황)

뉴웨이브 `room.tsx`·`AiOrb`·`AiGreeting`·`AiThinkingText`·`lib/ai-orb-draw.ts`를 옮기고 **색만 파랑 → 주황**으로: ① 방에 다시 들어오면 맨 아래에 **시간대별 안내 멘트**(`components/AiGreeting.tsx`, 6구간 한 줄 + 주황 그라데이션 글씨, 대화 기록은 그 위로 밀려 위로 끌어내려야 보임, 질문을 시작하면 사라짐) + 가로로 밀어 보는 **자주 묻는 질문 박스**(`DOSAN_AI_QUICK_QUESTIONS` in lib/dosan-ai.ts, 5개 — 질문 문구는 도산 주제로 내가 정함, 누르면 바로 질문, 자판이 올라오면 숨김) + 안내가 떠 있을 때 제목 밑 **지난 대화 보기 아래 화살표**(`#e04a00`) ② AI가 답을 만드는 동안 **끈 애니메이션**(`components/AiOrb.tsx`, 캔버스, `thinking`) + 말풍선 없이 **주황 글씨 문구**가 1.7초마다 무작위로 바뀜(`AiThinkingText.tsx` 20개, 도산 주제로 바꿈), 답이 오면 말풍선 옆 끈이 원으로 풀림. AI 말이 이미 와 있으면 끈은 첫 메시지 옆 하나만(`aiBlockStart`) ③ AI 말풍선 옆 프로필이 도산 아카데미 로고(`DosanAiAvatar`) 대신 이 끈(원)으로 — **목록·빈 방 소개·헤더의 로고 프로필은 그대로**(뉴웨이브는 이쪽도 끈으로 바꿨지만 사용자가 요청한 범위가 아니라서) ④ 방 위 회색 "AI가 답하는 대화예요" 띠와 제목 옆 "AI" 알약은 뉴웨이브처럼 삭제(AI 고지는 빈 방 소개 화면에 그대로) ⑤ 방에 들어올 때 깜빡임 방지(`settled`)·끌어올린 동안 자동 내리기 금지(`userPulled`·`touching`)·안내 스냅(`snapSoon`). ★ 로그인·서버 답이 필요한 화면이라 방 전체는 못 보고, 끈은 따로 그려 확인(타입·린트·빌드 통과). 배포해야 반영.

## 하단 탭 알약을 뉴웨이브앱과 똑같이 (2026-10-27 사용자 요청, 색은 애기애타 테마)

`components/BottomTabBar.tsx`·`components/icons.tsx`·`app/globals.css`에 뉴웨이브 탭 알약 값을 옮김(코드 구조·끌기 동작은 원래 같음): ① 아이콘 27px·선 1.5px, **아이콘마다 실제 그려진 높이를 홈 아이콘(27px 칸에서 위 3.63~아래 23.88px)에 맞추는 `fit`(scale·y)** — 애기애타 아이콘을 크롬으로 8배 렌더링해 잰 값(원우 1.133/0.32, 위원회 1.019/0.31, 채팅 1.073/0.05, 자료 1.095/0.25), 선은 `1.5/scale`로 늘 1.5px ② 아이콘 칸 위로 1.75px(예전 0.75), 알약 위아래 안쪽 여백 4 → 5px(`BAR_PADDING_Y`) ③ 바탕은 단색 흰/surface 대신 **가로 그라데이션**(`--color-tabbar`: 밝은 화면 양끝 살짝 회색 → 가운데 흰색, 어두운 화면 왼쪽 검정 → 오른쪽 짙은 회색) ④ 어두운 화면 둘레선 0.67px 3겹(`--dark-tabbar-edge`), 밝은 화면은 아래 그림자만 ⑤ 안 고른 탭 글씨·아이콘 색 토큰 `--color-tab-off`·`--color-tab-icon-off`(밝은 #6d6a67·#8a8682, 어두운 화면은 ink-muted) ⑥ **고른 순간 움직임**: `IconProps.animate` + `.tab-anim` 키프레임 — 집 문이 사라졌다 아래부터 열림(`HomeIcon`이 뉴웨이브 모양으로 바뀜: 작은 문, 채운 집은 마스크 구멍), 원우 앞사람 머리 톡, 채팅 말풍선 흔들, 자료 폴더 톡, 위원회 건물 톡. ★ 뉴웨이브는 파랑(#0046ff·#275bf0·남청 바탕·푸른 회색)이라 **색만 애기애타 주황/중성 회색으로** 바꿈. 바꾸지 않은 것: 채팅 새 메시지 빨간 점(뉴웨이브는 숫자 원), 자료 아이콘의 재생 삼각형(뉴웨이브는 사용자 요청으로 뺌), 탭 구성·이름. 폰·실화면으로는 못 보고 5개 탭을 따로 그려 확인(타입·린트·빌드 통과). 배포해야 반영.

## 홈 탭 박스 모서리·제목 크기를 뉴웨이브와 같게 (2026-10-27 사용자 요청)

뉴웨이브 `--radius-card` 2rem(32px)·박스 제목 18.5px·굵기 600(달력 월 이름·투표 제목은 1px 큰 19.5px)에 맞춤: 홈 박스(오늘의 OX 퀴즈·오늘의 도산·다가오는 일정 `EventCard`·달력 `HomeCalendar`·바로가기 `HomeShortcuts`·열린 투표 `PollCard`·홈 로딩 뼈대)의 `rounded-card`(18px)를 `rounded-[32px]`로, 제목은 `text-[18.5px] font-[600]`(달력·투표 19.5px). ★ 전역 토큰 `--radius-card`(18px)는 **안 바꿈** — 위원회 카드·앨범 카드도 쓰기 때문(홈 박스만 요청). ★ 뉴웨이브의 박스 안 여백·간격(위 16px·아래 24px·좌우 12px 등)과 "기도 제목" 박스 구조는 이 요청에 없어 그대로. 배포해야 반영, 폰 화면은 못 봄.
- **2026-10-27 홈 탭 박스 테두리 없앰**(사용자): 홈 박스(오늘의 OX 퀴즈·오늘의 도산·다가오는 일정·달력·바로가기·열린 투표·기도 줄)의 1px 헤어라인 `shadow-[var(--shadow-card-flat)]`을 뺌. 다른 탭(위원회·원우 등)의 박스 테두리는 그대로. 어두운 화면에서 박스(#1d1f22)와 바탕(검정)은 색 차이로만 구분됨.
- **2026-10-27 홈 바로가기 3D 아이콘**(사용자 "투표 만들기·의견 모으기·역대 투표 아이콘을 뉴웨이브처럼 캔바로 만들어서"): `components/HomeShortcuts.tsx`의 SVG 그림(BallotBox/Opinion/PollHistoryIllustration — 이제 어디서도 안 씀)을 `public/icons3d/{vote,opinion,history}.png`(96×96 투명, 표시 23.5·22.5·23.5px)로. 캔바 `generate-image`+`remove-background`, 뉴웨이브 취향("단순·사실적 3D, 장식·테두리선·결 없음, 한 개의 물체, 순수 흰 배경")대로 **색만 애기애타 주황/살구**(주황 투표함·살구색 말풍선·주황 체크 종이 묶음). 캔바 원본 MEDIA: vote MAHZLDX4Mqc→(배경 제거) MAHZLJShJZg, opinion MAHZLBU6aNQ→MAHZLGSGmrg, history MAHZLGCxUfw→MAHZLOG8mUw. 뉴웨이브의 파란 그림을 그대로 복사하지 않고 새로 만듦(앱 색에 맞춤). ★ 캔바 도구가 200×200만 내려줘 96px로 줄여 씀.
- **2026-10-27 홈 탭 박스 여백을 뉴웨이브와 같게**(사용자): 홈 좌우 여백 16 → **12px**, 박스 사이 14 → **8px**(`app/(main)/home/page.tsx`, 뉴웨이브 `px-[12px]`·`mt-[8px]`). 박스 위·아래 안쪽 여백(뉴웨이브 값): OX 퀴즈 위 12.5 → 16·아래 20 → 24px, 오늘의 도산 위 20 → 16·아래 24px, 달력 위 11.5 → 14.5·아래 12 → 14px, 다가오는 일정 아래 19.5 → 21.5px(위 17 그대로·오른쪽 16.5px은 퀴즈 ">" 줄 맞춤이라 그대로), 열린 투표 아래 20 → 22px, 바로가기 위 14 → 16·아래 14 → 18.5px. ★ 안 바꾼 것: 헤더와 첫 박스 사이(pt-2, 뉴웨이브는 2.5px), 바로가기 줄 높이(뉴웨이브 42px, 여긴 36px — 요청에 없음), 박스 안쪽 좌우 여백. 배포해야 반영, 폰 화면은 못 봄.

## 도산 퀴즈 = 뉴웨이브 성경 퀴즈 방식 (2026-10-27 사용자 "오늘의 OX퀴즈를 도산 퀴즈로 이름 바꾸고 운영방식도 뉴웨이브앱이랑 동일하게")

① 이름 "오늘의 OX 퀴즈" → **"도산 퀴즈"**(홈 카드·카카오 스킬 "이번 주 도산 퀴즈"·역대 퀴즈 " · 이번 주") ② **하루 한 문제 → 일주일에 한 문제, 매주 일요일 0시(한국)에 다음 문제**: `lib/dosan-quiz.ts`(`QUIZ_START_DATE = 2026-10-25` 일요일 — 아닌 날로 바꾸면 모듈이 던짐, `quizWeekStartDay`, `quizForDay`(주 단위), `pastQuizzes`(주 단위)) ③ 서버(`lib/quiz-server.ts`): 답은 `quizAnswers/{uid}_{그 주 일요일}`(한 계정 한 주 한 번, 옛 하루 한 문제 시절 같은 이름 문서는 문제 id가 다르면 덮어씀), **성적은 매번 누적**(`quizScores.week` = 마지막으로 푼 주, `QUIZ_START_DATE` 이전·week 없는 옛 성적은 "안 푼 사람"으로 보고 새로 시작 — 기수 안 등수·참여 인원도 새 방식으로 푼 원우만) ④ 카드: **푼 뒤 해설을 닫으면 박스가 통째로 사라지고** 다음 주 새 문제가 오면 다시 생김(로그인 안 한 사람은 "나의 등수 보러가기" 안내 때문에 그대로), `use-quiz`는 일시 오류를 1.5초 뒤 한 번 더 시도 ⑤ 점검 `node scripts/check-quiz.mts`(일요일 경계·역대 퀴즈). ★ **문제가 20개뿐이라 20주(약 4.5개월) 뒤부터 처음 문제가 다시 나옴** — 뉴웨이브는 85개로 늘렸음(조사·검증 필요, 요청하면 진행). ★ 뉴웨이브의 운영자 "이번 주 다시 풀기"는 푼 뒤 박스가 사라져 화면에서 닿을 수 없어 안 옮김(서버 DELETE도 안 만듦). ★ 배포 전 — 배포하면 하루 한 문제 시절 성적·등수는 새로 시작하고 그 순간 이번 주(10/25 시작) 문제가 나옴(오늘 푼 사람도 새 문제를 다시 받음).
- **2026-10-27 홈 오른쪽 위 아이콘·그렇다/아니다 버튼을 뉴웨이브와 같게**(사용자): `components/PageHeader.tsx` 종·사람·톱니 27 → **25px**, 선 굵기 **1.55**, 색 ink-soft → **ink**(제목과 같은 먹색), 아이콘 사이 `-space-x-1.5` → `-space-x-px`, 맨 오른쪽 `-mr-1` → `-mr-[5.4px]`, 종만 1.5px 위로(아래 추 때문에 처져 보임). 모든 탭 헤더가 같은 `HeaderActions`라 **전 탭에 적용**. `DosanQuizCard` 그렇다/아니다: `h-[38px]`·글씨 15.5px·굵기 550(실제로는 600)·두 칸 사이 `gap-[9px]`·좌우 `-mx-[3.5px]`, 안 고른 칸 바탕 새 토큰 `--color-choice-box`(밝은 흰색, 어두운 `--dark-fill`), 정답 제출 단추 `-mx-[3px]`. ★ 종 빨간 점 자리(`top-[9.5px] right-[9px]`)는 안 건드림 — 아이콘이 작아져 종과의 간격이 조금 달라 보일 수 있음. 폰·실화면은 못 봄.

- 2026-10-27 사용자 "박스의 모서리 둥근 정도는 그 전으로": 홈 박스 모서리를 32px에서 원래 `rounded-card`로 되돌림(제목 크기·테두리·간격은 그대로).

- 2026-10-27 사용자 "왼쪽 상단에 애기애타 말고 뉴웨이브처럼 천유찬님": 홈 제목을 로그인하면 "이름님", 로그아웃이면 앱 이름(APP_DEFINITION_TITLE)으로.

- 2026-10-27 사용자 "이름님 글씨 크기·다이아몬드 버튼을 뉴웨이브처럼": 홈 제목 "이름님"을 17px/굵기 520(최대 9em)으로, 헤더 맨 왼쪽에 반짝이(SparkleIcon 23px) 단추 추가 — 누르면 도산 AI 방(로그인 전엔 채팅 탭).

- 2026-10-27 사용자 "도산 AI 옆 주황색 AI 표시 없애기(뉴웨이브처럼)": 채팅 목록 도산 AI 줄의 이름 옆 AI 배지를 뺌.

- 2026-10-27 사용자 "회색 박스 밑이 조금 보이는 것 해결": 도산 AI 안내 화면에서 지난 대화 맨 아래가 제목 줄 밑에 비치던 것을, 안내(AiGreeting)를 GREETING_BLEED=32px 더 키워 위로 밀어 가림(안쪽 위 여백으로 글 자리는 그대로, "지난 대화 보기" 스크롤에선 이 값을 뺌).

- 2026-10-27 사용자 "끈 위치 뉴웨이브처럼": 도산 AI 방(모든 방) 상대 프로필 사진·끈(AiOrb)을 말풍선 아랫변이 아니라 이름 줄 윗변에 맞춤(self-start + left-[1.5px]).

- 2026-10-27 사용자 "메시지 입력박스·전송버튼 디자인·크기 뉴웨이브처럼": 채팅 입력칸에서 보내기 단추를 44px 바깥 동그라미에서 30px 동그라미(화살표 16px, 입력칸 안쪽 오른쪽·아래 7px)로, 입력칸은 오른쪽 여백 46px·위 9px/아래 11px·그림자 없음. 이모티콘 단추는 이 앱에 없어 뺌.

- 2026-10-27 사용자 "탭 알약 채팅 아이콘을 뉴웨이브와 똑같이": 하단 탭 채팅 아이콘을 뉴웨이브 MessageIcon(둥근 말풍선, ChatTabIcon)으로 바꾸고 fit을 뉴웨이브 값(scale 0.886, y 0.82)으로. 다른 화면의 ChatIcon은 그대로.

- 2026-10-27 사용자 "탭 알약 자료 아이콘을 뉴웨이브와 똑같이": 자료 탭 아이콘(LibraryIcon)에서 폴더 안 재생 삼각형을 없앰(채운 것·선 모두, 뉴웨이브와 같음). 크기 보정값(fit)은 그대로.

- 2026-10-27 사용자 "투표 만들기·의견 모으기·역대 투표 박스에 뉴웨이브처럼 제목 바로가기": HomeShortcuts 맨 위에 제목 "바로가기"(18.5px/600, 높이 32px, 아래 8px) 추가. 박스 아래·위 여백은 그대로라 박스가 40px 커짐.

- 2026-10-27 사용자 "설정 화면 박스·알약 테두리 선 없애기": 설정 화면의 박스·알약·토글 줄에서 shadow-card(1px 테두리+번짐)를 뺌. 어두운 화면에서는 색 차이(#1d1f22 vs 검정)로만 구분됨.

- 2026-10-27 사용자 "홈 화면 추가 앱 아이콘 배경을 주황 단색(애기애타 테마색)으로": scripts/generate-icons.mjs의 바탕 그라데이션을 테마 주황 #FD5702(= --color-brand-500) 한 색으로 바꿔 `npm run icons`로 PNG·SVG 다시 만듦(기러기 무늬·글자는 그대로). 안드로이드 앱 아이콘(icons:android)은 건드리지 않음. 배포해야 반영(이미 홈 화면에 추가한 폰은 아이콘을 지웠다 다시 추가해야 바뀔 수 있음).

- 2026-10-27 사용자 "바로가기 박스에 위원회 탭 동호회 창으로 가는 동호회 버튼, 아이콘은 캔바로": HomeShortcuts에 4번째 칸 "동호회"(/news?tab=club) 추가, 소식 탭(news/page.tsx)이 ?tab=club이면 동호회 칸부터 열림. 아이콘 public/icons3d/club.png(캔바 3D 주황 깃발 96px, 원본 MEDIA MAHZLS8nT4k → 배경 제거 MAHZLeQXN6w).

- 2026-10-27 사용자 "다가오는 모임이 아직 없어요 박스는 뉴웨이브때처럼 없애줘": 홈에서 다가오는 모임이 없으면 그 칸(안내 문구 + "+ 등록" 단추)을 그리지 않음. 홈에서 일정 등록 시트를 여는 입구도 함께 없어짐(EventSheet·adding 제거). 모임이 있으면 D-day 카드는 그대로.

- 2026-10-27 사용자 "바로가기 박스를 도산 퀴즈 박스 밑으로": 홈 순서를 도산 퀴즈 → 바로가기 → (다가오는 모임) → 달력 → 열린 투표 → 푸터로. 퀴즈를 푼 뒤 퀴즈 박스가 사라지면 바로가기가 맨 위에 옴.

- 2026-10-27 사용자 "탭 알약 원우 탭 아이콘을 뉴웨이브 사랑방 탭 아이콘으로": 하단 탭 원우 아이콘을 사람 한 명(SoloPersonIcon, 뉴웨이브와 같은 모양·움직임)으로, fit은 뉴웨이브 값(scale 1.1, y 0.3). 다른 화면의 UsersIcon(두 사람)은 그대로.

- 2026-10-27 사용자 "천유찬님 왼쪽에 도산 아카데미 로고 흰색으로(뉴웨이브처럼)": 홈 제목 왼쪽에 기러기 로고 추가 — public/brand/logo-white.png(goose.png에서 기러기 실루엣만 따낸 흰색 투명 256×167)을 mask + bg-current로 그려 제목 글씨와 같은 색(밝은 화면 먹색·어두운 화면 흰색), 24×36.8px. 로그인 전에도 앱 이름 왼쪽에 나옴.

- 2026-10-27 사용자 "로고에 DOSAN ACADEMY·SINCE 1989 글씨가 없다": 홈 제목 로고를 기러기만이 아니라 둥근 마크 전체(글자 포함)로 — public/brand/logo-white.png를 goose.png 전체에서 다시 만듦(흰색+투명 320×320), 표시 36×36px.
