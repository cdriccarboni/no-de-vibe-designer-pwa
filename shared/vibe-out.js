/**
 * Vibe Out — prepare AI-assisted exports for external creative tools.
 * AI transport is injected by the caller. No network call happens in this module.
 */

function compactProject(project = {}) {
  return {
    schema: project.schema,
    version: project.version,
    name: project.name || "No-de patch",
    output: project.output || {},
    nodes: (project.nodes || []).map(n => ({
      id:n.id, type:n.type, title:n.title, x:n.x, y:n.y,
      params:Object.fromEntries(Object.entries(n.params || {}).filter(([k,v]) =>
        !/key|token|secret|password/i.test(k) && ["string","number","boolean"].includes(typeof v)
      ).slice(0, 24))
    })),
    edges: (project.edges || []).map(e => ({
      from:{ node:e.from?.node, port:e.from?.port ?? 0 },
      to:{ node:e.to?.node, port:e.to?.port ?? 0 }
    })),
    timeline:(project.timeline || []).slice(0,120),
    channels:(project.channels || []).slice(0,120)
  };
}

export const VIBE_OUT_TARGETS = Object.freeze({
  max: {
    label:"Max/MSP · JS builder",
    extension:"js",
    mime:"text/javascript",
    system:[
      "Tu génères un script JavaScript pour l'objet js de Max/MSP qui construit le patch dans this.patcher.",
      "Retourne UNIQUEMENT du JavaScript, sans markdown.",
      "Utilise this.patcher.newdefault(), this.patcher.connect() et des objets Max standards.",
      "Expose une fonction bang() qui construit le réseau à l'exécution.",
      "Conserve la topologie, les connexions et les paramètres utiles du patch No-de.",
      "Pour un élément sans équivalent fiable, crée un comment Max TODO_ADAPT plutôt que d'inventer un objet inexistant."
    ].join("\n")
  },
  maxpat: {
    label:"Max/MSP · fichier .maxpat",
    extension:"maxpat",
    mime:"application/json",
    system:[
      "Tu génères un fichier Max/MSP .maxpat complet et ouvrable.",
      "Retourne UNIQUEMENT le JSON du .maxpat, sans markdown.",
      "Utilise des objets Max standards quand c'est possible.",
      "Conserve la topologie, les connexions et les paramètres utiles du patch No-de.",
      "Pour un élément sans équivalent fiable, crée un commentaire Max TODO_ADAPT.",
      "Le JSON racine doit contenir {\"patcher\":{...}}."
    ].join("\n")
  },
  touchdesigner: {
    label:"TouchDesigner",
    extension:"py",
    mime:"text/x-python",
    system:[
      "Tu génères un script Python TouchDesigner complet qui reconstruit un réseau dans /project1.",
      "Retourne UNIQUEMENT du Python exécutable, sans markdown.",
      "Utilise root.create(...) et setInput(...) avec des familles TOP/CHOP/DAT/COMP cohérentes.",
      "Conserve la topologie, les paramètres et les noms du patch No-de.",
      "Si une fonction n'a pas d'équivalent fiable, crée un annotate/comment DAT ou un placeholder clairement nommé TODO_ADAPT plutôt que d'inventer une API.",
      "Le script doit pouvoir être collé dans un Text DAT puis exécuté."
    ].join("\n")
  },
  p5: {
    label:"p5.js",
    extension:"js",
    mime:"text/javascript",
    system:[
      "Tu génères un sketch p5.js complet et autonome.",
      "Retourne UNIQUEMENT du JavaScript, sans markdown.",
      "Utilise setup() et draw(), garde les interactions et mappings du patch No-de.",
      "Utilise des APIs p5.js standards et commente TODO_ADAPT si une fonction externe reste à brancher."
    ].join("\n")
  },
  processing: {
    label:"Processing",
    extension:"pde",
    mime:"text/plain",
    system:[
      "Tu génères un sketch Processing Java complet et autonome.",
      "Retourne UNIQUEMENT le code .pde, sans markdown.",
      "Utilise setup() et draw(), garde les interactions et mappings du patch No-de.",
      "Utilise l'API Processing standard et commente TODO_ADAPT si une fonction externe reste à brancher."
    ].join("\n")
  },
  puredata: {
    label:"Pure Data",
    extension:"pd",
    mime:"text/plain",
    system:[
      "Tu génères un patch Pure Data .pd texte complet et ouvrable.",
      "Retourne UNIQUEMENT le contenu du fichier .pd.",
      "Conserve les connexions et paramètres. Utilise des objets vanilla si possible.",
      "Quand une fonction n'existe pas en vanilla, insère un objet text/commentaire TODO_ADAPT."
    ].join("\n")
  }
});

function stripFences(value = "") {
  return String(value || "").trim()
    .replace(/^\`\`\`(?:json|python|py|text)?\s*/i, "")
    .replace(/\s*\`\`\`$/i, "")
    .trim();
}

export function buildVibeOutPrompt(target, project, instruction = "") {
  const spec = VIBE_OUT_TARGETS[target];
  if (!spec) throw new Error("Cible Vibe Out inconnue");
  return {
    system: spec.system,
    user: [
      "PATCH NO-DE:",
      JSON.stringify(compactProject(project)),
      "",
      "INTENTION UTILISATEUR:",
      String(instruction || "Reproduis le patch le plus fidèlement possible dans le logiciel cible.").slice(0, 8000)
    ].join("\n")
  };
}

export function validateVibeOut(target, content) {
  const text = stripFences(content);
  if (!text) return { ok:false, error:"Vibe Out : réponse vide", content:"" };
  if (target === "max") {
    if (!/(this\.patcher|newdefault\s*\(|function\s+bang\s*\()/.test(text)) {
      return { ok:false, error:"Vibe Out Max : script builder non reconnu", content:text };
    }
  }
  if (target === "maxpat") {
    try {
      const parsed = JSON.parse(text);
      if (!parsed?.patcher || !Array.isArray(parsed.patcher.boxes)) {
        return { ok:false, error:"Vibe Out Maxpat : fichier incomplet", content:text };
      }
      return { ok:true, content:JSON.stringify(parsed, null, 2) };
    } catch (e) {
      return { ok:false, error:"Vibe Out Maxpat : JSON invalide", content:text };
    }
  }
  if (target === "touchdesigner") {
    if (!/(root\s*=|op\(['\"]\/project1|\.create\()/.test(text)) {
      return { ok:false, error:"Vibe Out TouchDesigner : script Python non reconnu", content:text };
    }
  }
  if (target === "p5" && !/(function\s+setup\s*\(|function\s+draw\s*\()/.test(text)) {
    return { ok:false, error:"Vibe Out p5.js : sketch non reconnu", content:text };
  }
  if (target === "processing" && !/(void\s+setup\s*\(|void\s+draw\s*\()/.test(text)) {
    return { ok:false, error:"Vibe Out Processing : sketch non reconnu", content:text };
  }
  if (target === "puredata" && !/^#N canvas/m.test(text)) {
    return { ok:false, error:"Vibe Out Pure Data : en-tête .pd absent", content:text };
  }
  return { ok:true, content:text };
}

export async function generateVibeOut({
  target,
  project,
  instruction = "",
  askAi,
  fallback = null
} = {}) {
  const spec = VIBE_OUT_TARGETS[target];
  if (!spec) throw new Error("Cible Vibe Out inconnue");
  if (typeof askAi !== "function") {
    if (typeof fallback === "function") return { ...fallback(), source:"fallback" };
    throw new Error("Transport IA Vibe Out absent");
  }
  const prompt = buildVibeOutPrompt(target, project, instruction);
  try {
    const result = await askAi(prompt);
    const checked = validateVibeOut(target, result?.content ?? result);
    if (!checked.ok) throw new Error(checked.error);
    return {
      ok:true,
      source:"ai",
      provider:result?.provider || result?.protocol || "ai",
      model:result?.model || "",
      content:checked.content,
      extension:spec.extension,
      mime:spec.mime
    };
  } catch (error) {
    if (typeof fallback === "function") {
      const fb = fallback();
      return {
        ok:true,
        source:"fallback",
        warning:error?.message || String(error),
        content:fb.content,
        unsupported:fb.unsupported || [],
        extension:spec.extension,
        mime:spec.mime
      };
    }
    throw error;
  }
}
