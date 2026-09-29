/**
 * Project format migration N → N+1 → … → current.
 * Always keep a deep copy of the original when migrating (no silent overwrite of fixtures).
 */

import { APP_VERSION, PROJECT_FORMAT, PROJECT_SCHEMA } from "./version.js";

const STEPS = Object.freeze([
  {
    from: 1,
    to: 2,
    migrate(p) {
      p.channels ||= [];
      p.resources ||= [];
      p.devices ||= [];
      return p;
    }
  }
  // Future: { from: 2, to: 3, migrate(p) { … } }
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureShape(p) {
  p.schema = PROJECT_SCHEMA;
  p.nodes ||= [];
  p.edges ||= [];
  p.timeline ||= [];
  p.controls ||= [];
  p.channels ||= [];
  p.resources ||= [];
  p.devices ||= [];
  p.output ||= { width: 1280, height: 720, fps: 60, background: "#090b0d" };
  p.meta ||= {};
  p.appVersion ||= APP_VERSION;
  return p;
}

/**
 * @returns {{ project, migratedFrom, migratedTo, original, changed, steps }}
 */
export function migrateProject(raw, { keepOriginal = true } = {}) {
  if (!raw || (raw.schema !== PROJECT_SCHEMA && raw.schema !== "cvd.graph")) {
    throw new Error("Projet No-de Vibe Designer invalide");
  }
  const original = keepOriginal ? clone(raw) : null;
  const migratedFrom = Number(raw.version) || 1;
  if (migratedFrom > PROJECT_FORMAT) {
    throw new Error(`Projet version ${migratedFrom} plus récent que ce moteur (${PROJECT_FORMAT})`);
  }

  let project = clone(raw);
  project.schema = PROJECT_SCHEMA;
  const applied = [];
  let version = migratedFrom;

  while (version < PROJECT_FORMAT) {
    const step = STEPS.find((s) => s.from === version);
    if (!step) {
      throw new Error(`Migration manquante ${version} → ${version + 1}`);
    }
    project = step.migrate(project);
    version = step.to;
    project.version = version;
    applied.push(`${step.from}→${step.to}`);
  }

  project.version = PROJECT_FORMAT;
  ensureShape(project);
  project.meta.migratedFrom = migratedFrom;
  project.meta.migratedAt = new Date().toISOString();
  project.meta.migrationSteps = applied;

  return {
    project,
    migratedFrom,
    migratedTo: PROJECT_FORMAT,
    original,
    changed: migratedFrom !== PROJECT_FORMAT,
    steps: applied
  };
}

export function listMigrationPath(fromVersion, toVersion = PROJECT_FORMAT) {
  const path = [];
  let v = Number(fromVersion) || 1;
  while (v < toVersion) {
    const step = STEPS.find((s) => s.from === v);
    if (!step) break;
    path.push(step);
    v = step.to;
  }
  return path;
}
