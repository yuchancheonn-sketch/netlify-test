# 구글 플레이 출시 체크리스트 (Windows) — 2026-10-06 사용자 요청 (구글 플레이 출시 준비)

코드 쪽 준비(안드로이드 프로젝트·앱 로그인·푸시·아이콘·스토어 문서)는 저장소에 들어 있습니다. 이 문서는 **사용자만 할 수 있는 일**입니다.
앱 정보: 패키지 `app.web.aegiaeta`(첫 업로드 후 변경 불가) · 이름 애기애타 · 사이트 https://aegiaeta.web.app · Firebase 프로젝트 `aegiaeta10`.
방식(B): 화면 파일을 앱 안에 담고(`npm run build:app` → `app-dist/`), 서버 창구(/api)는 https://aegiaeta.web.app 을 그대로 부릅니다.
※ 이 컴퓨터(리눅스)에서는 Gradle·폰 테스트를 못 해 봤습니다. 아래 절차는 처음 해 보는 것이니 막히면 오류 메시지를 알려 주세요.

## 0. 먼저: 웹 배포
- 구글 플레이가 요구하는 **/privacy, /terms, /account-deletion** 주소는 웹을 배포해야 열립니다("배포해줘"). 앱의 카카오 로그인 복귀(/auth/kakao 변경)도 웹 배포가 있어야 됩니다.
- `src/lib/constants.ts`의 `CONTACT_EMAIL`(지금 비어 있음)에 운영진 이메일을 넣고 배포하세요(방침·삭제 안내에 보임).
- 보안 규칙(firestore.rules)은 **웹 먼저, 규칙 나중** 순서로 배포합니다(CLAUDE.md "보안 점검 후 수정").

## 1. 개발 도구 설치
1. **Node.js**(이미 있음)와 `npm install`.
2. **JDK 21(Temurin)**: `winget install EclipseAdoptium.Temurin.21.JDK` — Android Studio에 들어 있는 자바는 25라 Gradle이 못 읽습니다("class file major version 69").
3. **Android Studio** 설치 → 첫 실행 마법사에서 Android SDK 설치(기본 위치 `%LOCALAPPDATA%\Android\Sdk`).
4. `android\local.properties` 파일을 만들고 한 줄: `sdk.dir=C\:\\Users\\<사용자>\\AppData\\Local\\Android\\Sdk` (이 파일은 gitignore됨).
5. 터미널에서(빌드할 때마다 같은 창에서):
   ```
   set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.x.x.x-hotspot
   set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
   ```
   (JDK 폴더 이름은 설치된 버전에 맞게 확인)

## 2. Firebase에 안드로이드 앱 등록
1. Firebase 콘솔 → 프로젝트 `aegiaeta10` → 프로젝트 설정 → 일반 → "앱 추가" → 안드로이드.
2. 패키지 이름 **app.web.aegiaeta** 입력, 앱 닉네임 "애기애타 안드로이드".
3. **디버그 SHA 지문 얻기**: `cd android` → `gradlew.bat signingReport` → `Variant: debug`의 **SHA1**, **SHA-256**을 복사해 같은 화면 "SHA 인증서 지문 추가"에 입력. (구글 로그인·휴대폰 인증이 이 지문으로 앱을 확인합니다. 처음 실행하면 `~/.android/debug.keystore`가 자동 생성됩니다.)
4. `google-services.json` 다운로드 → **`android\app\google-services.json`** 에 넣기. (이 파일은 비밀이 아닌 공개 설정이라 커밋해도 됩니다. 이 파일이 없어도 빌드는 되지만 로그인·푸시가 동작하지 않습니다.)
5. 콘솔 → Authentication → 로그인 방법에서 **Google**과 **전화**가 켜져 있는지 확인. 전화 인증은 Google Cloud 콘솔에서 **Play Integrity API**도 사용 설정해야 할 수 있습니다(오류가 나면 안내 메시지를 알려 주세요).
6. (카카오) 카카오 개발자 콘솔의 Redirect URI에 `https://aegiaeta.web.app/auth/kakao` 가 이미 있어야 하고, 서버가 이 주소를 허용 목록에 갖고 있어야 합니다(웹 로그인과 같은 주소라 보통 이미 됨).

## 3. 폰에서 시험 (디버그 APK)
1. 저장소 루트에서 `npm run app:sync` (= `npm run build:app` + `cap sync android`). **웹 화면을 바꿀 때마다 다시** 해야 앱에 반영됩니다.
2. `cd android` → `gradlew.bat assembleDebug --no-daemon` (첫 빌드는 5분 이상).
3. 결과: `android\app\build\outputs\apk\debug\app-debug.apk` → 폰으로 옮겨 설치(설정에서 "출처를 알 수 없는 앱 설치 허용"). 또는 USB 디버깅이 되면 `adb install`.
4. 확인할 것: 구글 로그인 / 휴대폰 로그인 / 카카오 로그인(브라우저 → 앱 복귀) / 채팅방 열기 / 알림 켜기 → 다른 계정이 채팅을 보내면 알림 / 알림을 누르면 해당 화면 / 안드로이드 뒤로 가기 / 하단 탭바와 내비게이션 바가 겹치지 않는지.
5. 카카오가 "아직 준비되지 않았어요"면 `apphosting.yaml`의 `NEXT_PUBLIC_KAKAO_REST_API_KEY`가 앱 빌드에 들어갔는지 확인(build:app이 이 파일에서 읽음).

## 4. 업로드 키 만들기 (저장소 밖!)
1. 키 폴더 만들기: `mkdir %USERPROFILE%\aegiaeta-keys`
2. `"%JAVA_HOME%\bin\keytool" -genkeypair -v -keystore %USERPROFILE%\aegiaeta-keys\aegiaeta-upload.jks -alias aegiaeta-upload -keyalg RSA -keysize 2048 -validity 10000` — 비밀번호를 정하고 **따로 안전하게 백업**(분실하면 플레이 콘솔에서 업로드 키 재설정을 요청해야 함).
3. `android\keystore.properties` 파일 만들기(gitignore됨 — 커밋 금지):
   ```
   storeFile=C:/Users/<사용자>/aegiaeta-keys/aegiaeta-upload.jks
   storePassword=<비밀번호>
   keyAlias=aegiaeta-upload
   keyPassword=<비밀번호>
   ```
4. `.jks`와 `keystore.properties`는 절대 저장소에 넣지 마세요(.gitignore가 막지만 확인).

## 5. 정식 파일(AAB) 만들기
1. `npm run app:sync`
2. `cd android` → `android\app\build.gradle`의 **versionCode**를 올릴 때마다 1씩 올립니다(처음은 1; 같은 번호는 업로드 거절). versionName은 사람이 보는 이름.
3. `gradlew.bat bundleRelease --no-daemon` → `android\app\build\outputs\bundle\release\app-release.aab`

## 6. Play Console
1. 개발자 계정(개인) 등록 완료 상태에서 "앱 만들기": 이름 애기애타, 언어 한국어, 앱, 무료.
2. 대시보드의 "앱 설정" 항목을 `store-assets/play-console-answers.md` 대로 채웁니다(개인정보처리방침 URL, 앱 액세스, 광고, 콘텐츠 등급, 타겟층, 데이터 보안, 계정 삭제 URL).
3. 스토어 등록정보: `store-assets/listing-ko.md` 문구, `play-icon-512.png`, `play-feature-1024x500.png`, 폰 스크린샷 2장 이상(직접 캡처).
4. 테스트 → **비공개 테스트** 트랙 만들기 → 위 AAB 업로드 → 테스터 12명 이상 추가(이메일 목록) → 14일 유지. 자세한 요령은 `store-assets/production-access-notes.md`.
5. 14일 뒤 "프로덕션 액세스 신청" → 승인되면 프로덕션 트랙에 올려 심사.

## 7. 첫 업로드 뒤: 플레이 앱 서명 지문을 Firebase에 추가 (꼭!)
플레이 스토어로 설치한 앱은 구글이 다시 서명한 키로 배포됩니다. 그 지문이 Firebase에 없으면 **구글 로그인·휴대폰 인증이 스토어 앱에서 실패**합니다.
1. Play Console → 앱 → 설정 → **앱 무결성**(앱 서명) → "앱 서명 키 인증서"의 SHA-1·SHA-256 복사. (업로드 키 지문도 같은 화면에 있으니 같이 추가해도 됩니다.)
2. Firebase 콘솔 → 프로젝트 설정 → 안드로이드 앱 → SHA 인증서 지문 추가 → 새 `google-services.json`을 받아 `android\app\google-services.json`을 교체(바뀐 것이 있으면) → 앱 다시 빌드.

## 8. 심사용 시험 계정 (★ 심사가 끝나면 반드시 삭제)
구글 심사원이 로그인할 계정이 필요합니다. 실제 문자를 받을 수 없으니 Firebase의 **시험용 전화번호**를 씁니다.
1. `.env.local`이 있어야 합니다(없으면 `firebase.cmd login` 후 `npm run setup:env`).
2. `node scripts/play-review-account.mjs create` → 시험 번호 `010-0000-0000` / 인증번호 `000000`(문자 안 감) + 로그인 계정 `play-review` + 10기 일반 회원 문서를 만듭니다.
   (수동으로 하려면 Firebase 콘솔 → Authentication → 로그인 방법 → 전화 → "테스트용 전화번호"에 `+82 10 0000 0000` / `000000`.)
3. Play Console "앱 액세스"에 "휴대폰 번호 010-0000-0000, 인증번호 000000으로 로그인" 안내를 입력.
4. ★ **심사가 끝나면 `node scripts/play-review-account.mjs delete`** — 이 번호+코드를 아는 누구나 로그인할 수 있기 때문입니다.
5. ⚠ 주의: 이 앱은 가입한 원우 누구나 원우수첩(전화번호 포함)을 읽는 구조라, 시험 계정으로 들어간 심사원도 원우 정보를 볼 수 있습니다. 심사 기간을 짧게 하고, 외부 테스터에게는 이 계정을 주지 마세요. (근본 해결: 가입 승인제 등 — CLAUDE.md "열어 둔 권고")

## 9. 평소 규칙
- **웹 화면을 고칠 때마다 `npm run app:sync`** 를 다시 하고(앱 안에 화면 파일이 들어 있음), 앱을 스토어에 새로 올리려면 **versionCode를 올려** AAB를 다시 만듭니다. 서버 창구(/api)·보안 규칙은 웹 배포로 바뀌므로 앱 재배포가 필요 없습니다.
- 아이콘·시작 화면을 바꾸면 `npm run icons`(웹) → `npm run icons:android`(앱) 순서로.
- 구글 플레이 정책: 사용자 생성 콘텐츠 앱은 신고·차단·삭제 방법이 있어야 합니다(이미 구현됨). 약관·방침은 법률 검토 전 초안입니다.
- 카카오 로그인의 앱 복귀는 `app.web.aegiaeta://` 주소(커스텀 스킴)를 쓰는데, 다른 앱이 같은 주소를 가로챌 이론상 위험이 있습니다. 나중에 안드로이드 App Links(assetlinks.json)로 올릴 수 있습니다.
