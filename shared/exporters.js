/**
 * Exports structurels Max/MSP (.maxpat JSON) et TouchDesigner (Python).
 * Les nodes sans correspondance sont listés dans `unsupported` — jamais simulés.
 */

import { resolvePorts } from "./ports.js";

function flatten(project, prefix = "") {
  const nodes = [];
  const edges = [];
  const list = project?.nodes || [];
  for (const n of list) {
    if (n.type === "subpatch" && n.params?.graph) {
      const child = flatten(n.params.graph, `${prefix}${n.title || n.type}/`);
      nodes.push(...child.nodes);
      edges.push(...child.edges);
    } else {
      nodes.push({ ...n, path: `${prefix}${n.title || n.type}` });
    }
  }
  for (const e of project?.edges || []) {
    const fromSub = list.some(n => n.id === e.from?.node && n.type === "subpatch");
    const toSub = list.some(n => n.id === e.to?.node && n.type === "subpatch");
    if (fromSub || toSub) continue;
    edges.push(e);
  }
  return { nodes, edges };
}

function numParam(node, key, fallback = 0) {
  const v = Number(node?.params?.[key]);
  return Number.isFinite(v) ? v : fallback;
}

/** Index d'entrée/sortie dans le logiciel cible : rang du port parmi ceux de même direction. */
function ioIndex(node, portIndex, dir) {
  const ports = resolvePorts(node?.type, node);
  if (!ports || !ports[portIndex]) return 0;
  let k = 0;
  for (let i = 0; i < portIndex; i++) if (ports[i].dir === dir) k++;
  return k;
}
function portName(node, portIndex) {
  return resolvePorts(node?.type, node)?.[portIndex]?.name || "";
}
const oscAddress = n => {
  const a = String(n.params?.address || "/nocode/value").trim();
  return a.startsWith("/") ? a : `/${a}`;
};
const oscHost = n => String(n.params?.host || "127.0.0.1").replace(/[\s;,]/g, "");
const oscPort = (n, fallback) => Number(n.params?.port) || fallback;

/**
 * Export Max/MSP (.maxpat). Chaque node mappé devient un ou plusieurs objets Max ;
 * les câbles respectent l'inlet/outlet visé (a → gauche, b → droite).
 * OSC : [prepend /adresse] → [udpsend hôte port], donc un vrai message OSC.
 */
export function exportMax(project) {
  const flat = flatten(project);
  const boxes = [];
  const lines = [];
  const entry = new Map(); // node.id → { in: [boxId…], out: boxId }
  const unsupported = [];
  const notes = [];
  let i = 1;
  const box = (n, dx, dy, props) => {
    const id = `obj-${i++}`;
    boxes.push({ box: { id, patching_rect: [(n.x || 40) + dx, (n.y || 40) + dy, 120, 22], ...props } });
    return id;
  };
  const line = (src, outlet, dst, inlet) => lines.push({ patchline: { source: [src, outlet], destination: [dst, inlet] } });
  for (const n of flat.nodes) {
    switch (n.type) {
      case "number": {
        const v = numParam(n, "value", 0);
        const lm = box(n, 0, -26, { maxclass: "newobj", text: `loadmess ${v}`, numinlets: 1, numoutlets: 1 });
        const fl = box(n, 0, 0, { maxclass: "flonum", numinlets: 1, numoutlets: 2, parameter_enable: 0 });
        line(lm, 0, fl, 0);
        entry.set(n.id, { in: [fl], out: fl });
        break;
      }
      case "boolean": {
        const t = box(n, 0, 0, { maxclass: "toggle", numinlets: 1, numoutlets: 1, parameter_enable: 0 });
        entry.set(n.id, { in: [t], out: t });
        break;
      }
      case "add": case "multiply": case "compare": {
        const op = { add: "+ 0.", multiply: "* 1.", compare: "> 0." }[n.type];
        const b = box(n, 0, 0, { maxclass: "newobj", text: op, numinlets: 2, numoutlets: 1 });
        entry.set(n.id, { in: [b, b], out: b });
        break;
      }
      case "smooth": {
        const b = box(n, 0, 0, { maxclass: "newobj", text: "slide 10. 10.", numinlets: 3, numoutlets: 1 });
        entry.set(n.id, { in: [b], out: b });
        break;
      }
      case "midi": {
        const b = box(n, 0, 0, { maxclass: "newobj", text: "ctlin", numinlets: 0, numoutlets: 3 });
        entry.set(n.id, { in: [], out: b });
        break;
      }
      case "osc": {
        const pre = box(n, 0, 0, { maxclass: "newobj", text: `prepend ${oscAddress(n)}`, numinlets: 2, numoutlets: 1 });
        const snd = box(n, 0, 30, { maxclass: "newobj", text: `udpsend ${oscHost(n)} ${oscPort(n, 8000)}`, numinlets: 1, numoutlets: 0 });
        line(pre, 0, snd, 0);
        entry.set(n.id, { in: [null, null, pre], out: null, byPort: true });
        break;
      }
      default:
        unsupported.push(n.path);
    }
  }
  wireTargets(flat, entry, notes, (src, outlet, dst, inlet) => line(src, outlet, dst, inlet));
  const content = JSON.stringify({
    patcher: {
      fileversion: 1,
      appversion: { major: 8, minor: 6, revision: 0, architecture: "x64", modernui: 1 },
      classnamespace: "box",
      rect: [40, 80, 960, 640],
      boxes,
      lines
    }
  }, null, 2);
  return { content, unsupported, notes };
}

/** Relie les câbles du projet aux objets cibles, en respectant les index d'entrée. */
function wireTargets(flat, entry, notes, connect) {
  const byId = new Map(flat.nodes.map(n => [n.id, n]));
  for (const e of flat.edges) {
    const a = entry.get(e.from?.node), b = entry.get(e.to?.node);
    const fromNode = byId.get(e.from?.node), toNode = byId.get(e.to?.node);
    if (!a || !b || !fromNode || !toNode || a.out == null) continue;
    const outlet = fromNode.type === "midi" ? 0 : ioIndex(fromNode, Number(e.from.port) || 0, "out");
    const inIdx = b.byPort ? Number(e.to.port) || 0 : ioIndex(toNode, Number(e.to.port) || 0, "in");
    const target = b.in[inIdx];
    if (target == null) {
      notes.push(`${toNode.path} · entrée « ${portName(toNode, Number(e.to.port) || 0)} » non exportée (réglage fixe dans le patch)`);
      continue;
    }
    // Les objets binaires Max/Pd ont leurs deux entrées sur le même objet : inlet = index.
    const inlet = b.in.filter(x => x === target).length > 1 ? inIdx : 0;
    connect(a.out, outlet, target, inlet);
  }
}

/**
 * Export TouchDesigner : script Python à coller dans un Text DAT puis « Run Script ».
 * Les opérateurs CHOP sont créés dans /project1 et câblés sur la bonne entrée.
 */
export function exportTouchDesigner(project) {
  const flat = flatten(project);
  const safe = s => String(s).replace(/[^a-zA-Z0-9_]/g, "_").replace(/^([0-9])/, "n_$1");
  const py = v => JSON.stringify(String(v));
  const lines = [
    "# No[co]de Vibe Designer — import TouchDesigner",
    "# Coller dans un Text DAT de /project1 puis clic droit > Run Script.",
    "root = op('/project1')",
    "created = {}",
    "def make(key, kind, name, x, y):",
    "    o = root.op(name) or root.create(kind, name)",
    "    o.nodeX, o.nodeY = x, y",
    "    created[key] = o",
    "    return o"
  ];
  const unsupported = [];
  const notes = [];
  const entry = new Map();
  for (const n of flat.nodes) {
    const key = py(n.id);
    const name = py(safe(`${n.title || n.type}_${String(n.id).slice(-4)}`));
    const pos = `${Math.round(n.x || 0)}, ${-Math.round(n.y || 0)}`;
    switch (n.type) {
      case "number": case "boolean":
        lines.push(`o = make(${key}, constantCHOP, ${name}, ${pos})`);
        lines.push(`o.par.name0 = 'value'`);
        lines.push(`o.par.value0 = ${n.type === "boolean" ? (n.params?.value ? 1 : 0) : numParam(n, "value", 0)}`);
        entry.set(n.id, { in: [], out: true });
        break;
      case "add": case "multiply":
        lines.push(`o = make(${key}, mathCHOP, ${name}, ${pos})`);
        lines.push(`o.par.chopop = '${n.type === "add" ? "add" : "mul"}'`);
        entry.set(n.id, { in: [0, 1], out: true });
        break;
      case "midi":
        lines.push(`o = make(${key}, midiinCHOP, ${name}, ${pos})`);
        entry.set(n.id, { in: [], out: true });
        break;
      case "osc": {
        const rn = py(safe(`${n.title || n.type}_${String(n.id).slice(-4)}_addr`));
        lines.push(`r = make(${py(n.id + ":rename")}, renameCHOP, ${rn}, ${Math.round(n.x || 0) - 150}, ${-Math.round(n.y || 0)})`);
        lines.push(`r.par.renamefrom = '*'`);
        lines.push(`r.par.renameto = ${py(oscAddress(n))}`);
        lines.push(`o = make(${key}, oscoutCHOP, ${name}, ${pos})`);
        lines.push(`o.par.netaddress = ${py(oscHost(n))}`);
        lines.push(`o.par.port = ${oscPort(n, 8000)}`);
        lines.push(`o.inputConnectors[0].connect(r)`);
        entry.set(n.id, { in: [null, null, 0], out: null, byPort: true, via: `${n.id}:rename` });
        break;
      }
      default:
        unsupported.push(n.path);
    }
  }
  const byId = new Map(flat.nodes.map(n => [n.id, n]));
  for (const e of flat.edges) {
    const a = entry.get(e.from?.node), b = entry.get(e.to?.node);
    const toNode = byId.get(e.to?.node);
    if (!a || !b || !a.out || !toNode) continue;
    const inIdx = b.byPort ? Number(e.to.port) || 0 : ioIndex(toNode, Number(e.to.port) || 0, "in");
    const slot = b.in[inIdx];
    if (slot == null) { notes.push(`${toNode.path} · entrée « ${portName(toNode, Number(e.to.port) || 0)} » non exportée`); continue; }
    const target = b.via ? b.via : e.to.node;
    lines.push(`if ${py(e.from.node)} in created and ${py(target)} in created: created[${py(target)}].setInput(${slot}, created[${py(e.from.node)}])`);
  }
  lines.push("print('No[co]de Vibe Designer : import terminé,', len(created), 'opérateurs')");
  return { content: `${lines.join("\n")}\n`, unsupported, notes };
}

/**
 * Export Pure Data vanilla (.pd), sans external : floatatom natif, [oscformat] + [netsend -u -b] pour l'OSC.
 */
export function exportPureData(project) {
  const flat = flatten(project);
  const lines = ["#N canvas 0 50 960 640 12;"];
  const unsupported = [];
  const notes = [];
  const entry = new Map();
  const conns = [];
  let i = 0;
  const X = n => Math.round(n.x || 40), Y = n => Math.round(n.y || 40);
  const add = rec => { lines.push(rec); return i++; };
  const connect = (a, o, b, inl) => conns.push(`#X connect ${a} ${o} ${b} ${inl};`);
  for (const n of flat.nodes) {
    switch (n.type) {
      case "number": case "boolean": {
        const lb = add(`#X obj ${X(n)} ${Y(n) - 50} loadbang;`);
        const msg = add(`#X msg ${X(n)} ${Y(n) - 25} ${n.type === "boolean" ? (n.params?.value ? 1 : 0) : numParam(n, "value", 0)};`);
        const fa = add(`#X floatatom ${X(n)} ${Y(n)} 5 0 0 0 - - - 0;`);
        connect(lb, 0, msg, 0); connect(msg, 0, fa, 0);
        entry.set(n.id, { in: [fa], out: fa });
        break;
      }
      case "add": case "multiply": case "compare": {
        const o = add(`#X obj ${X(n)} ${Y(n)} ${{ add: "+", multiply: "*", compare: ">" }[n.type]};`);
        entry.set(n.id, { in: [o, o], out: o });
        break;
      }
      case "midi": {
        const o = add(`#X obj ${X(n)} ${Y(n)} ctlin;`);
        entry.set(n.id, { in: [], out: o });
        break;
      }
      case "osc": {
        const parts = oscAddress(n).split("/").filter(Boolean).join(" ");
        const fmt = add(`#X obj ${X(n)} ${Y(n)} oscformat ${parts};`);
        const pre = add(`#X obj ${X(n)} ${Y(n) + 25} list prepend send;`);
        const trim = add(`#X obj ${X(n)} ${Y(n) + 50} list trim;`);
        const lb = add(`#X obj ${X(n) + 160} ${Y(n) + 25} loadbang;`);
        const con = add(`#X msg ${X(n) + 160} ${Y(n) + 50} connect ${oscHost(n)} ${oscPort(n, 9000)};`);
        const net = add(`#X obj ${X(n)} ${Y(n) + 75} netsend -u -b;`);
        connect(fmt, 0, pre, 0); connect(pre, 0, trim, 0); connect(trim, 0, net, 0);
        connect(lb, 0, con, 0); connect(con, 0, net, 0);
        entry.set(n.id, { in: [null, null, fmt], out: null, byPort: true });
        break;
      }
      default:
        unsupported.push(n.path);
    }
  }
  wireTargets(flat, entry, notes, connect);
  return { content: `${[...lines, ...conns].join("\n")}\n`, unsupported, notes, extension: "pd" };
}

/** Documentation OSC Millumin — adresses proposées, pas un envoi simulé. */
export function exportMilluminOscMap(project) {
  const flat = flatten(project);
  const addresses = [];
  for (const n of flat.nodes) {
    if (n.type === "osc") {
      addresses.push({
        address: n.params?.address || "/millumin/layer/0/opacity",
        host: n.params?.host || "127.0.0.1",
        port: Number(n.params?.port) || 5000,
        node: n.path
      });
    }
  }
  const content = [
    "# No-de Vibe Designer — carte OSC Millumin",
    "# Ces adresses sont déclaratives. Aucun paquet n'est envoyé par cet export.",
    ...addresses.map(a => `${a.address}  # ${a.node} → ${a.host}:${a.port}`),
    addresses.length ? "" : "# (aucun node OSC dans le projet)"
  ].join("\n");
  return { content: `${content}\n`, addresses, unsupported: [] };
}
