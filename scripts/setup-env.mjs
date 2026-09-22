/**
 * 새 컴퓨터에서 `.env.local` 다시 만들기 — `npm run setup:env` (2026-09-22).
 *
 * `.env.local`은 비밀값이 있어 저장소에 올리지 않습니다. 그래서 컴퓨터를 바꾸면 사라지는데,
 * 값의 진짜 원본은 이미 바깥에 있습니다.
 *   - 공개값(NEXT_PUBLIC_…)  → apphosting.yaml (저장소)
 *   - 비밀값(secret:)        → Firebase Secret Manager (firebase CLI로 꺼냄)
 * 이 스크립트는 둘을 모아 `.env.local`을 새로 씁니다. 이미 있으면 덮어쓰지 않고 멈춥니다(--force로 덮어쓰기).
 *
 * 먼저: `npm i -g firebase-tools` → `firebase.cmd login`.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PROJECT = "aegiaeta10";
const firebase = process.platform === "win32" ? "firebase.cmd" : "firebase";

if (existsSync(".env.local") && !process.argv.includes("--force")) {
  console.log(".env.local이 이미 있어 그대로 둡니다. 새로 만들려면: npm run setup:env -- --force");
  process.exit(0);
}

/*
  apphosting.yaml의 env 목록만 읽으면 되므로 YAML 해석기를 들이지 않고 줄 단위로 읽습니다.
  "- variable: 이름" 다음 줄의 "value:" 또는 "secret:"을 짝지어 둡니다. 주석(#) 줄은 건너뜁니다.
*/
const entries = [];
for (const raw of readFileSync("apphosting.yaml", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith("#")) continue;
  const variable = line.match(/^- variable:\s*(\S+)/);
  if (variable) {
    entries.push({ name: variable[1] });
    continue;
  }
  const current = entries.at(-1);
  if (!current) continue;
  const value = line.match(/^value:\s*"?(.*?)"?$/);
  if (value) current.value = value[1];
  const secret = line.match(/^secret:\s*(\S+)/);
  if (secret) current.secret = secret[1];
}

const lines = [
  "# npm run setup:env 가 apphosting.yaml + Firebase Secret Manager에서 만든 파일입니다. 커밋하지 마세요.",
];
for (const entry of entries) {
  if (entry.secret) {
    const secret = execSync(
      `${firebase} apphosting:secrets:access ${entry.secret} --project ${PROJECT}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    ).trim();
    lines.push(`${entry.name}=${secret}`);
    console.log(`${entry.name}  ← Secret Manager (${entry.secret})`);
  } else {
    lines.push(`${entry.name}=${entry.value ?? ""}`);
    console.log(`${entry.name}  ← apphosting.yaml`);
  }
}
writeFileSync(".env.local", lines.join("\n") + "\n");
console.log("\n.env.local을 만들었습니다.");
