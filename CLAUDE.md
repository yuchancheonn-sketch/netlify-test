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
