import assert from "node:assert/strict";
import { installScenicPack, scenicPackElements, SCENIC_ID_PREFIX } from "../shared/scenic/scenic-adapter.js";
import { listElements, saveElement, instantiateElement } from "../shared/show-elements.js";

const project = { resources: [{ kind: "resource", id: "r1" }] };
saveElement(project, { id: "user-1", name: "Mon élément", type: "patch", snapshot: { a: 1 } });
const before = JSON.stringify(listElements(project).find(e => e.id === "user-1"));

const n = scenicPackElements().length;
assert.ok(n >= 25, "pack de 29 éléments attendu");
const first = installScenicPack(project);
assert.equal(first.added, n); assert.equal(first.updated, 0);
const second = installScenicPack(project);
assert.equal(second.added, 0, "idempotent : pas de doublon"); assert.equal(second.unchanged, n);
assert.equal(listElements(project).length, n + 1);
assert.equal(JSON.stringify(listElements(project).find(e => e.id === "user-1")), before, "élément utilisateur intact");
assert.equal(project.resources.find(r => r.id === "r1")?.kind, "resource", "ressources historiques intactes");
const ids = new Set(scenicPackElements().map(e => e.id));
assert.equal(ids.size, n, "ids uniques");
assert.ok([...ids].every(id => id.startsWith(SCENIC_ID_PREFIX)));
const inst = instantiateElement(project, [...ids][0], { track: 1, start: 2, duration: 5 });
assert.equal(inst.snapshot.source, "google-ai-studio-scenographe");
assert.equal(inst.track, 1);
console.log(`SCENIC PACK QA OK · ${n} éléments`);
