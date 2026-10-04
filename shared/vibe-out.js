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
  javascript: {
    label:"JavaScript · script",
    extension:"js",
    mime:"text/javascript",
    system:[
      "Tu génères un script JavaScript complet et autonome.",
      "Retourne UNIQUEMENT du JavaScript, sans markdown.",
      "Le script doit avoir un point d'entrée clair et produire un résultat observable (console, DOM/canvas ou sortie explicitement décrite).",
      "Utilise uniquement des APIs JavaScript standard ou celles explicitement demandées.",
      "Ne retourne jamais une réponse vide ni un pseudo-code."
    ].join("\n")
  },
  node: {
    label:"Node.js · script",
    extension:"mjs",
    mime:"text/javascript",
    system:[
      "Tu génères un script Node.js complet et exécutable.",
      "Retourne UNIQUEMENT du JavaScript Node.js, sans markdown.",
      "Le script doit avoir un point d'entrée clair et produire un résultat observable.",
      "Privilégie les APIs Node.js standard et évite les dépendances implicites.",
      "Ne retourne jamais une réponse vide ni un pseudo-code."
    ].join("\n")
  },
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
  python: {
    label:"Python · script",
    extension:"py",
    mime:"text/x-python",
    system:[
      "Tu génères un script Python 3 complet et exécutable.",
      "Retourne UNIQUEMENT du Python, sans markdown.",
      "Le script doit avoir un point d'entrée clair et produire un résultat observable.",
      "Privilégie la bibliothèque standard sauf demande explicite."
    ].join("\n")
  },
  typescript: {
    label:"TypeScript · script",
    extension:"ts",
    mime:"text/typescript",
    system:[
      "Tu génères un programme TypeScript complet et compilable.",
      "Retourne UNIQUEMENT du TypeScript, sans markdown.",
      "Le programme doit avoir un point d'entrée clair et produire un résultat observable.",
      "Évite les dépendances implicites."
    ].join("\n")
  },
  c: {
    label:"C · programme",
    extension:"c",
    mime:"text/x-c",
    system:[
      "Tu génères un programme C complet et compilable.",
      "Retourne UNIQUEMENT le code C, sans markdown.",
      "Le programme doit contenir main() et produire un résultat observable.",
      "Utilise uniquement la bibliothèque standard sauf demande explicite."
    ].join("\n")
  },
  cpp: {
    label:"C++ · programme",
    extension:"cpp",
    mime:"text/x-c++src",
    system:[
      "Tu génères un programme C++ complet et compilable.",
      "Retourne UNIQUEMENT le code C++, sans markdown.",
      "Le programme doit contenir main() et produire un résultat observable.",
      "Utilise la bibliothèque standard sauf demande explicite."
    ].join("\n")
  },
  rust: {
    label:"Rust · programme",
    extension:"rs",
    mime:"text/rust",
    system:[
      "Tu génères un programme Rust complet et compilable.",
      "Retourne UNIQUEMENT le code Rust, sans markdown.",
      "Le programme doit contenir fn main() et produire un résultat observable.",
      "N'utilise que la bibliothèque standard sauf demande explicite."
    ].join("\n")
  },
  swift: {
    label:"Swift · programme",
    extension:"swift",
    mime:"text/swift",
    system:[
      "Tu génères un programme Swift complet et compilable.",
      "Retourne UNIQUEMENT le code Swift, sans markdown.",
      "Le programme doit être autonome et produire un résultat observable.",
      "Utilise les frameworks système uniquement si nécessaires."
    ].join("\n")
  },
  glsl: {
    label:"GLSL · shader",
    extension:"frag",
    mime:"text/plain",
    system:[
      "Tu génères un fragment shader GLSL ES 3.00 complet.",
      "Retourne UNIQUEMENT le shader, sans markdown.",
      "Le shader doit compiler sous WebGL2.",
      "Utilise u_time, u_resolution et u_intensity quand utiles.",
      "Ne déclenche aucun périphérique ou accès système."
    ].join("\n")
  },
  wgsl: {
    label:"WGSL · shader WebGPU",
    extension:"wgsl",
    mime:"text/plain",
    system:[
      "Tu génères un shader WGSL complet et valide pour WebGPU.",
      "Retourne UNIQUEMENT le WGSL, sans markdown.",
      "Le shader doit être compilable par le validateur WebGPU."
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
  if (target === "javascript") {
    if (!/(console\.|document\.|canvas|getElementById|function\s+main\s*\(|=>)/.test(text)) {
      return { ok:false, error:"Vibe Out JavaScript : script exécutable non reconnu", content:text };
    }
  }
  if (target === "node") {
    if (!/(process\.|console\.|import\s+|require\s*\(|async\s+function|function\s+main\s*\(|=>)/.test(text)) {
      return { ok:false, error:"Vibe Out Node.js : script exécutable non reconnu", content:text };
    }
  }
  if (target === "python" && !/(print\s*\(|def\s+main\s*\(|if __name__\\s*===?)/.test(text)) {
    return { ok:false, error:"Vibe Out Python : script exécutable non reconnu", content:text };
  }
  if (target === "typescript" && !/(console\.|function\s+main\s*\(|const\\s+|let\\s+|interface\\s+)/.test(text)) {
    return { ok:false, error:"Vibe Out TypeScript : script non reconnu", content:text };
  }
  if (target === "c" && !(/\bint\s+main\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out C : main() absent", content:text };
  }
  if (target === "cpp" && !(/\bint\s+main\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out C++ : main() absent", content:text };
  }
  if (target === "rust" && !(/\bfn\s+main\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out Rust : fn main() absent", content:text };
  }
  if (target === "swift" && !(/\bprint\s*\(|@main\b|func\s+main\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out Swift : point d'entrée non reconnu", content:text };
  }
  if (target === "glsl" && !(/#version\s+300\s+es/.test(text) && /void\s+main\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out GLSL : shader ES 3.00 non reconnu", content:text };
  }
  if (target === "wgsl" && !(/@(?:fragment|compute|vertex)\b/.test(text) && /fn\s+\w+\s*\(/.test(text))) {
    return { ok:false, error:"Vibe Out WGSL : entry point non reconnu", content:text };
  }
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
