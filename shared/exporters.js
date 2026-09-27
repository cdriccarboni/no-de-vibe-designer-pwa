/**
 * Exports structurels Max/MSP (.maxpat JSON) et TouchDesigner (Python).
 * Les nodes sans correspondance sont listés dans `unsupported` — jamais simulés.
 */

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

export function exportMax(project) {
  const flat = flatten(project);
  const boxes = [];
  const lines = [];
  const ids = new Map();
  let i = 1;
  const map = {
    number: n => ({ maxclass: "flonum", text: String(numParam(n, "value", 0)) }),
    multiply: () => ({ maxclass: "newobj", text: "* 1." }),
    midi: () => ({ maxclass: "newobj", text: "ctlin" }),
    osc: n => ({ maxclass: "newobj", text: `udpsend ${n.params?.host || "127.0.0.1"} ${n.params?.port || 8000}` })
  };
  const unsupported = [];
  for (const n of flat.nodes) {
    const maker = map[n.type];
    if (!maker) {
      unsupported.push(n.path);
      continue;
    }
    const id = `obj-${i++}`;
    ids.set(n.id, id);
    boxes.push({
      box: {
        id,
        patching_rect: [n.x || 40, n.y || 40, 110, 22],
        ...maker(n)
      }
    });
  }
  for (const e of flat.edges) {
    if (ids.has(e.from?.node) && ids.has(e.to?.node)) {
      lines.push({
        patchline: {
          source: [ids.get(e.from.node), 0],
          destination: [ids.get(e.to.node), 0]
        }
      });
    }
  }
  const content = JSON.stringify({
    patcher: {
      fileversion: 1,
      appversion: { major: 9, minor: 0, revision: 0, architecture: "arm64" },
      rect: [0, 0, 900, 600],
      boxes,
      lines
    }
  }, null, 2);
  return { content, unsupported };
}

export function exportTouchDesigner(project) {
  const flat = flatten(project);
  const safe = s => String(s).replace(/[^a-zA-Z0-9_]/g, "_").replace(/^([0-9])/, "n_$1");
  const lines = [
    "# No-de Vibe Designer — TouchDesigner import",
    "root = op('/project1')",
    "created = {}"
  ];
  const unsupported = [];
  const map = {
    number: ["constantCHOP", "constant"],
    multiply: ["mathCHOP", "math"],
    midi: ["midiinCHOP", "midiin"],
    osc: ["oscoutCHOP", "oscout"]
  };
  for (const n of flat.nodes) {
    const m = map[n.type];
    if (!m) {
      unsupported.push(n.path);
      continue;
    }
    const name = safe(`${n.title || n.type}_${String(n.id).slice(-4)}`);
    lines.push(`created[${JSON.stringify(n.id)}] = root.create(${m[0]}, ${JSON.stringify(name)})`);
    if (n.type === "number") {
      lines.push(`created[${JSON.stringify(n.id)}].par.value0 = ${numParam(n, "value", 0)}`);
    }
    if (n.type === "osc") {
      lines.push(`created[${JSON.stringify(n.id)}].par.networkaddress = ${JSON.stringify(n.params?.host || "127.0.0.1")}`);
      lines.push(`created[${JSON.stringify(n.id)}].par.port = ${Number(n.params?.port) || 8000}`);
    }
  }
  for (const e of flat.edges) {
    const from = JSON.stringify(e.from?.node);
    const to = JSON.stringify(e.to?.node);
    lines.push(`if ${from} in created and ${to} in created: created[${to}].setInput(0, created[${from}])`);
  }
  lines.push("print('No-de Vibe Designer: import terminé,', len(created), 'operators créés')");
  return { content: `${lines.join("\n")}\n`, unsupported };
}
