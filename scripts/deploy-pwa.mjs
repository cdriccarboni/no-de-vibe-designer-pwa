/**
 * Deploy built PWA to the public HTTPS publish repo.
 * Target: https://cdriccarboni.github.io/no-de-vibe-designer-pwa/
 *
 * Source repo is private (GitHub Pages unavailable there).
 * Publish repo is public and hosts only built static artifacts.
 *
 * Cloudflare Pages (ART-style) remains preferred once
 * CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID are set on this repo —
 * see docs/PWA_DEPLOY.md and .github/workflows/deploy-pwa.yml.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "pwa");
const PUBLISH_REPO = process.env.NVD_PWA_PUBLISH_REPO || "https://github.com/cdriccarboni/no-de-vibe-designer-pwa.git";
const PUBLIC_URL = process.env.NVD_PWA_PUBLIC_URL || "https://cdriccarboni.github.io/no-de-vibe-designer-pwa/";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log("→ build:pwa");
run(process.execPath, [path.join(root, "scripts", "build-pwa.mjs")]);

for (const req of ["index.html", "sw.js", "manifest.webmanifest", "build-info.json"]) {
  if (!fs.existsSync(path.join(dist, req))) {
    console.error(`PWA deploy · missing ${req}`);
    process.exit(1);
  }
}

const work = fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "nvd-pwa-"));
run("git", ["clone", "--depth", "1", PUBLISH_REPO, work]);

// Replace only generated PWA surfaces. Preserve public CI, release metadata,
// privacy/play documentation and stable download pages.
const generated = [
  "desktop", "mobile", "studio", "companion", "shared", "manuel", "icons",
  "index.html", "manifest.webmanifest", "sw.js", "build-info.json"
];
for (const entry of generated) fs.rmSync(path.join(work, entry), { recursive: true, force: true });
fs.cpSync(dist, work, { recursive: true, force: true });
fs.writeFileSync(path.join(work, ".nojekyll"), "");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
fs.writeFileSync(
  path.join(work, "README.md"),
  `# No-de Vibe Designer — public PWA\n\nBuilt artifacts only. Source: private \`no-de-vibe-designer\`.\n\n- Public URL: ${PUBLIC_URL}\n- Version: ${version}\n`
);

run("git", ["add", "-A"], { cwd: work });
const diff = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: work });
if (diff.status !== 0) {
  run(
    "git",
    ["-c", "user.email=cdriccarboni@users.noreply.github.com", "-c", "user.name=cdriccarboni", "commit", "-m", `deploy: No-de Vibe Designer PWA ${version}`],
    { cwd: work }
  );
  run("git", ["push", "origin", "HEAD:main"], { cwd: work });
} else {
  console.log("PWA deploy · aucun changement à publier");
}

console.log(`PWA deployed · ${PUBLIC_URL}`);
console.log("Verify: curl -fsS " + PUBLIC_URL + "build-info.json");
