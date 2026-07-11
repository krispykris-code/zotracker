#!/usr/bin/env node
// ZoTracker one-command release.
//
//   npm run release            → bump minor (1.5 → 1.6), full release
//   npm run release -- 2.0     → release as an explicit version
//   npm run release -- --dry-run
//       → preflight + rewrite version files + show the diff, then restore.
//         No checks, no commit, no push. For verifying the rewrite logic.
//
// A release: (1) sync APP_VERSION / APP_LAST_UPDATED / sw.js CACHE_NAME,
// (2) run lint → typecheck → test → build (build retries on Dropbox EBUSY),
// (3) commit "Release vX.Y" + tag + push, (4) print the manual checklist
// (Firestore rules / PWA icons / Vercel verification).

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const VERSION_FILE = path.join(root, "lib", "version.ts");
const SW_FILE = path.join(root, "public", "sw.js");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const versionArg = args.find((a) => !a.startsWith("--"));

const log = (msg) => console.log(`\x1b[36m[release]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[release] ✗ ${msg}\x1b[0m`);
  process.exit(1);
};

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
}

// ─── 1. Preflight ────────────────────────────────────────────────
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const dirty = git("status", "--porcelain");
if (!dryRun) {
  if (branch !== "main") fail(`must release from main (current: ${branch})`);
  if (dirty) fail("working tree is not clean — commit or stash changes first");
} else {
  log(`dry-run: branch=${branch}, tree ${dirty ? "DIRTY" : "clean"}`);
}

// ─── 2. Compute versions and rewrite files ──────────────────────
const versionSrc = readFileSync(VERSION_FILE, "utf8");
const currentMatch = versionSrc.match(/APP_VERSION = "(\d+)\.(\d+)"/);
if (!currentMatch) fail(`cannot find APP_VERSION = "x.y" in ${VERSION_FILE}`);
const current = `${currentMatch[1]}.${currentMatch[2]}`;

let next = versionArg;
if (next) {
  if (!/^\d+\.\d+$/.test(next)) fail(`version must look like "1.6" (got "${next}")`);
} else {
  next = `${currentMatch[1]}.${Number(currentMatch[2]) + 1}`;
}

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

log(`version ${current} → ${next}  (APP_LAST_UPDATED = ${today})`);

const newVersionSrc = versionSrc
  .replace(/APP_VERSION = "\d+\.\d+"/, `APP_VERSION = "${next}"`)
  .replace(/APP_LAST_UPDATED = "[\d-]+"/, `APP_LAST_UPDATED = "${today}"`);
if (!newVersionSrc.includes(`"${next}"`) || !newVersionSrc.includes(`"${today}"`))
  fail("version.ts rewrite failed — file layout changed?");

const swSrc = readFileSync(SW_FILE, "utf8");
const swPattern = /const CACHE_NAME = "zotracker-v[\d.]+"/;
if (!swPattern.test(swSrc)) fail(`cannot find CACHE_NAME pattern in ${SW_FILE}`);
const newSwSrc = swSrc.replace(swPattern, `const CACHE_NAME = "zotracker-v${next}"`);

writeFileSync(VERSION_FILE, newVersionSrc);
writeFileSync(SW_FILE, newSwSrc);
log("rewrote lib/version.ts and public/sw.js");

if (dryRun) {
  console.log("\n─── dry-run diff ───");
  const diff = spawnSync("git", ["diff", "--", "lib/version.ts", "public/sw.js"], {
    cwd: root,
    encoding: "utf8",
  });
  console.log(diff.stdout);
  git("checkout", "--", "lib/version.ts", "public/sw.js");
  log("dry-run complete — files restored, nothing committed");
  process.exit(0);
}

// ─── 3. Quality gates ────────────────────────────────────────────
function run(label, cmd, cmdArgs, { retries = 0, retryOn } = {}) {
  for (let attempt = 0; ; attempt++) {
    log(`${label}${attempt > 0 ? ` (retry ${attempt})` : ""}…`);
    const res = spawnSync(cmd, cmdArgs, {
      cwd: root,
      encoding: "utf8",
      shell: true, // resolves npm.cmd / npx.cmd on Windows
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    if (res.status === 0) return;
    if (retryOn && retryOn.test(output) && attempt < retries) {
      log(`${label} hit ${retryOn} — retrying in 3s (known Dropbox .next lock)`);
      execFileSync(process.execPath, ["-e", "setTimeout(()=>{}, 3000)"]);
      continue;
    }
    console.error(output);
    git("checkout", "--", "lib/version.ts", "public/sw.js");
    fail(`${label} failed — version files restored, release aborted`);
  }
}

run("lint", "npm", ["run", "lint"]);
run("typecheck", "npm", ["run", "typecheck"]);
run("test", "npm", ["test"]);
run("build", "npm", ["run", "build"], { retries: 2, retryOn: /EBUSY/ });

// ─── 4. Commit, tag, push ────────────────────────────────────────
git("add", "lib/version.ts", "public/sw.js");
git("commit", "-m", `Release v${next}`);
git("tag", `v${next}`);
git("push", "origin", "main");
git("push", "origin", `v${next}`);
log(`pushed Release v${next} — Vercel will deploy automatically`);

// ─── 5. Manual checklist (diff-aware) ────────────────────────────
const prevTag = git("tag", "-l", "v*", "--sort=-v:refname")
  .split("\n")
  .filter((t) => t && t !== `v${next}`)[0];
const changed = prevTag
  ? git("diff", "--name-only", `${prevTag}..HEAD`).split("\n")
  : [];

console.log("\n─── 手動檢查清單 ───");
if (!prevTag) console.log("（首次 tag 釋出，以下為通用清單）");
if (!prevTag || changed.includes("firestore.rules"))
  console.log(
    "□ firestore.rules 有變動：請貼到 Firebase Console 並按「發布」\n  https://console.firebase.google.com/project/zotracker-9f632/firestore/rules"
  );
if (changed.includes("public/logo.svg") && !changed.includes("public/icon-192.png"))
  console.log("□ logo.svg 改了但 icons 沒重生：先跑 node scripts/generate-icons.mjs 再補一次釋出");
console.log("□ 1–2 分鐘後開 https://zotracker.vercel.app 確認新版部署完成");
console.log("□ 手機開 ZoTracker PWA：應出現更新橫幅 → 點「立即更新」→ 設定內 Version 應顯示 " + next);
