# 애기애타 10기

**2026 도산 애기애타 리더십 과정 10기** 원우들만 쓰는 비공개 커뮤니티 앱입니다.

웹으로 만들어서 스토어 심사 없이 바로 쓸 수 있고, 모바일 브라우저에서
**"홈 화면에 추가"** 를 하면 앱처럼 전체 화면으로 열립니다. (PWA)

- **기술 스택**: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Firebase(Auth/Firestore/Storage)
- **로그인**: Google 계정 하나만 지원
- **비공개 유지 방법**: 초대 코드 + 운영진 승인 (아래 [비공개성은 이렇게 지킵니다](#비공개성은-이렇게-지킵니다) 참고)

---

## 처음 한 번만 해야 하는 설정

아래 항목들은 사람이 직접 콘솔에서 해야 합니다. 순서대로 진행해 주세요.

### 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 **프로젝트 추가**
2. 프로젝트 이름은 자유롭게 (예: `agikaeta-10`)
3. Google 애널리틱스는 켜지 않아도 됩니다.

### 2. Google 로그인 켜기

1. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**
2. **Sign-in method** 탭 → **Google** 선택 → **사용 설정** → 지원 이메일 지정 → 저장
3. **Settings → 승인된 도메인**에 배포 주소를 추가합니다.
   - `localhost`는 기본으로 들어 있습니다.
   - Vercel에 올리면 `내프로젝트.vercel.app` 을 추가하세요.

> Google OAuth 클라이언트는 Firebase가 자동으로 만들어 주므로 따로 등록할 필요가 없습니다.

### 3. Firestore·Storage 켜기

1. **빌드 → Firestore Database → 데이터베이스 만들기**
   - 위치는 `asia-northeast3 (서울)` 권장
   - 모드는 **프로덕션 모드**로 시작하세요. (규칙은 5번에서 배포합니다)
2. **빌드 → Storage → 시작하기** — 같은 위치로 만듭니다.

### 4. `.env.local` 채우기

1. **프로젝트 설정(톱니바퀴) → 일반 → 내 앱** 에서 **웹 앱(`</>`)** 을 추가합니다.
2. 화면에 나오는 `firebaseConfig` 값을 복사합니다.
3. 프로젝트 폴더에서 `.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

`.env.local` 을 만들기 전에 앱을 열면 "Firebase 설정이 필요해요" 안내 화면이 나옵니다.

### 5. 보안 규칙 배포하기

이 저장소의 `firestore.rules` 와 `storage.rules` 가 **이 앱의 비공개성을 실제로 지키는 파일**입니다.
반드시 배포해 주세요.

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # 위에서 만든 프로젝트 선택
firebase deploy --only firestore:rules,storage
```

> 콘솔에서 직접 붙여넣어도 됩니다.
> Firestore → 규칙 탭, Storage → 규칙 탭에 각 파일 내용을 그대로 붙여넣고 게시하세요.

### 6. 초대 코드 만들기

Firestore 콘솔에서 직접 만듭니다. (앱에서는 초대 코드를 읽을 수도 쓸 수도 없습니다.)

1. Firestore → **컬렉션 시작** → 컬렉션 ID: `inviteCodes`
2. **문서 ID**를 초대 코드로 씁니다. **반드시 대문자**로 만들어 주세요. (예: `AGT10A`)
3. 필드를 이렇게 넣습니다.

| 필드 | 타입 | 값 |
| --- | --- | --- |
| `active` | boolean | `true` |
| `cohort` | string | `10기` |
| `createdAt` | timestamp | 지금 시각 |

코드를 더 이상 쓰지 않으려면 `active` 를 `false` 로 바꾸면 됩니다.

### 7. 첫 운영진(관리자) 지정하기

가장 먼저 본인이 앱에 가입한 뒤, Firestore에서 본인 문서를 직접 고칩니다.

1. 앱에서 Google 로그인 → 초대 코드 입력 → 가입 신청
2. Firestore → `users` 컬렉션 → 본인 문서(uid) 열기
3. 두 필드를 바꿉니다.
   - `role` → `admin`
   - `status` → `approved`
4. 앱 화면이 새로고침 없이 바로 넘어갑니다.

이후부터는 앱 안의 **운영진 화면**에서 다른 원우들의 가입을 승인할 수 있습니다.

---

## 실행하기

```bash
npm install
npm run dev      # http://localhost:3000
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 |
| `npm start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run icons` | PWA 홈 화면 아이콘(PNG) 다시 만들기 |

### 휴대폰에서 테스트하기

같은 와이파이에 연결한 뒤 컴퓨터의 내부 IP로 접속하면 됩니다.
Google 로그인까지 확인하려면 배포본(아래 Vercel)에서 테스트하는 편이 확실합니다.

---

## 배포하기 (Vercel 권장)

1. 이 폴더를 GitHub 저장소로 올립니다.
2. [Vercel](https://vercel.com/)에서 **Add New → Project** → 저장소 선택
3. **Environment Variables** 에 `.env.local` 의 6개 값을 그대로 넣습니다.
4. 배포가 끝나면 나온 주소를 Firebase **Authentication → Settings → 승인된 도메인**에 추가합니다.

원우들에게는 이렇게 안내하면 됩니다.

- **아이폰(사파리)**: 주소 열기 → 아래 공유 버튼 → **홈 화면에 추가**
- **안드로이드(크롬)**: 주소 열기 → 오른쪽 위 ⋮ → **홈 화면에 추가**

---

## 비공개성은 이렇게 지킵니다

Google 로그인은 전 세계 누구나 할 수 있으므로 두 겹으로 막습니다.

1. **초대 코드** — 코드가 맞아야 계정 문서가 만들어집니다.
   코드 검증은 화면이 아니라 **Firestore 보안 규칙**이 합니다.
   그래서 앱은 초대 코드 목록을 읽을 권한이 아예 없고, 코드를 추측해서
   앱 코드를 고쳐도 규칙에서 거절됩니다.
2. **운영진 승인** — 코드가 맞아도 `status`는 `pending` 으로 시작합니다.
   운영진이 승인하기 전에는 원우 명단·채팅·일정 등 **어떤 데이터도 읽히지 않습니다.**

화면 단의 접근 제어(`StageGate`)는 길 안내일 뿐입니다.
브라우저에서 코드를 고쳐 화면을 억지로 열어도, 보안 규칙이 막으면 내용은 비어 있습니다.

---

## 폴더 구조

```
src/
  app/
    layout.tsx              공통 껍데기 (폰트, 메타데이터, 로그인 상태 제공)
    manifest.ts             PWA 설정
    page.tsx                시작 지점 — 단계에 맞는 화면으로 보냄
    login/                  Google 로그인
    join/                   초대 코드 입력
    pending/                운영진 승인 대기
    onboarding/             최초 프로필 설정
    (main)/                 승인받은 원우만 볼 수 있는 화면들
      layout.tsx            하단 탭바 + 접근 가드
      home/                 홈 대시보드 (D-day 카드)
      members/              원우 소개
      library/              자료 (복습 영상 / 행사 사진)
      chat/                 단체 채팅
      reflections/          소감 나눔
      events/               모임 일정 (목록·캘린더·상세·등록·수정)
      profile/              내 프로필
  components/               화면 조각 (카드, 탭바, 폼, 아이콘 등)
  lib/
    constants.ts            앱 이름·기수 등 바뀔 수 있는 값 모음
    firebase.ts             Firebase 초기화
    auth-context.tsx        로그인 상태와 단계 판단
    hooks.ts                Firestore 실시간 구독
    types.ts / format.ts / image.ts
firestore.rules             ★ 접근 제어의 실체
storage.rules               ★ 파일 접근 제어
```

---

## 디자인

공식 포스터(2026 도산 애기애타 리더십 과정)의 주황색을 기준으로 잡았습니다.

- 대표 주황: `#F5821F` (`brand-500`) — 배지·강조
- 글자가 올라가는 면: `#AD4E0E` (`brand-700`) — 버튼·말풍선
  (흰 글씨 대비 약 5.4:1로 접근성 기준 통과)
- 배경: `#FFFAF5` — 아주 옅은 주황빛 오프화이트

색·그림자·폰트는 전부 `src/app/globals.css` 의 `@theme` 한 곳에 있습니다.

### 앱 이름 바꾸기

`src/lib/constants.ts` 의 `APP_NAME`, `APP_SHORT_NAME` 만 고치면
로그인 화면·홈 화면 아이콘 이름·브라우저 탭이 한 번에 바뀝니다.

### 하단 탭을 6개(B안)로 바꾸기

`src/components/BottomTabBar.tsx` 의 `TABS` 배열에 항목을 추가하면 됩니다.
파일 안 주석에 예시를 적어 두었습니다.

### 폰트 바꾸기 (Pretendard)

지금은 `next/font/google` 의 **Noto Sans KR** 을 씁니다.
Pretendard로 바꾸려면 웹폰트 파일을 `public/fonts/` 에 넣고
`src/app/layout.tsx` 에서 `next/font/local` 로 교체한 뒤,
`globals.css` 의 `--font-sans` 첫 항목만 바꾸면 됩니다.

### 애기애타 서예 로고 넣기

지금 앱 아이콘은 포스터의 주황 리본 위에 `愛己愛他` 를 얹어 만든 것입니다.
서예 로고 원본 파일이 있으면 `public/brand/logo.png` 로 넣어 주세요.
(로그인 화면 상단에 쓰도록 연결해 드립니다.)

---

## 요금제 안내 (Spark → Blaze)

지금은 Firebase **무료(Spark) 요금제** 범위 안에서 도는 것을 기준으로 만들었습니다.

- 복습 영상은 파일을 올리지 않고 **유튜브·비메오 링크만 저장**합니다.
  유튜브에 올릴 때는 **"일부 공개(목록에 없음)"** 로 올리시는 걸 권합니다.
- 프로필 사진과 행사 사진은 **브라우저에서 크기를 줄인 뒤** 올립니다.

수십 명이 사진을 활발히 올리기 시작하면 Storage 용량(무료 5GB)과
전송량이 부족해질 수 있습니다. 그때는 콘솔에서 **Blaze(종량제)** 로 바꾸면 되고,
이 규모에서는 보통 월 몇 천 원 수준입니다. 예산 알림을 함께 설정해 두세요.

---

## 만들어진 것 / 앞으로 만들 것

**Phase 1 — 완료**

- [x] Next.js + TypeScript + Tailwind + Firebase 연동
- [x] Google 로그인 → 초대 코드 → 승인 대기 → 온보딩
- [x] 내 프로필 (사진·이름·별칭·생일·구분·한 줄 소개)
- [x] 원우 소개 (검색 / 일반·청년 필터 / 상세 시트)
- [x] 모임 일정 (목록·월간 캘린더·상세·참석 체크, 운영진 등록/수정/삭제)
- [x] 단체 채팅 (실시간, 이전 메시지 더 보기)
- [x] PWA (홈 화면 아이콘, 주황 테마)

**Phase 2 — 다음**

- [ ] 복습 영상 모음 (운영진 등록, 회차별 보기)
- [ ] 행사 사진 앨범 (업로드·갤러리·전체화면 뷰어)
- [ ] 소감 나눔 게시판
- [ ] 운영진 화면 (가입 승인 대기 목록, 원우 관리)
- [ ] 채팅 이미지 첨부

**Phase 3 — 선택**

- [ ] 좋아요·댓글, 웹 푸시 알림(FCM)
- [ ] 다크모드
- [ ] 운영진 대시보드 (가입자 수, 활동 통계)
