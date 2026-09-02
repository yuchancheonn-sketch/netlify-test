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
   - 배포 주소인 **`aegiaeta10.netlify.app`** 을 꼭 추가하세요.
     이게 빠지면 배포본에서 Google 로그인이 실패합니다.

> Google OAuth 클라이언트는 Firebase가 자동으로 만들어 주므로 따로 등록할 필요가 없습니다.

### 3. Firestore 켜기

1. **빌드 → Firestore Database → 데이터베이스 만들기**
   - 위치는 `asia-northeast3 (서울)` — **나중에 바꿀 수 없습니다.**
   - 모드는 **프로덕션 모드**로 시작하세요. (규칙은 5번에서 배포합니다)

> **Storage(파일 저장소)는 켜지 않아도 됩니다.**
> 2024년 9월 이후에 만든 Firebase 프로젝트는 Storage를 쓰려면 유료(Blaze) 요금제로
> 올려야 해서 신용카드가 필요합니다. 그래서 이 앱은 **프로필 사진을 Storage에 올리지 않고**
> 192px로 줄여 Firestore 문서에 문자열로 담습니다. 카드 없이 무료로 다 돌아갑니다.
> 자세한 내용은 아래 [요금제 안내](#요금제-안내-카드-없이-무료로-운영하기)를 보세요.

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

**가장 쉬운 방법 — 콘솔에 붙여넣기**

Firestore → **규칙** 탭을 열고, `firestore.rules` 파일 내용을 **전부 복사해서 붙여넣은 뒤 게시**하면 됩니다.
(Storage를 안 쓰므로 `storage.rules`는 지금 배포할 필요가 없습니다.)

**명령어로 하려면**

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # 위에서 만든 프로젝트 선택
firebase deploy --only firestore:rules
```

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

이후부터는 콘솔에 들어갈 일 없이, 앱 안의 **운영진 화면**(내 프로필 → 운영진 화면)에서
가입 승인·명단 관리·권한 부여를 모두 할 수 있습니다.

### 8. 행사 사진 보관소 연결하기 (Cloudinary)

행사 사진은 Firebase가 아니라 **Cloudinary** 에 보관합니다.
Firebase Storage가 유료 요금제를 요구하는 것과 달리,
Cloudinary는 **신용카드 없이 25GB** 를 무료로 줍니다.

1. [cloudinary.com](https://cloudinary.com/users/register_free) 무료 가입 (카드 불필요)
2. **Dashboard** 에서 **Cloud name** 을 확인해 적어둡니다. (예: `dxxxxxxx`)
3. **Settings(⚙️) → Upload → Upload presets → Add upload preset**
   - **Signing Mode** 를 반드시 **Unsigned** 로 바꿉니다.
     이래야 브라우저에서 바로 올릴 수 있고 비밀 키를 앱에 넣지 않아도 됩니다.
   - **Asset folder** 에 `aegiaeta10` 을 넣습니다. (사진이 한 폴더에 모입니다)
   - 저장하고 **preset 이름** 을 적어둡니다.
4. 두 값을 `.env.local` 과 Netlify 환경변수에 넣습니다.

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=여기에_Cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=여기에_preset_이름
```

**알아두실 점**

- 사진 주소는 추측할 수 없는 임의 문자열이라, 앱 밖으로 주소가 새지 않는 한
  다른 사람이 찾아볼 수 없습니다. (Firebase Storage도 같은 방식입니다)
- 앱에서 사진을 지우면 **앨범에서는 사라지지만 Cloudinary에는 파일이 남습니다.**
  서명 없는 업로드 방식이라 브라우저에 원본을 지울 권한이 없기 때문입니다.
  용량이 신경 쓰이면 Cloudinary **Media Library** 에서 가끔 정리해 주세요.
- Unsigned preset은 이름을 아는 사람이 사진을 올릴 수 있습니다. 원우들에게만
  공유되는 앱이라 실질적인 문제는 없지만, 문제가 생기면 preset을 지우고
  새로 만들면 즉시 차단됩니다.

### 9. 원우 명단 올리기 (선택)

운영진 화면 → **원우 명단** 탭에 이름을 줄바꿈으로 붙여넣으면 한 번에 등록됩니다.
아직 가입하지 않은 원우도 원우 소개에 흐리게 표시되고,
그 사람이 초대 코드로 가입해 승인되는 순간 **같은 이름이면 자동으로 이어집니다.**
이름이 달라서 자동 연결이 안 되면 명단 탭에서 직접 계정을 고를 수 있습니다.

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
Google 로그인까지 확인하려면 배포본(아래 Netlify)에서 테스트하는 편이 확실합니다.

---

## 배포하기 (Netlify)

배포 주소는 **https://aegiaeta10.netlify.app** 입니다.

### 처음 한 번

1. [Netlify](https://app.netlify.com/) 로그인 → **Add new site → Import an existing project**
2. **GitHub** 선택 → 이 저장소 선택
3. 빌드 설정은 `netlify.toml` 에 적혀 있으니 **그대로 두고** 넘어갑니다.
   (Build command `npm run build`, Publish directory `.next`)
4. **Environment variables** 에 `.env.local` 의 6개 값을 그대로 넣습니다.
   `NEXT_PUBLIC_` 값들은 빌드할 때 코드에 박히므로, **먼저 넣고 배포**해야 합니다.
5. 배포가 끝나면 **Site configuration → Site details → Change site name** 에서
   사이트 이름을 `aegiaeta10` 으로 바꿉니다.
6. **Firebase 콘솔 → Authentication → Settings → 승인된 도메인** 에
   `aegiaeta10.netlify.app` 을 추가합니다.
   **이걸 빠뜨리면 Google 로그인이 실패합니다.**

### 그다음부터

`main` 브랜치에 push하면 Netlify가 알아서 다시 배포합니다.

> **환경변수를 바꿨을 때는 반드시 재배포하세요.**
> `NEXT_PUBLIC_` 값은 빌드 시점에 박히기 때문에, 값만 바꾸고 재배포하지 않으면
> 예전 값이 그대로 남아 있습니다. (Deploys → Trigger deploy → Clear cache and deploy site)

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
      library/              자료 (복습 영상 / 행사 사진 앨범 목록)
      albums/               앨범 상세 (사진 그리드·업로드·전체화면 뷰어)
      chat/                 단체 채팅
      reflections/          소감 나눔
      events/               모임 일정 (목록·캘린더·상세·등록·수정)
      profile/              내 프로필
      admin/                운영진 화면 (가입 승인·원우 명단·권한 관리)
  components/               화면 조각 (카드, 탭바, 폼, 아이콘 등)
  lib/
    constants.ts            앱 이름·기수 등 바뀔 수 있는 값 모음
    firebase.ts             Firebase 초기화
    cloudinary.ts           행사 사진 업로드·썸네일 주소 만들기
    auth-context.tsx        로그인 상태와 단계 판단
    hooks.ts                Firestore 실시간 구독
    types.ts / format.ts / image.ts
firestore.rules             ★ 접근 제어의 실체
storage.rules               (지금은 안 씀 — Blaze로 올릴 때를 위해 남겨둔 파일)
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

## 요금제 안내 (카드 없이 무료로 운영하기)

**신용카드 등록 없이, Firebase 무료(Spark) 요금제만으로 전부 돌아갑니다.**

2024년 9월부터 새로 만든 Firebase 프로젝트는 **Cloud Storage를 쓰려면 유료(Blaze)
요금제가 필요**해졌습니다. 그래서 이 앱은 Storage를 피해가도록 만들었습니다.

| 무엇 | 어디에 저장 | 비용 |
| --- | --- | --- |
| 프로필·채팅·일정·명단 | Firestore | 무료 (1GB) |
| **프로필 사진** | **Firestore에 192px 문자열로** | **무료** |
| **행사 사진** | **Cloudinary** | **무료 (25GB, 카드 불필요)** |
| 복습 영상 | 저장 안 함 — 유튜브·비메오 **링크만** | 무료 |

프로필 사진은 브라우저에서 192×192로 줄여 8~15KB짜리 문자열로 만든 뒤
프로필 정보와 함께 저장합니다. 원우 40명이 모두 사진을 넣어도 1MB가 안 되므로
무료 한도(1GB)의 0.1%도 쓰지 않습니다.

> 유튜브에 복습 영상을 올릴 때는 **"일부 공개(목록에 없음)"** 로 올리시길 권합니다.
> 링크를 아는 사람만 볼 수 있고 검색에는 걸리지 않습니다.

### 언제 Blaze가 필요해지나

**행사 사진 앨범(Phase 2)** 을 앱 안에서 보여주려면 그때는 선택이 필요합니다.

- **무료로 계속** — 구글 포토 공유 앨범을 만들고 앱에는 링크만 저장.
  사진은 구글 포토에서 보게 됩니다.
- **Blaze로 올리기** — 앱 안에서 갤러리로 봅니다. 카드 등록이 필요하지만
  Blaze에도 무료 사용량이 있어서 이 규모(수십 명)면 실제 청구는 0원에 가깝습니다.
  올리실 경우 **예산 알림**을 꼭 함께 설정하세요.

Blaze로 올리게 되면 `storage.rules` 를 배포하고, 프로필 사진도 Storage 방식으로
되돌릴 수 있습니다. 관련 코드(`src/lib/image.ts` 의 `cropToSquare`, `storage.rules`)를
지워두지 않고 남겨두었습니다.

---

## 만들어진 것 / 앞으로 만들 것

**Phase 1 — 완료**

- [x] Next.js + TypeScript + Tailwind + Firebase 연동
- [x] Google 로그인 → 초대 코드 → 승인 대기 → 온보딩
- [x] 내 프로필 (사진·이름·별칭·생일·구분·한 줄 소개)
- [x] 원우 소개 (검색 / 일반·청년 필터 / 상세 시트)
- [x] 모임 일정 (목록·월간 캘린더·상세·참석 체크, 운영진 등록/수정/삭제)
- [x] 단체 채팅 (실시간, 이전 메시지 더 보기)
- [x] 운영진 화면 (가입 승인, 원우 명단 일괄 등록, 운영진 권한 관리)
- [x] PWA (홈 화면 아이콘, 주황 테마)

**Phase 2 — 다음**

- [x] 행사 사진 앨범 (Cloudinary 업로드·3열 갤러리·전체화면 뷰어)
- [ ] 복습 영상 모음 (운영진 등록, 회차별 보기)
- [ ] 소감 나눔 게시판
- [ ] 채팅 이미지 첨부

**Phase 3 — 선택**

- [ ] 좋아요·댓글, 웹 푸시 알림(FCM)
- [ ] 다크모드
- [ ] 운영진 대시보드 (가입자 수, 활동 통계)
