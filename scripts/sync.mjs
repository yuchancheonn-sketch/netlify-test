/**
 * GitHub과 맞추기 — `npm run sync` (2026-09-22).
 *
 * 컴퓨터를 바꿔도 이어서 작업하려면 **GitHub이 늘 최신 원본**이어야 합니다.
 * Claude는 대화를 시작할 때 이것부터 돌립니다(CLAUDE.md "컴퓨터가 바뀌어도 이어서").
 *   - GitHub에 새 커밋이 있으면 받아 옵니다(git pull --ff-only).
 *   - 커밋 안 된 수정이 있으면 받아 오지 않습니다(덮일까 봐). 대신 그 사실을 알립니다.
 *   - push 안 한 커밋, .env.local·node_modules가 없는 것(새 컴퓨터)도 알립니다.
 *
 * (처음엔 Claude Code hook(.claude/settings.json)으로 대화마다 저절로 돌게 하려 했는데,
 *  그 폴더에 쓰는 것이 막혀 CLAUDE.md 규칙으로 바꿨습니다.)
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const sh = (command) => execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const notes = [];

try {
  sh("git fetch --quiet origin");
  const dirty = sh("git status --porcelain");
  const behind = Number(sh("git rev-list --count HEAD..@{u}"));
  const ahead = Number(sh("git rev-list --count @{u}..HEAD"));

  if (behind > 0 && !dirty) {
    sh("git pull --ff-only --quiet");
    notes.push(`GitHub에서 새 커밋 ${behind}개를 받아 왔습니다(다른 컴퓨터에서 한 작업).`);
  } else if (behind > 0) {
    notes.push(
      `GitHub에 이 컴퓨터에 없는 커밋이 ${behind}개 있는데, 커밋 안 된 수정이 있어 받아 오지 않았습니다. ` +
        "수정을 먼저 커밋한 뒤 git pull --rebase 하세요(겹치는 곳이 있으면 사용자에게 먼저 묻기).",
    );
  }
  if (dirty) {
    notes.push(`커밋 안 된 수정이 있습니다(지난 대화에서 남은 것일 수 있음):\n${dirty}`);
  }
  // 고칠 때마다 push하는 것이 규칙이라(CLAUDE.md) 남아 있으면 바로 올리라고 알립니다.
  if (ahead > 0) notes.push(`GitHub에 아직 안 올린 커밋이 ${ahead}개 있습니다 — git push origin main 하세요.`);
  if (!dirty && behind === 0 && ahead === 0) notes.push("GitHub과 같은 최신 상태입니다.");
} catch (error) {
  notes.push(`GitHub 확인 실패(인터넷·로그인 확인): ${String(error.message).split("\n")[0]}`);
}

if (!existsSync("node_modules")) notes.push("node_modules가 없습니다 — 새 컴퓨터면 npm install 부터.");
if (!existsSync(".env.local")) {
  notes.push(".env.local이 없습니다 — firebase.cmd login 뒤 npm run setup:env 로 만드세요(README '새 컴퓨터에서').");
}

console.log(`[애기애타앱 동기화]\n${notes.join("\n")}`);
