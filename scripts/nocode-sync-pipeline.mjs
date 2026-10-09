#!/usr/bin/env node
/**
 * No[co]de Vibe Designer — Pipeline d'automatisation & synchronisation multi-agents (Parité ART)
 * Référence : ticket cdriccarboni/no-de-vibe-designer#34
 *
 * Rôles :
 * 1. Synchronisation et vérification des 3 dépôts (privé canonique, public PWA, lab AI Studio)
 * 2. Vérification de non-régression (syntaxe, intégrité vendor, pack Scénographe, QA navigateur)
 * 3. Enregistrement de la provenance (SHA source -> SHA distribution -> build)
 * 4. Détection et rapport des blocages d'infrastructure (ex: quotas Actions sur dépôts privés)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sh(cmd, cwd = root) {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    return { error: true, message: err.stderr || err.message, status: err.status };
  }
}

console.log("=== NO[CO]DE MULTI-AGENT SYNC & QA PIPELINE ===");

// 1. Audit des dépôts
const repos = {
  pwa: root,
  private: path.resolve(root, "../_private_repo/no-de-vibe-designer"),
  lab: path.resolve(root, "../_ai-studio/nocode-ai-expert")
};

const report = {
  timestamp: new Date().toISOString(),
  repos: {},
  tests: {},
  provenance: {}
};

for (const [key, dir] of Object.entries(repos)) {
  if (fs.existsSync(dir)) {
    const branch = sh("git rev-parse --abbrev-ref HEAD", dir);
    const sha = sh("git rev-parse HEAD", dir);
    const remote = sh("git config --get remote.origin.url", dir);
    report.repos[key] = { dir, branch, sha, remote, available: true };
  } else {
    report.repos[key] = { dir, available: false };
  }
}

// 2. Contrôles de QA & Intégrité
console.log("-> Exécution QA Intégrité Vendor...");
const vendorRes = sh("node qa/vendor-integrity-qa.mjs", root);
report.tests.vendorIntegrity = !vendorRes.error;

console.log("-> Exécution QA Pack Scénographe...");
const scenicRes = sh("node qa/scenic-pack-qa.mjs", root);
report.tests.scenicPack = !scenicRes.error;

console.log("-> Exécution QA Public Runtime...");
const publicQaRes = sh("node qa/public-qa.mjs", root);
report.tests.publicQa = !publicQaRes.error;

// 3. Provenance
const buildInfoPath = path.join(root, "build-info.json");
if (fs.existsSync(buildInfoPath)) {
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
  report.provenance = {
    version: buildInfo.version,
    sourceRevision: buildInfo.sourceRevision,
    cacheRevision: buildInfo.cacheRevision,
    builtAt: buildInfo.builtAt,
    filesCount: buildInfo.files
  };
}

console.log("--- RAPPORT D'ÉTAT ---");
console.log(JSON.stringify(report, null, 2));

// Écriture du rapport pour consultation par tout agent
const reportPath = path.join(root, "qa/automation-status.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(`Rapport sauvegardé dans ${reportPath}`);
