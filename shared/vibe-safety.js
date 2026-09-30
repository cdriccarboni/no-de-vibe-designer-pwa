import { isExecutable, portMeta, portLabels, typesCompatible } from "./ports.js";

const EXTERNAL_TYPES = new Set([
  "arduino","esp","servo","dmx","osc","twozero","chataigne","millumin",
  "touchdesigner","td","isadora","isadorabridge","max","pd","supercollider","haptics"
]);
const ALLOWED_OPS = new Set(["addNode","connect","setParam","addClip"]);
const PARAM_LIMITS = {
  opacity:[0,1], threshold:[0,1], intensity:[0,2], amount:[0,1], depth:[0,1],
  gain:[0,0.5], feedback:[0,0.98], decay:[0,0.98], scale:[0.05,4],
  angle:[0,180], speed:[0,10], duration:[0.05,3600], value:[-100000,100000],
  universe:[0,32767], address:[1,512], channel:[0,255], port:[1,65535]
};

function resolveType(project, op, side) {
  const id = op[side + "Id"];
  const type = op[side + "Type"];
  if (type) return type;
  return (project.nodes || []).find(n => n.id === id)?.type || null;
}

function compatible(typeA, portA, typeB, portB) {
  const a = portMeta(typeA, Number(portA));
  const b = portMeta(typeB, Number(portB));
  if (!a || !b) return false;
  return a.dir === "out" && b.dir === "in" && typesCompatible(a.data,b.data);
}

function clampParam(key,value) {
  const limits = PARAM_LIMITS[key];
  if (!limits || typeof value !== "number" || !Number.isFinite(value)) return value;
  return Math.max(limits[0],Math.min(limits[1],value));
}

export function secureVibePlan(project, rawOps, { source = "unknown", maxOps = 64, maxNewNodes = 16 } = {}) {
  const ops = [];
  const dropped = [];
  const rewrites = [];
  const virtualTypes = new Set((project.nodes || []).map(n => n.type));
  const addedCounts = new Map();
  const seen = new Set();
  let newNodes = 0;

  for (const raw of Array.isArray(rawOps) ? rawOps.slice(0,maxOps) : []) {
    if (!raw || typeof raw !== "object" || !ALLOWED_OPS.has(raw.op)) {
      dropped.push("Opération inconnue ou mal formée");
      continue;
    }
    const op = { ...raw };

    if (op.op === "addNode") {
      if (!isExecutable(op.type)) { dropped.push(`Node non exécutable : ${op.type}`); continue; }
      if (newNodes >= maxNewNodes) { dropped.push("Limite de nouveaux nodes atteinte"); continue; }
      const count = addedCounts.get(op.type) || 0;
      if (count >= 3) { dropped.push(`Trop de nodes ${op.type} dans une seule génération`); continue; }
      op.x = Math.max(-4000,Math.min(4000,Number(op.x) || 60));
      op.y = Math.max(-4000,Math.min(4000,Number(op.y) || 60));
      op.title = op.title ? String(op.title).slice(0,120) : undefined;
      op.params = op.params && typeof op.params === "object" && !Array.isArray(op.params) ? { ...op.params } : {};
      delete op.auto;
      if (EXTERNAL_TYPES.has(op.type) && op.params.auto === true) {
        op.params.auto = false;
        rewrites.push(`Sécurité scène : ${op.type}.auto forcé à false`);
      }
      for (const key of ["permission","playing","recording"]) {
        if (op.params[key] === true && ["camera","remote-camera","phone-camera-front","phone-camera-back","phone-mic"].includes(op.type)) {
          delete op.params[key];
          rewrites.push(`Permission média supprimée de ${op.type}.${key}`);
        }
      }
      virtualTypes.add(op.type);
      addedCounts.set(op.type,count+1);
      newNodes++;
    }

    if (op.op === "connect") {
      const fromType = resolveType(project,op,"from");
      const toType = resolveType(project,op,"to");
      if (!fromType || !toType || !virtualTypes.has(fromType) || !virtualTypes.has(toType)) {
        dropped.push(`Connexion vers node absent : ${fromType || "?"} → ${toType || "?"}`);
        continue;
      }
      const fromPort = Number(op.fromPort ?? 0), toPort = Number(op.toPort ?? 0);
      if (!compatible(fromType,fromPort,toType,toPort)) {
        dropped.push(`Connexion incompatible : ${fromType}[${fromPort}] → ${toType}[${toPort}]`);
        continue;
      }
      op.fromPort = fromPort; op.toPort = toPort;
    }

    if (op.op === "setParam") {
      const target = op.type || (project.nodes || []).find(n => n.id === op.id)?.type;
      if (!target || !virtualTypes.has(target)) {
        dropped.push(`Paramètre sans cible : ${op.key || "?"}`);
        continue;
      }
      if (EXTERNAL_TYPES.has(target) && op.key === "auto" && op.value === true) {
        op.value = false;
        rewrites.push(`Sécurité scène : ${target}.auto forcé à false`);
      }
      if (["enabled","playing","recording","permission"].includes(op.key) && ["camera","remote-camera","phone-camera-front","phone-camera-back","phone-mic"].includes(target) && op.value === true) {
        dropped.push(`Permission/action média refusée à l’IA : ${target}.${op.key}`);
        continue;
      }
      const safe = clampParam(op.key,op.value);
      if (safe !== op.value) rewrites.push(`${target}.${op.key} borné à ${safe}`);
      op.value = safe;
    }

    if (op.op === "addClip") {
      op.track = Math.max(0,Math.min(5,Math.round(Number(op.track) || 0)));
      op.start = Math.max(0,Math.min(86400,Number(op.start) || 0));
      op.duration = Math.max(0.05,Math.min(3600,Number(op.duration) || 1));
      op.label = String(op.label || "Vibe").slice(0,80);
      op.kind = ["effect","points","cue","shader"].includes(op.kind) ? op.kind : "effect";
    }

    const key = JSON.stringify(op);
    if (seen.has(key)) continue;
    seen.add(key);
    ops.push(op);
  }

  if (Array.isArray(rawOps) && rawOps.length > maxOps) dropped.push(`Plan tronqué à ${maxOps} opérations`);

  return {
    ok:ops.length > 0,
    ops,
    security:{
      engine:"safety-v1",
      source,
      accepted:ops.length,
      dropped,
      rewrites,
      externalTypes:[...EXTERNAL_TYPES]
    }
  };
}
