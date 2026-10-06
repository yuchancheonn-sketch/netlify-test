/**
 * 앱(Capacitor)용 화면 파일 만들기 — `npm run build:app` (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱 scripts/build-app.mjs를 옮김).
 *
 * 웹 배포와 같은 코드를 정적 파일(app-dist/)로 내보내 앱 안에 담습니다. 정적 내보내기는 서버 창구(src/app/api)·웹 푸시 서비스워커·manifest 같은
 * "서버가 있어야 하는 파일"을 가질 수 없어서, 저장소를 임시 폴더로 복사한 뒤 그 복사본에서 그 파일들을 빼고 빌드합니다(원본은 건드리지 않습니다 —
 * 편집기가 감시하는 폴더는 윈도우에서 이름을 바꿀 수 없어 복사 방식으로 했습니다). 서버 창구는 앱에 담지 않고
 * https://aegiaeta.web.app 을 그대로 부릅니다(src/lib/api.ts, next.config.ts의 CORS).
 *
 * 복사본에서 빼는 것:
 *  - src/app/api, firebase-messaging-sw.js, manifest.ts — 서버가 있어야 함
 *  - src/app/letter — 서버에서 그려 주는 로그인 없는 소식지(앱 안에서는 안 씀)
 *  - events/[eventId], sessions/[...rest] — 홈으로 넘겨 주는 옛 주소 자리(redirect)뿐
 *  - chat/[roomId]·albums/[albumId]·news/week/[weekId]·events/[eventId]/edit 의 page.tsx — 미리 알 수 없는 id를 주소에 넣는 동적 주소라 정적 내보내기가 못 만듭니다.
 *    화면 본체(room.tsx·album.tsx·week.tsx·edit.tsx)는 남기고, 앱은 쿼리(?id=) 화면(chat/room, albums/view, news/week/view, events/edit)이 같은 본체를 씁니다(src/lib/routes.ts).
 *
 * 다음 단계: `npx cap sync android` 로 app-dist를 안드로이드 프로젝트에 복사(= npm run app:sync).
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const API_BASE = process.env.APP_API_BASE ?? "https://aegiaeta.web.app";
const src = process.cwd();
const tmp = path.join(tmpdir(), "aegiaeta-app-build");

// 복사에서 빼는 폴더(어느 깊이에 있든 이름이 같으면) — 의존성·빌드 결과·버전 기록·안드로이드 프로젝트
const SKIP_DIRS = new Set(["node_modules", ".next", "app-dist", "android", "ios", ".git", ".netlify", ".firebase"]);

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

try {
  cpSync(src, tmp, {
    recursive: true,
    filter: (from) => !SKIP_DIRS.has(path.basename(from)) && !from.endsWith(".bak") && !from.endsWith(".tsbuildinfo"),
  });

  // 서버가 있어야 하는 파일·옛 주소는 복사본에서만 뺍니다.
  for (const rel of [
    "src/app/api",
    "src/app/firebase-messaging-sw.js",
    "src/app/manifest.ts",
    "src/app/letter",
    "src/app/(main)/events/[eventId]/page.tsx",
    "src/app/(main)/chat/[roomId]/page.tsx",
    "src/app/(main)/albums/[albumId]/page.tsx",
    "src/app/(main)/news/week/[weekId]/page.tsx",
    "src/app/(main)/events/[eventId]/edit/page.tsx",
    "src/app/(main)/sessions/[...rest]",
  ]) {
    rmSync(path.join(tmp, rel), { recursive: true, force: true });
  }
  symlinkSync(path.join(src, "node_modules"), path.join(tmp, "node_modules"), "junction");

  // 웹은 NEXT_PUBLIC_ 값(Firebase·카카오 키 등)을 apphosting.yaml에서 받아 빌드하지만, 앱 빌드는 이 컴퓨터에서 하므로 같은 값을 거기서 읽어 넣습니다.
  const publicEnv = {};
  const yaml = readFileSync("apphosting.yaml", "utf8");
  for (const [, key, value] of yaml.matchAll(/- variable: (NEXT_PUBLIC_\w+)\s+value: "([^"]*)"/g)) {
    publicEnv[key] = value;
  }

  execSync("npx next build --webpack", {
    cwd: tmp,
    stdio: "inherit",
    env: { ...process.env, ...publicEnv, NEXT_PUBLIC_APP_TARGET: "native", NEXT_PUBLIC_API_BASE: API_BASE },
  });

  rmSync("app-dist", { recursive: true, force: true });
  cpSync(path.join(tmp, "app-dist"), "app-dist", { recursive: true });
  console.log("\n앱용 화면 파일을 app-dist/에 만들었습니다. 다음: npx cap sync android");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
