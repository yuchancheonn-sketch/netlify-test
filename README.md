# 애기애타 10기

**2026 도산 애기애타 리더십 과정 10기** 원우들만 쓰는 비공개 커뮤니티 앱입니다.

웹으로 만들어서 스토어 심사 없이 바로 쓸 수 있고, 모바일 브라우저에서
**"홈 화면에 추가"** 를 하면 앱처럼 전체 화면으로 열립니다. (PWA)

- **기술 스택**: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Firebase(Auth/Firestore/Storage)
- **로그인**: Google 계정 하나만 지원
- **가입**: Google 로그인만 하면 바로 입장 (아래 [비공개성은 이렇게 지킵니다](#비공개성은-이렇게-지킵니다) 꼭 읽어보세요)

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

이 저장소의 `firestore.rules` 를 Firestore 규칙 탭에 붙여넣고 **게시**해야 합니다.
파일만 고치면 아무것도 바뀌지 않습니다. 콘솔에 올려야 실제로 적용됩니다.

> **지금 규칙은 열려 있습니다.** Google 계정으로 로그인한 사람은 누구나 모든 자료를
> 읽고 쓸 수 있습니다(원우 휴대폰 번호 포함). 원우들이 가입 직후 프로필을 채우지
> 못하던 문제를 풀기 위해 이렇게 두었습니다. 다시 잠그려면 git 이력에서
> `firestore.rules` 의 이전 판(승인·운영진·본인만 수정)을 가져오면 됩니다.

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

### 6. 첫 운영진(관리자) 지정하기

가장 먼저 본인이 앱에 가입한 뒤, Firestore에서 본인 문서를 직접 고칩니다.
**이 한 번만 콘솔에서 하면 됩니다.**

1. 앱에서 **Google 계정으로 시작하기** → 프로필 설정까지 마치기
2. Firestore → `users` 컬렉션 → 본인 문서(uid) 열기
3. `role` 을 `member` 에서 **`admin`** 으로 바꾸기
4. 앱 화면이 새로고침 없이 바로 바뀝니다.

이제 내 프로필 → **운영진 화면** 에서 명단 관리·권한 부여·차단을 할 수 있습니다.

이후부터는 콘솔에 들어갈 일 없이, 앱 안의 **운영진 화면**(내 프로필 → 운영진 화면)에서
가입 승인·명단 관리·권한 부여를 모두 할 수 있습니다.

### 7. 행사 사진 보관소 연결하기 (Cloudinary)

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

### 8. 원우 명단 올리기 (선택)

운영진 화면 → **원우 명단** 탭에 이름을 줄바꿈으로 붙여넣으면 한 번에 등록됩니다.
원우수첩 맨 아래 **원우 추가하기**로 원우 누구나 한 명씩 올릴 수도 있습니다.
아직 가입하지 않은 원우도 수첩에 함께 나오고(회사·직책·휴대폰까지 서로 채워줄 수 있습니다),
그 사람이 Google 로그인으로 들어오는 순간 **같은 이름이면 자동으로 이어집니다.**
이름이 달라서 자동 연결이 안 되면 명단 탭에서 직접 계정을 고를 수 있습니다.

> 원우수첩은 **서로 채워주는 수첩**입니다. 누구나 다른 원우의 회사·직책·휴대폰·직위를
> 대신 적어줄 수 있고, 고친 사람 이름이 항목에 함께 남습니다.
> 권한·승인 상태·자기소개·소개 영상은 본인(과 운영진)만 손댈 수 있습니다.
> 이 동작은 `firestore.rules`에 들어 있으니 **규칙을 배포해야 실제로 열립니다.**

---

## 실행하기

```bash
npm install
npm run dev      # http://localhost:3000
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run dev:phone` | 개발 서버 (같은 와이파이의 휴대폰에서도 접속 가능) |
| `npm run build` | 배포용 빌드 |
| `npm start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run icons` | PWA 홈 화면 아이콘(PNG) 다시 만들기 |

### 휴대폰에서 테스트하기

```bash
npm run dev:phone
```

컴퓨터와 휴대폰을 **같은 와이파이**에 연결한 뒤, 휴대폰 브라우저에서
컴퓨터의 내부 IP + `:3000` 으로 접속합니다. (예: `http://172.30.1.8:3000`)

내부 IP는 명령 프롬프트에서 `ipconfig` 를 치고 **IPv4 주소** 를 보면 됩니다.
와이파이 공유기를 바꾸면 이 번호도 바뀝니다.

> 처음 접속할 때 윈도우 방화벽이 물어보면 **허용**을 눌러야 합니다.
> Google 로그인은 `localhost` 와 배포 주소에서만 허용되어 있어, 내부 IP로 들어가면
> 로그인 단계에서 막힐 수 있습니다. 화면 모양·글씨·배치 확인용으로 쓰고,
> **로그인까지 확인해야 하는 변경은 모아 뒀다가 한 번에 배포**하세요.

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

### 배포를 모아서 하기 (빌드 시간 아끼기)

Netlify 무료 요금제는 **한 달 빌드 시간 300분**을 줍니다. 이 앱은 한 번 빌드에
1~2분쯤 쓰므로, 고칠 때마다 push하면 금방 바닥납니다. 그래서 이렇게 씁니다.

1. **고치는 동안에는 `npm run dev:phone` 으로 확인합니다.** 저장하면 바로 화면에
   반영되고, Netlify 빌드 시간은 1초도 쓰지 않습니다.
2. **커밋은 계속 합니다.** 커밋은 내 컴퓨터에만 쌓이는 거라 배포와 무관합니다.
3. **여러 개를 다 고친 뒤 한 번만 `git push` 합니다.** 커밋이 10개든 20개든
   push 한 번이면 Netlify 빌드도 **한 번**입니다.

```bash
git push          # 이때 딱 한 번 배포됩니다
```

**push는 하고 싶은데 배포는 하기 싫을 때** — 마지막 커밋 메시지에 `[skip netlify]`
를 넣으면 Netlify가 그 push는 건너뜁니다. (백업 삼아 올려만 둘 때 씁니다.)

```bash
git commit -m "작업 중간 저장 [skip netlify]"
```

**아예 잠시 멈추고 싶을 때** — Netlify → **Site configuration → Build & deploy →
Continuous deployment → Stop builds** 를 누르면 push해도 빌드가 안 돕니다.
다시 켤 때는 같은 자리에서 **Start builds**.

> **환경변수를 바꿨을 때는 반드시 재배포하세요.**
> `NEXT_PUBLIC_` 값은 빌드 시점에 박히기 때문에, 값만 바꾸고 재배포하지 않으면
> 예전 값이 그대로 남아 있습니다. (Deploys → Trigger deploy → Clear cache and deploy site)

원우들에게는 이렇게 안내하면 됩니다.

- **아이폰(사파리)**: 주소 열기 → 아래 공유 버튼 → **홈 화면에 추가**
- **안드로이드(크롬)**: 주소 열기 → 오른쪽 위 ⋮ → **홈 화면에 추가**

---

## 비공개성은 이렇게 지킵니다

> **지금은 문지기가 없습니다.** Google 계정으로 로그인하면 누구나 들어옵니다.
> 초대 코드 단계는 사용하기 번거로워 뺐습니다.

그래서 **주소를 아는 사람은 들어올 수 있습니다.** 검색엔진에는 잡히지 않지만
(`noindex`), 링크가 퍼지면 막을 방법이 없다는 뜻입니다.
원우들에게 안내할 때 **바깥에 주소를 공유하지 말아 달라고** 함께 전해 주세요.

**잘못 들어온 사람이 보이면** 운영진 화면 → 권한 관리 → **차단** 을 누르면
그 즉시 원우 명단·채팅·사진 등 모든 데이터가 보이지 않게 됩니다.
운영진 화면의 권한 관리 탭에서 가입한 사람 목록을 한눈에 볼 수 있으니
가끔 확인해 주세요.

### 초대 코드를 다시 켜고 싶다면

지우지 않고 남겨두었습니다. 두 곳만 되살리면 됩니다.

1. `firestore.rules` 의 `users` **create** 규칙 마지막에 한 줄 추가

   ```
   && isValidInviteCode(request.resource.data.inviteCode)
   ```

   검사 함수 `isValidInviteCode()` 는 그대로 남아 있습니다.
   코드 확인을 규칙이 직접 하기 때문에, 앱을 고쳐서 건너뛸 수는 없습니다.

2. `src/app/join/page.tsx` 에 코드 입력칸을 두고, 입력한 값을
   `inviteCode` 필드에 담아 저장

그리고 Firestore에 `inviteCodes/{코드}` 문서를 만들고 `active: true`(boolean)를
넣으면 됩니다. 문서 ID가 곧 초대 코드이고, **대문자**로 만들어 주세요.

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
    join/                   첫 방문자의 계정 문서 만들기
    pending/                운영진 승인 대기
    onboarding/             최초 프로필 설정
    api/dosan/              도산아카데미 소식(RSS)을 대신 받아오는 창구
    api/videos/             도산아카데미 유튜브 영상 목록을 대신 받아오는 창구
    (main)/                 승인받은 원우만 볼 수 있는 화면들
      layout.tsx            하단 탭바 + 접근 가드
      home/                 홈 대시보드 (D-day 카드 · 오늘의 도산)
      members/              원우수첩 (이름 가나다순 명단)
      library/              자료 (복습 영상 = 도산아카데미 유튜브 / 행사 사진)
      albums/               앨범 상세 (사진 그리드·업로드·전체화면 뷰어)
      chat/                 단체 채팅
      news/                 도산아카데미 소식 (dosan21.kr RSS)
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

브랜드 기준색은 **`#FF7210`** 입니다.

- 대표 주황: `#FF7210` (`brand-500`) — 버튼·말풍선·테마색·아이콘·배지
- 흰 바탕 위 주황 글씨: `#C25100` (`brand-700`) — 대비 4.7:1
- 배경: `#FFFAF6` — 아주 옅은 주황빛 오프화이트

램프(50~900)는 **색조 25도·채도 100%** 로 통일했습니다.
어두운 단계에 파란 기가 조금만 섞여도 곧바로 갈색으로 보이기 때문에,
파랑을 0으로 두고 밝기만 낮췄습니다.

> **알아두실 점**: `#FF7210` 위의 흰 글씨는 대비가 2.7:1로 접근성 기준(4.5:1)에
> 못 미칩니다. 밝은 야외에서 버튼 글씨가 흐릴 수 있습니다. 브랜드 색을 그대로
> 살리려고 택한 것이며, 가독성이 문제되면 `globals.css` 주석대로
> `bg-brand-500` 을 `bg-brand-700` 으로 바꾸면 됩니다.

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
| 프로필·채팅·일정·명단 | Firestore | 무료 (1GB · 하루 읽기 5만, 월 전송 10GiB) |
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
- [x] Google 로그인 → 온보딩 (초대 코드·승인 없이 바로 입장)
- [x] 내 프로필 (사진·이름·별칭·생일·구분·회사·직책·휴대폰·원우회 직위·한 줄 소개)
- [x] 원우수첩 (가나다순 번호 / 이름·회사·직책 검색 / 사진 크게 보기 / 소개 영상 / 원우끼리 서로 정보 채워주기 · 이름 올리기)
- [x] 모임 일정 (목록·월간 캘린더·상세·참석 체크, 운영진 등록/수정/삭제)
- [x] 단체 채팅 (실시간, 이전 메시지 더 보기)
- [x] 운영진 화면 (가입 승인, 원우 명단 일괄 등록, 운영진 권한 관리)
- [x] PWA (홈 화면 아이콘, 주황 테마)

**Phase 2 — 다음**

- [x] 행사 사진 앨범 (Cloudinary 업로드·3열 갤러리·전체화면 뷰어)
- [ ] 복습 영상 모음 (운영진 등록, 회차별 보기)
- [x] 복습 영상 (도산아카데미 유튜브 채널 @dosanacademy 자동 연동)
- [ ] 소감 나눔 게시판 (탭은 도산아카데미 소식으로 바뀌었습니다)
- [ ] 채팅 이미지 첨부

**Phase 3 — 선택**

- [ ] 좋아요·댓글, 웹 푸시 알림(FCM)
- [ ] 다크모드
- [ ] 운영진 대시보드 (가입자 수, 활동 통계)
