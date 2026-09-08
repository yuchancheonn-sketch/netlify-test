# 애기애타 10기 앱 — 무엇이 어디서 어떻게 도는가

이 문서는 **이 앱을 이루는 프로그램들이 각각 무슨 일을 맡고, 서로 어떻게 물려 돌아가는지**를 적은 지도입니다.
설치·설정 절차는 [README.md](README.md)에, 화면 디자인 규칙은 [src/app/globals.css](src/app/globals.css)에 있습니다.

기준 시점: 2026-09-08 · 배포본 https://aegiaeta10.netlify.app

---

## 0. 한 문단 요약

브라우저에서 도는 **Next.js 웹앱(PWA)** 하나가 앱의 거의 전부입니다.
데이터는 서버를 거치지 않고 **브라우저가 Firestore와 직접** 주고받고, 그 접근 제어는 오직 **firestore.rules**가 합니다.
서버(Netlify 함수)는 딱 네 가지 일만 합니다 — **푸시 알림 발송**, **도산아카데미 RSS 대신 받기**, **유튜브 목록 대신 받기**, **서비스워커 파일 만들어 내려주기**.
사진은 두 갈래입니다 — 프로필 사진은 **Firestore 문서 안에 글자로**, 행사 사진은 **Cloudinary**로.
이 모든 갈래는 "**신용카드 없이 무료로 운영한다**"는 제약 하나에서 나왔습니다.

---

## 1. 전체 구성도

```
                     ┌──────────────────────────── 원우의 폰 ────────────────────────────┐
                     │                                                                  │
                     │   [ 앱 화면 ]  Next.js App Router (React 19, "use client")        │
                     │        │                                                         │
                     │        ├── firebase-js-sdk (auth / firestore / messaging)         │
                     │        │        │                                                │
                     │        │        └── IndexedDB 오프라인 캐시 (persistentLocalCache) │
                     │        │                                                         │
                     │        └── localStorage : 글씨크기·화면밝기·알림 켬끔             │
                     │                                                                  │
                     │   [ 서비스워커 ]  /firebase-messaging-sw.js                        │
                     │        앱이 꺼져 있어도 살아서 알림을 띄움                          │
                     └───┬───────────────┬──────────────────┬───────────────┬────────────┘
                         │               │                  │               │
          ① 로그인       │    ② 데이터    │      ③ 사진      │    ④ 서버 호출 │
                         ▼               ▼                  ▼               ▼
                 ┌──────────────┐ ┌─────────────┐  ┌──────────────┐ ┌────────────────────────┐
                 │ Firebase     │ │ Firestore   │  │ Cloudinary   │ │ Netlify (Next.js 서버)  │
                 │ Auth         │ │             │  │              │ │                        │
                 │ (Google 계정)│ │ firestore.  │  │ unsigned     │ │ /api/push/chat         │
                 │              │ │ rules 가    │  │ upload       │ │ /api/push/event        │
                 │              │ │ 문지기      │  │ 25GB 무료    │ │ /api/dosan             │
                 └──────────────┘ └─────────────┘  └──────────────┘ │ /api/videos            │
                                        ▲                           │ /firebase-messaging-sw │
                                        │                           └───┬────────┬────────┬──┘
                                        │  firebase-admin (규칙 건너뜀)  │        │        │
                                        └────────────────────────────────┘        │        │
                                                        │                          │        │
                                                        ▼                          ▼        ▼
                                                 ┌─────────────┐         ┌──────────┐ ┌──────────┐
                                                 │ FCM         │         │dosan21.kr│ │ YouTube  │
                                                 │ 웹 푸시     │────────▶│ /rss     │ │ Data API │
                                                 └─────────────┘  알림   └──────────┘ └──────────┘
```

**핵심은 화살표 ②가 서버를 거치지 않는다는 점입니다.** 목록·글쓰기·실시간 갱신이 전부 브라우저 ↔ Firestore 직통입니다.
그래서 서버가 죽어도 앱의 본체는 돌고, 대신 **보안은 전부 firestore.rules 한 파일에 걸려 있습니다.**

---

## 2. 밖에 있는 프로그램들 (외부 서비스)

| 서비스 | 맡은 역할 | 왜 이걸 골랐나 | 없거나 죽으면 |
|---|---|---|---|
| **GitHub** (`yuchancheonn-sketch/netlify-test`) | 소스 보관 · 배포 방아쇠 | 공개 저장소 → **개인정보(연락처 등)를 절대 커밋하면 안 됨** | 배포만 못 함 |
| **Netlify** | 웹앱 호스팅 · Next.js 서버 런타임 · CDN 캐시 | 무료(월 빌드 300분). `main`에 push하면 자동 배포 | 앱 전체 접속 불가 |
| **Firebase Authentication** | Google 계정 로그인 하나만 | 계정을 우리가 안 만들어도 됨. 비밀번호를 안 다뤄도 됨 | 아무도 못 들어옴 |
| **Cloud Firestore** | 앱의 모든 데이터 + 실시간 구독 | 무료 한도(읽기 5만/일)로 50명이면 충분. `onSnapshot`으로 새로고침 없이 갱신 | 앱은 뜨지만 빈 화면 (캐시분만 보임) |
| **Firebase Cloud Messaging (FCM)** | 웹 푸시 알림 전달 | Blaze(유료) 없이 쓸 수 있는 유일한 푸시 경로 | 알림만 안 옴 |
| **firebase-admin** (Netlify 서버 안) | 보안 규칙을 **건너뛰고** 토큰 모아 발송 · 로그인 토큰 검증 | 클라이언트는 남의 토큰을 못 읽어야 하므로 | 알림만 안 옴 |
| **Cloudinary** | 행사 사진 원본 보관 + 썸네일 변환 | Firebase Storage가 2024년 9월 이후 프로젝트에서 **카드 필수**라서 | 사진 탭에 "설정 안 됨" 안내 |
| **dosan21.kr `/rss`** | 소식 탭의 원본 | 화면 긁기가 아니라 공식 피드라 사이트가 바뀌어도 버팀 | 소식 탭만 오류 |
| **YouTube** (`@dosanacademy`) | 복습 영상 목록 | 키가 있으면 전편, 없으면 채널 RSS로 최근 15편 | 자료 탭 영상만 비어 있음 |
| **Google Fonts** | Noto Sans KR / Noto Serif KR | `next/font`가 **빌드 때 받아 자체 호스팅** → 실행 중 외부 요청 없음 | 영향 없음 |

**쓰지 않는 것: Firebase Storage.** [src/lib/firebase.ts](src/lib/firebase.ts)에서 `getStorage()`를 일부러 뺐습니다(안 쓰는데 136KB 번들이 딸려와서). [storage.rules](storage.rules)와 `next.config.ts`의 storage 호스트 허용은 나중을 위해 남겨둔 껍데기입니다.

**쓰지 않는 것: Cloud Functions.** Blaze 요금제를 요구합니다. 그래서 "일이 벌어지면 서버가 알아서 알림을 보내는" 구조 대신 **일을 벌인 브라우저가 직접 `/api/push/*`를 두드리는** 구조를 씁니다.

---

## 3. 우리 코드가 도는 세 자리

같은 저장소 안이지만 **실행되는 장소가 셋**이고, 각자 볼 수 있는 것이 다릅니다.

### ① 브라우저 (거의 모든 파일)
`"use client"`가 붙은 파일 전부. 사용자의 로그인 상태로 Firestore에 직접 붙습니다.
`NEXT_PUBLIC_*` 환경변수만 보이고, 그 값들은 빌드 때 코드 안에 박혀 누구나 볼 수 있습니다 (Firebase 웹 설정값은 원래 공개값이라 문제 없음).

### ② Netlify 서버 (라우트 핸들러 5개)
[src/app/api/](src/app/api/)와 [src/app/firebase-messaging-sw.js/route.ts](src/app/firebase-messaging-sw.js/route.ts).
`import "server-only"`가 붙은 [lib/firebase-admin.ts](src/lib/firebase-admin.ts)·[lib/push-server.ts](src/lib/push-server.ts)는 **여기서만** 불릴 수 있습니다(브라우저에서 import하면 빌드가 멈춤).
`FIREBASE_SERVICE_ACCOUNT`, `YOUTUBE_API_KEY`는 이 자리에만 있습니다.

### ③ 서비스워커 (앱이 꺼져 있어도 도는 코드)
`/firebase-messaging-sw.js`. **파일이 아니라 라우트가 만들어 냅니다** — Firebase 설정값을 `public/`에 커밋하지 않으려고. `force-static`이라 빌드 때 한 번 생성되고 그 뒤로는 정적 파일처럼 내려갑니다.
안에서 npm 모듈을 못 쓰므로 gstatic의 `firebase-*-compat.js`를 `importScripts`로 불러옵니다.

---

## 4. 앱을 열면 벌어지는 일 (순서대로)

```
1. Netlify가 HTML을 내려줌
2. <body> 맨 앞 인라인 스크립트(DISPLAY_SETTINGS_SCRIPT)가 실행
   → localStorage를 읽어 <html>에 data-text-scale / data-theme을 붙임
   → 리액트보다 먼저 도는 이유: 나중에 하면 "보통 크기 → 큰 글씨"로 화면이 번쩍임
3. 리액트 시동. AuthProvider가 두 가지를 구독
   ├─ onAuthStateChanged(auth)          → Google 로그인 상태
   └─ onSnapshot(users/{uid})           → 내 프로필 문서 (운영진이 승인하면 즉시 반영)
4. 그 둘로 stage 하나를 계산
      loading → signedOut → needsSignUp → pending → needsOnboarding → ready
5. StageGate가 stage에 맞는 화면으로 보냄
      signedOut      → /login       Google 버튼 하나
      needsSignUp    → /join        users 문서를 만들고 곧바로 통과 (화면은 안 보임)
      pending        → /pending     "운영진 확인 중" (status != approved)
      needsOnboarding→ /onboarding  이름만 넣으면 통과
      ready          → /home        본편
6. (main) 그룹에 들어가면
   ├─ PushSync           이미 알림 켠 기기면 FCM 토큰을 조용히 갱신
   ├─ PushPermissionPrompt  이 기기에서 아직 안 물어봤으면 딱 한 번 물음
   └─ MainShell          폭 560px 가운데 정렬 + 하단 알약 탭바
```

> **StageGate는 길 안내일 뿐입니다.** 브라우저에서 코드를 고쳐 `/members`를 억지로 열어도, 데이터는 firestore.rules가 막습니다(로그인 안 했으면 아무것도 안 내려옴).

---

## 5. 화면 지도

하단 탭 5개 — **홈 / 원우 / 자료 / 채팅 / 소식** ([BottomTabBar.tsx](src/components/BottomTabBar.tsx))

| 주소 | 화면 | 하는 일 | 읽는 곳 |
|---|---|---|---|
| `/home` | 홈 | D-day 카드 + 오늘의 도산 + 수업 기록 10줄 | `events`, `sessions` |
| `/events` | 모임 (목록/캘린더 전환) | 지난 일정은 **화면에서만** 감춤 | `events` |
| `/events/[id]` | 모임 상세 | 참석/불참/미정 응답 + 참석자 얼굴 | `events/{id}/rsvps` |
| `/events/new`, `/[id]/edit` | 일정 등록·수정 | **운영진만**. 새 일정만 알림 발송 | — |
| `/members` | 원우수첩 | 가입자+미가입 명단 합친 가나다순. **누구나 남의 칸 수정** | `users` + `roster` |
| `/library` | 자료 (영상/사진) | 복습 영상 = 유튜브, 행사 사진 = 앨범 | `/api/videos`, `photoAlbums` |
| `/albums/[id]` | 앨범 | 사진 올리기(여러 장)·좋아요·전체화면 뷰어 | `photoAlbums/{id}/photos` |
| `/sessions/[week]` | 주차별 수업 | 1·2교시 영상 + 느낀점 댓글(1단 답글) | `sessions/{week}` |
| `/chat` | 채팅 목록 | 단체방 고정 + 1:1 최근순, 안 읽은 배지 | `chatRooms` |
| `/chat/[roomId]` | 대화방 | 탭바 감춤, 밀어서 뒤로가기 | `chatRooms/{id}/messages` |
| `/news` | 소식 | 도산아카데미 공지 → 누르면 원문으로 | `/api/dosan` |
| `/profile` | 내 프로필 | 프로필 편집 + 로그아웃 + 운영진 화면 입구 | `users/{uid}` |
| `/settings` | 설정 | 알림 · 글씨 크기 · 화면 밝기 (**기기마다 따로**) | localStorage |
| `/admin` | 운영진 화면 | 가입 승인 · 명단 관리 · 권한 부여 | `users`, `roster` |
| `/keyboard-test` | (개발용) | 키보드 올라올 때 레이아웃 확인. 아직 커밋 안 됨 | — |

---

## 6. 데이터 구조 (Firestore)

| 컬렉션 | 문서 id | 담는 것 | 규칙 |
|---|---|---|---|
| `users/{uid}` | 로그인 uid | 이름·별칭·회사·직책·휴대폰·원우회 직위·소개·소개영상·**프로필 사진(data URL)**·role·status | 로그인하면 누구나 읽기/쓰기 |
| `roster/{id}` | 자동 | 아직 가입 안 한 원우 이름 + 미리 채워둔 정보 + `linkedUid` | 로그인하면 누구나 |
| `events/{id}` | 자동 | 제목·날짜·시각·장소·설명 | 로그인하면 누구나 |
| `events/{id}/rsvps/{uid}` | 응답자 uid | attending / notAttending / undecided | 로그인하면 누구나 |
| `sessions/{week}` | `"1"`~`"11"` | 주제·강사·`videoUrl`(1교시)·`videoUrl2`(2교시)·`commentCount` | 로그인하면 누구나 |
| `sessions/{week}/comments/{id}` | 자동 | 느낀점. `parentId`(1단 답글), `period` | 읽기 자유 / **쓰기는 본인 이름만**, 수정 금지, 삭제는 본인 것만 |
| `photoAlbums/{id}` | 자동 | 앨범 제목·행사일·대표사진·장수 | 로그인하면 누구나 |
| `photoAlbums/{id}/photos/{id}` | 자동 | Cloudinary 주소·크기·좋아요 배열 | 로그인하면 누구나 |
| `chatRooms/{roomId}` | `main` 또는 `uidA__uidB` | 종류·제목·`memberUids`·마지막 메시지 미리보기 | **방에 낀 사람만** |
| `chatRooms/{roomId}/messages/{id}` | 자동 | 보낸이·본문·시각 | 방에 낀 사람만. **수정·삭제 불가** |
| `chatReads/{uid}` | 본인 uid | 방별 마지막으로 본 시각 | **본인만** |
| `pushTokens/{FCM토큰}` | FCM 토큰 | 그 기기 주인 uid·userAgent | 본인 것 하나만. **list는 아무에게도 안 엶** |
| `pushLog/{event:id}` | `event:{eventId}` | 일정 알림 중복 방지 표시 | **규칙에 없음 = 클라이언트 전면 차단** (서버 전용) |

### 눈여겨볼 설계

- **프로필 사진이 문서 안에 글자로 들어 있습니다** (192px JPEG data URL, 8~15KB). Storage를 못 써서 그런데, 그 대가로 `users` 목록을 한 번 받을 때마다 40명 × 15KB가 함께 내려옵니다. **월 전송량 10GiB를 갉아먹는 가장 큰 요인**입니다. 그래서 채팅 메시지에는 사진을 복사해 넣지 않고(옛 필드 `senderPhotoURL`은 유물), 읽음 기록도 `users`가 아니라 가벼운 `chatReads`에 따로 뒀습니다.
- **1:1 방 id는 두 uid를 정렬해 `__`로 이은 값**입니다. 그래서 누가 먼저 말을 걸어도 방이 하나고, **보안 규칙이 문서를 읽지 않고 id만 보고** 참여자를 판정할 수 있습니다(읽기 요금 절약).
- **방은 첫 메시지를 보낼 때 생깁니다.** 예전엔 미리 만들어서 빈 방이 목록에 떴습니다.

---

## 7. 파일별 역할

### 7-1. 기반 (`src/lib/`)

| 파일 | 역할 |
|---|---|
| [firebase.ts](src/lib/firebase.ts) | Firebase 시동. **IndexedDB 오프라인 캐시**를 켜고(멀티탭), 설정이 비면 가짜 값으로 초기화만 통과시켜 "설정 필요" 안내를 띄울 수 있게 함 |
| [auth-context.tsx](src/lib/auth-context.tsx) | 로그인 상태 + 내 프로필 구독 → `stage` 하나로 압축. 로그인 실패 코드를 한국어로 번역. 팝업이 막히면 리디렉트로 재시도 |
| [types.ts](src/lib/types.ts) | 모든 Firestore 문서 모양. **옛 필드를 왜 안 지웠는지**가 주석에 남아 있음 |
| [constants.ts](src/lib/constants.ts) | 앱 이름·기수·기간·색·글자 제한·타임아웃. 기수가 바뀌면 여기만 고침 |
| [hooks.ts](src/lib/hooks.ts) | **데이터 구독 전부.** `useApprovedMembers` `useEvents` `useSessions` `useMessages` `useMyChatRooms` `useUnreadCounts` … 정렬은 색인을 안 만들려고 대부분 앱에서 함 |
| [firestore-commit.ts](src/lib/firestore-commit.ts) | `commitWrite()` — 저장을 **2.5초까지만** 기다리고 `"queued"`로 넘어감. 오프라인 캐시 때문에 약속이 영영 안 풀리는 문제의 해법 |
| [directory.ts](src/lib/directory.ts) | `users` + `roster`를 **이름 가나다순 한 권**으로 합침. 본인이 채운 값이 명단 값보다 우선 |
| [roster-link.ts](src/lib/roster-link.ts) | 프로필 저장 시 같은 이름 명단을 찾아 `linkedUid`로 못 박고 정보를 옮겨 담음 (directory.ts가 눈속임이면 이쪽이 실제 통합) |
| [chat-rooms.ts](src/lib/chat-rooms.ts) | 방 id 계산 · 메시지 전송 · 단체방 인원 동기화 · 미리보기 자르기 |
| [chat-read.ts](src/lib/chat-read.ts) | "이 방 지금 다 읽음" 기록 |
| [session-comments.ts](src/lib/session-comments.ts) | 느낀점 쓰기/지우기 + `commentCount`를 `increment`로 조정 |
| [sessions.ts](src/lib/sessions.ts) | 1·2교시 규칙 (옛 댓글은 1교시로 봄) |
| [quotes.ts](src/lib/quotes.ts) | 흥사단 공식 "도산의 말씀" 14개. **날짜만으로** 골라서 그날은 모두가 같은 말씀을 봄 |
| [image.ts](src/lib/image.ts) | 브라우저에서 캔버스로 축소. 프로필은 정사각 잘라 **40KB 안에 들어올 때까지 화질을 낮춤** |
| [cloudinary.ts](src/lib/cloudinary.ts) | unsigned 업로드(XHR로 진행률 표시) + 주소에 변환 옵션 끼워 넣어 썸네일/뷰어/원본 주소 생성 |
| [video.ts](src/lib/video.ts) | 원우가 붙여넣은 유튜브·비메오 주소를 어떤 모양이든 알아봄. `youtube-nocookie`로 재생 |
| [youtube.ts](src/lib/youtube.ts) / [rss.ts](src/lib/rss.ts) | 채널 RSS·홈페이지 RSS 파싱 (정규식. XML 파서 안 들임) |
| [format.ts](src/lib/format.ts) | 날짜·시간·전화번호 한국어 표기. `new Date("2026-09-06")`의 UTC 함정을 피해 직접 자름 |
| [push.ts](src/lib/push.ts) | **기기 쪽** 알림 — 권한 요청, FCM 토큰 등록/삭제, `/api/push/*` 호출 |
| [push-server.ts](src/lib/push-server.ts) | **서버 쪽** 발송 — 토큰 모아 multicast, 죽은 토큰 청소 |
| [firebase-admin.ts](src/lib/firebase-admin.ts) | Admin SDK 시동. 서비스 계정이 없으면 `null`을 돌려 **알림만 조용히 꺼짐** |
| [display-settings.ts](src/lib/display-settings.ts) | 글씨 크기·화면 밝기. **훅이 하나도 없음** — 서버 컴포넌트인 layout이 인라인 스크립트를 가져다 쓰기 때문 |
| [use-display-settings.ts](src/lib/use-display-settings.ts) / [use-push.ts](src/lib/use-push.ts) | 브라우저 바깥 상태를 **`useSyncExternalStore`**로 구독. 이 저장소는 `react-hooks/set-state-in-effect` 린트가 켜져 있어 effect 안 setState는 **빌드가 막힘** |
| [use-swipe-back.ts](src/lib/use-swipe-back.ts) / [use-drag-down-to-close.ts](src/lib/use-drag-down-to-close.ts) | 오른쪽으로 밀어 뒤로 / 시트 손잡이 끌어 닫기 |

### 7-2. 화면 조각 (`src/components/`)

| 파일 | 역할 |
|---|---|
| [StageGate.tsx](src/components/StageGate.tsx) | 단계에 안 맞는 화면이면 돌려보냄 + 스플래시 + "설정 필요" 안내 |
| [MainShell.tsx](src/components/MainShell.tsx) | 폭 560px 가운데 정렬, 탭바 자리 여백, **대화방에서는 탭바 숨김**, 탭바 아래 흐림 층 |
| [BottomTabBar.tsx](src/components/BottomTabBar.tsx) | 알약 탭바. 같은 탭 다시 누르면 맨 위로, 손가락으로 알약 끌기, 채팅 안읽음 배지 |
| [PageHeader.tsx](src/components/PageHeader.tsx) | 제목 줄 + 뒤로가기 + 오른쪽 프로필·설정 아이콘. `safe-area-inset-top` 직접 챙김 |
| [PortraitGuard.tsx](src/components/PortraitGuard.tsx) | 폰을 눕히면 덮음. **진짜 잠그는 게 아님** — 잠글 방법이 없어서 CSS로 덮음 |
| [ThemeSync.tsx](src/components/ThemeSync.tsx) | 앱을 켜 둔 채 폰 다크모드가 바뀌면 따라감 |
| [PushSync.tsx](src/components/PushSync.tsx) / [PushPermissionPrompt.tsx](src/components/PushPermissionPrompt.tsx) | 토큰 갱신 / 첫 기기에 딱 한 번 묻기 (**아이폰은 손가락 누른 그 순간에 물어야** 창이 뜸) |
| [ProfileForm.tsx](src/components/ProfileForm.tsx) | 온보딩·프로필 편집 공용. 사진 축소 → data URL, 저장 시 roster 연결 |
| [MemberEditSheet.tsx](src/components/MemberEditSheet.tsx) | 원우수첩 칸 수정. 가입자면 `users`, 미가입이면 `roster`에 씀. 새 이름 추가도 여기 |
| [EventCard.tsx](src/components/EventCard.tsx) / [EventForm.tsx](src/components/EventForm.tsx) / [MonthCalendar.tsx](src/components/MonthCalendar.tsx) | 주황 일정 카드(홈·상세 공용) / 등록·수정 폼 / 월간 달력 |
| [SessionList.tsx](src/components/SessionList.tsx) / [SessionEditSheet.tsx](src/components/SessionEditSheet.tsx) / [SessionComments.tsx](src/components/SessionComments.tsx) | 수업 10줄 / 주제·강사·영상 입력 / 느낀점 |
| [PhotoViewer.tsx](src/components/PhotoViewer.tsx) | 전체화면 뷰어 (좌우 스와이프·키보드) |
| [Avatar.tsx](src/components/Avatar.tsx) | 사진 없으면 이름 해시로 항상 같은 색 |
| [SegmentedControl.tsx](src/components/SegmentedControl.tsx) | 주황 상자가 미끄러지는 고르개 (설정·교시 전환) |
| [ui.tsx](src/components/ui.tsx) / [icons.tsx](src/components/icons.tsx) | 카드·버튼·스켈레톤·빈 상태 / 인라인 SVG 아이콘 (라이브러리 안 씀) |

---

## 8. 기능별 동선 — 실제로 이렇게 흐릅니다

### 8-1. 채팅 한 통 보내면

```
[대화방 입력창]
  └─ sendChatMessage()                             lib/chat-rooms.ts
       ├─ addDoc(chatRooms/{room}/messages)        보낸이 이름만 함께, 사진은 안 넣음
       ├─ setDoc(chatRooms/{room}, merge)          마지막 메시지 미리보기 갱신
       │                                            (1:1이면 memberUids도 이때 적음)
       └─ requestPush("chat", {roomId, text})      기다리지 않고 던짐
            │  Authorization: Bearer <ID토큰>
            ▼
       POST /api/push/chat                          Netlify 서버
            ├─ verifyIdToken()                      진짜 그 사람이 맞는지
            ├─ 받는 사람 추리기                      단체방=memberUids, 1:1=roomId.split("__")
            ├─ 보낸 사람 이름은 users에서 직접 읽음  (클라이언트 말을 안 믿음)
            └─ sendPushToUsers()                    lib/push-server.ts
                 ├─ pushTokens where uid in [...]   30개씩 나눠서
                 ├─ sendEachForMulticast()          notification 없이 data만
                 └─ 죽은 토큰 문서 삭제
                      ▼
                 FCM ──▶ 받는 사람 폰의 서비스워커
                          onBackgroundMessage → showNotification (제목·아이콘·tag를 우리가 결정)
                          notificationclick → 열린 창을 그 방으로 옮기거나 새로 엶
```

한편 **다른 원우 화면에서는** `useMessages`의 `onSnapshot`이 즉시 새 메시지를 받아 그립니다. 알림과 화면 갱신은 완전히 별개 경로입니다.

### 8-2. 안 읽은 개수 배지

이 앱에서 제일 까다로운 부분입니다.

```
useMyChatRooms      내가 낀 방 목록
    ↓
useChatReadTimes    chatReads/{uid} 구독 → 방별 "마지막으로 본 시각"
    │  ★ serverTimestamps: "estimate"  ─ 없으면 서버 도착 전까지 null로 보여
    │     배지가 안 사라짐
    │  ★ 기록 없는 방은 지금 시각으로 기준을 잡되 requested Set으로 화면당 한 번만
    │     (2026-09-05, 이 되먹임으로 Firestore 무료 한도를 태웠음)
    ↓
useUnreadCounts     방마다 createdAt > 본 시각 인 메시지를 최대 99개까지만 구독
    │               내가 보낸 건 제외
    ↓
useUnreadChatCount  전부 합쳐 탭바 배지로
```

읽음 기록은 **8초에 한 번만**(`MARK_READ_GAP`) 씁니다. 메시지마다 쓰면 단체방 40명 × 메시지 1통 = 쓰기 40건이 나가고, 그 기록이 바뀔 때마다 안읽음 구독이 전부 끊겼다 붙습니다.

### 8-3. 원우수첩 — 가입자와 미가입자가 한 줄로 합쳐지는 과정

```
운영진이 명단에 "홍길동" 추가 ──▶ roster/{id} { name: "홍길동", linkedUid: null }
                                        │
원우들이 그 칸을 채움 ─────────────────▶ roster에 company·position·phone 저장
                                        │
홍길동이 Google 로그인 ────────────────▶ users/{uid} 생성 (status: approved)
                                        │
프로필에 이름 "홍길동" 저장 ───────────▶ linkRosterEntry()          lib/roster-link.ts
                                        ├─ roster 전체를 훑어 공백 무시하고 이름 대조
                                        ├─ roster.linkedUid = uid  ← 못 박음
                                        └─ 회사·직책·휴대폰·직위·소개영상을 users로 옮김
                                        │
화면 ─────────────────────────────────▶ buildDirectory()           lib/directory.ts
                                        linkedUid로, 없으면 이름으로 합쳐 가나다순 한 권
```

**모든 원우가 남의 칸을 수정할 수 있고, 내 칸도 겉모습이 똑같습니다** (회색 수정 버튼). 마지막에 손댄 사람 이름(`updatedByName`)이 남습니다.

### 8-4. 새 일정 등록

```
EventForm(운영진) ─ commitWrite(setDoc(events/{미리 뽑은 id}))
                     │  ★ addDoc이 아니라 doc()+setDoc: id를 먼저 알아야
                     │    저장이 늦어도 곧바로 그 일정 화면으로 갈 수 있음
                     ├─ 결과가 "saved"일 때만  ─▶ POST /api/push/event
                     │     ├─ 올린 본인인지 확인 (createdBy)
                     │     ├─ pushLog/{event:id}.create()  ← 이미 있으면 중단 (중복 방지)
                     │     ├─ users where status==approved .select()  ← uid만, 사진 안 딸려오게
                     │     └─ sendPushToUsers()
                     └─ router.replace(/events/{id})
```

**수정할 때는 알림을 보내지 않습니다.** 오탈자 하나에 40명 폰이 울리면 안 되니까요. `"queued"`(서버 미도달)일 때도 건너뜁니다 — 서버가 그 문서를 못 찾습니다.

### 8-5. 행사 사진 올리기

```
파일 여러 장 선택
  └─ 한 장씩:
       resizeImage(2560px)        브라우저 캔버스. "원본 그대로" 켜면 건너뜀
       uploadImage()              XHR로 Cloudinary에 직접 (진행률 표시)
       addDoc(photos)             주소·크기만 Firestore에
  └─ 끝나고 한 번:
       updateDoc(photoAlbums/{id}) photoCount: increment(n), 대표사진 없으면 첫 장으로
목록  thumbnailUrl(url, 400)      주소에 c_fill,g_auto,w_400,q_auto,f_auto 끼워 넣음
뷰어  viewerUrl(url, 1600)        저장 buttons → downloadUrl (fl_attachment)
```

### 8-6. 소식 · 복습 영상 (서버가 대신 받아오는 것들)

```
/news    ──fetch──▶ /api/dosan   ──▶ dosan21.kr/rss   (브라우저인 척 User-Agent)
                     · CORS와 403을 서버가 대신 맞음
                     · s-maxage=1800 → 30분간 Netlify CDN이 재사용

/library ──fetch──▶ /api/videos  ──▶ YOUTUBE_API_KEY 있으면 playlistItems 최대 300편
                                     없으면 채널 RSS 최근 15편 (키가 있어도 빈 결과면 RSS로 대체)
                     · s-maxage=3600
```

원우 40명이 소식 탭을 열어도 도산아카데미 서버로는 **30분에 한 번**만 나갑니다.

### 8-7. 알림 켜기 (기기마다 따로)

```
설정 화면 또는 첫 로그인 팝업 → enablePush(uid)          lib/push.ts
  ├─ Notification.requestPermission()   ★ 손가락 누른 그 순간에 불러야 iOS에서 창이 뜸
  ├─ 서비스워커 등록 (/firebase-messaging-sw.js)
  ├─ getToken({vapidKey})               VAPID 공개키 필요
  ├─ setDoc(pushTokens/{토큰})           내 uid + userAgent
  └─ localStorage["agikaeta:push"] = "on"
```

**켬/끔은 서버가 아니라 기기에 남습니다** — 브라우저 권한 자체가 기기 단위이고, 한 번 허용하면 앱에서 꺼도 권한은 `granted`로 남아 권한만으로는 판단할 수 없기 때문입니다.
**아이폰은 홈 화면에 추가한 아이콘으로 열어야** 알림이 옵니다(iOS 16.4+). 안드로이드 크롬은 그냥 됩니다.

---

## 9. 보안 — 실제로 무엇이 막혀 있나

[firestore.rules](firestore.rules)가 전부입니다. **파일을 고치는 것만으로는 아무 효과가 없고, Firebase 콘솔 규칙 탭에 `rules_version` 줄부터 전부 붙여넣고 "게시"해야** 적용됩니다.

| 대상 | 상태 |
|---|---|
| 수첩·명단·일정·참석·사진·수업 | **활짝 열림** — 로그인만 하면 누구나 읽고 씀 (휴대폰 번호 포함). 원우끼리 서로 채워주는 앱이라 일부러 이렇게 둠 |
| 느낀점 댓글 | 읽기 자유. **쓸 땐 본인 이름만**, 수정 불가, 삭제는 본인 것만 |
| 채팅 | **잠김.** `roomId == 'main' || uid in roomId.split('__')`. 메시지는 `senderId == uid` 검사, 수정·삭제 불가 |
| 채팅 목록 조회(list) | 문서 id로는 검증이 불가능해서 **`memberUids` 기준**. 앱의 질의(`array-contains`)와 짝이 맞아야 통과 — **앱 질의를 바꾸면 규칙도 같이 고쳐야 함** |
| 읽음 기록 | 본인만 |
| `pushTokens` | 본인 것 하나만. **list는 아무에게도 안 엶** (열면 누가 어떤 기기 쓰는지 다 보이고 남의 알림을 끊을 수 있음) |
| `pushLog` | **규칙에 안 적음 = 클라이언트 전면 차단.** Admin SDK만 접근 |

> ★★ **`match /{document=**}` 전체 허용 줄을 지운 것이 이 규칙의 핵심입니다.**
> Firestore 규칙은 "하나라도 허용하면 허용"이라, 그 줄이 남아 있으면 채팅을 아무리 잠가도 통과됩니다.
> 그래서 컬렉션을 하나씩 나열했고, **새 컬렉션을 만들면 여기에 직접 추가해야 합니다. 안 적으면 조용히 막힙니다.**

그 밖의 방어:
- `X-Robots-Tag: noindex` (netlify.toml) + `robots: {index:false}` (layout.tsx) — 검색엔진 이중 차단
- `X-Frame-Options: SAMEORIGIN` — 남의 사이트가 iframe으로 감싸는 것 차단
- Cloudinary 사진 주소는 추측 불가능한 임의 문자열 (주소가 새지 않는 한 못 봄)
- 이 앱 유일의 **진짜 비밀값은 `FIREBASE_SERVICE_ACCOUNT` 하나** — 새면 보안 규칙을 통째로 건너뛸 수 있습니다

---

## 10. 설정값 (환경변수)

`.env.local`(내 컴퓨터)과 **Netlify 사이트 설정 양쪽에** 넣어야 하고, 넣은 뒤 **다시 배포**해야 반영됩니다.

| 이름 | 어디서 쓰나 | 없으면 |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` 외 5개 | 브라우저 + 서비스워커 | 앱 전체가 "Firebase 설정이 필요해요" 화면 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `_UPLOAD_PRESET` | 브라우저 (사진 업로드) | 사진 탭에 "설정이 안 되어 있어요" |
| `YOUTUBE_API_KEY` | 서버 (`/api/videos`) | 채널 RSS로 최근 15편만 |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | 브라우저 (토큰 발급) | 설정 화면 알림이 "아직 준비되지 않았어요" |
| `FIREBASE_SERVICE_ACCOUNT` | **서버만** (Admin SDK) | 알림만 조용히 꺼짐. 앱 나머지는 정상 |

`NEXT_PUBLIC_` 값은 **빌드 때 코드 안에 박히고 브라우저에 그대로 노출됩니다.** Firebase 웹 설정값은 원래 공개값이라 문제 없고, netlify.toml에서 Netlify의 비밀값 스캔을 이 키들에 한해 꺼두었습니다.

---

## 11. 개발과 배포

```bash
npm run dev          # localhost:3000
npm run dev:phone    # 0.0.0.0 바인딩 → 폰에서 http://172.30.1.8:3000
npm run build        # 타입 검사 + 린트 + 빌드 (배포 전 확인)
npm run icons        # sharp로 PWA 아이콘 PNG 재생성 (public/icon-*.png)
```

**배포: `main`에 push → Netlify 자동 빌드 → 1~2분 뒤 반영.**
무료 빌드 시간(월 300분)을 아끼려고 **push는 사용자가 "배포하자"고 할 때만** 합니다. 커밋은 작업 단위마다 쌓아둡니다. push는 하되 배포를 건너뛰려면 커밋 메시지에 `[skip netlify]`.

**폰에서 안 열릴 때 의심 순서** (`npm run dev:phone`):
1. 서버가 떠 있나 — `Get-NetTCPConnection -LocalPort 3000 -State Listen`. 이게 제일 흔한 원인
2. 윈도우 방화벽 — 와이파이가 **개인 네트워크**여야 하고 규칙 `Agikaeta dev server 3000`이 살아 있어야 함
3. `next.config.ts`의 `allowedDevOrigins` — 없으면 화면은 떠도 자동 새로고침이 안 됨
4. IP가 바뀌었으면 **Firebase 콘솔 → 승인된 도메인**에 새 IP 추가 (포트·`http://` 빼고 주소만)

---

## 12. 무료 한도가 만든 설계들

| 한도 | 그래서 이렇게 됐다 |
|---|---|
| Firebase Storage가 카드 필수 | 프로필 사진 → **Firestore 문서 안 data URL(192px, 40KB 이하)** · 행사 사진 → **Cloudinary** |
| Cloud Functions가 카드 필수 | 알림을 **보낸 쪽 브라우저가 `/api/push/*`를 직접 두드림** |
| Firestore 읽기 5만/일 | **오프라인 캐시(IndexedDB)** 켬 · 안읽음은 99개까지만 셈 · 읽음 기록 8초 묶음 · 정렬은 색인 대신 앱에서 |
| 전송량 10GiB/월 | 메시지에 프로필 사진 복사 안 함 · `chatReads`를 `users`와 분리 · 알림 발송 시 `.select()`로 uid만 |
| Netlify 빌드 300분/월 | **자동 push 안 함.** 커밋만 쌓고 한 번에 올림 |
| 외부 서버 부담 | RSS·유튜브를 서버 라우트가 대신 받아 **CDN에 30분/1시간 캐시** |

50명 규모에서 한도가 터질 일은 없지만, **닿을 수는 있습니다.** 실제로 2026-09-05에 `useChatReadTimes`의 되먹임 고리로 무료 한도를 태운 적이 있고, 그 자국이 hooks.ts 주석에 남아 있습니다.

---

## 13. 지금 상태 · 사람이 콘솔에서 해야 하는 일

**돌고 있는 것**: 로그인, 원우수첩, 일정+참석, 수업 기록+느낀점, 채팅(단체+1:1), 행사 사진, 복습 영상, 도산 소식, 보기 설정.

**아직 안 도는 것**: **웹 푸시 알림.** 코드는 2026-09-06에 다 들어갔지만 두 값을 아직 안 넣었습니다.

내가 못 하고 사용자(천유찬)만 할 수 있는 일:

1. **`firestore.rules`를 고쳤으면 콘솔 규칙 탭에 전체를 붙여넣고 "게시"** — 안 하면 파일만 바뀌고 아무 효과 없음. 일부만 붙여넣으면 `mismatched input 'match'` 오류
2. **알림을 켜려면 두 값** (`.env.local` + Netlify 양쪽, 넣고 재배포)
   - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 → 키 쌍 생성
   - `FIREBASE_SERVICE_ACCOUNT` — 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON을 **한 줄로**
3. Firestore 데이터 수정·삭제(테스트 계정 정리 등)는 콘솔에서만
4. 복습 영상 전체 목록을 보려면 `YOUTUBE_API_KEY`를 Netlify 환경변수에 추가
5. 새 배포 주소나 개발용 IP가 생기면 **Firebase 승인된 도메인**에 추가
