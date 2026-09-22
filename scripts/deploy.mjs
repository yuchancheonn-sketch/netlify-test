/**
 * 배포 한 번에 — `npm run deploy` (2026-09-22).
 *
 * 순서
 *   1. 커밋 안 된 수정이 있으면 멈춥니다. (배포 전에 먼저 커밋하세요 — 커밋된 것만 올라갑니다.)
 *   2. GitHub에 push (백업. push만으로는 배포되지 않습니다.)
 *   3. 커밋된 것만 임시 폴더로 뽑습니다(git archive). .env.local·작업 중 파일은 섞이지 않습니다.
 *   4. Firestore 보안 규칙 게시 → App Hosting 빌드·배포(5~10분) → Hosting 다시 올려 web.app 캐시 비우기.
 *   5. web.app과 App Hosting 원래 주소가 같은 판을 주는지 확인.
 *
 * 처음 한 번: `npm i -g firebase-tools` → `firebase.cmd login` (윈도우 PowerShell은 firebase.cmd).
 * 자세한 짜임은 README "배포하기".
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PROJECT = "aegiaeta10";
const SITE_URL = "https://aegiaeta.web.app";
const BACKEND_URL = "https://agikaeta--aegiaeta10.asia-east1.hosted.app";
const firebase = process.platform === "win32" ? "firebase.cmd" : "firebase";

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit", ...options });
}

const dirty = execSync("git status --porcelain").toString().trim();
if (dirty) {
  console.error("커밋 안 된 수정이 있어 멈춥니다. 먼저 커밋하세요:\n" + dirty);
  process.exit(1);
}

run("git push origin main");

const dir = mkdtempSync(path.join(tmpdir(), "aegiaeta-deploy-"));
try {
  // 파이프(|) 없이 파일로 떨궜다가 풉니다 — PowerShell·cmd·bash 어디서 돌려도 같게. tar는 윈도우 10에도 기본으로 있습니다.
  const tarball = path.join(dir, "source.tar");
  run(`git archive --format=tar -o "${tarball}" HEAD`);
  run(`tar -xf "${tarball}" -C "${dir}"`);
  rmSync(tarball);
  const opts = { cwd: dir };
  run(`${firebase} deploy --only firestore:rules --project ${PROJECT} --non-interactive`, opts);
  run(`${firebase} deploy --only apphosting --project ${PROJECT} --non-interactive`, opts);
  run(`${firebase} deploy --only hosting --project ${PROJECT} --non-interactive -m "캐시 비우기"`, opts);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// 확인 — 두 주소의 Etag가 같으면 web.app도 새 판입니다.
async function etag(url) {
  const response = await fetch(`${url}/login`, { method: "HEAD" });
  return response.headers.get("etag");
}
await new Promise((resolve) => setTimeout(resolve, 10_000));
const [site, backend] = await Promise.all([etag(SITE_URL), etag(BACKEND_URL)]);
if (site && site === backend) {
  console.log(`\n배포 완료 — ${SITE_URL} 이 새 판을 보여 줍니다 (Etag ${site}).`);
} else {
  console.error(`\n배포는 끝났지만 web.app이 아직 예전 판입니다 (web.app ${site} / 원래 주소 ${backend}).`);
  process.exit(1);
}
