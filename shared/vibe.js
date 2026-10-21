import { APP_NAME, APP_VERSION } from "./version.js";
import { isExecutable } from "./ports.js";
import { validateEdge } from "./graph-engine.js";
import { deterministicVibePlan } from "./vibe-planner.js";
import { secureVibePlan } from "./vibe-safety.js";
import { buildLocalAiPrompt, directOllamaChat, directOllamaProbe, normalizeLocalAiConfig, sanitizeLocalAiResponse, selectLocalModels } from "./local-ai-core.js";
import { assessLocalModels, classifyLocalAiFailure, factsFromLocalAiError } from "./local-ai-diagnostic.js";
import { selectLocalAgents } from "./local-agent-registry.js";
import { buildIsfAgentPrompt, isIsfRequest, normalizeIsfNodeParams } from "./isf-agent.js";
import { mergeRunnableSources } from "./runnable-source.js";
import { chatForTask, normalizeProviderSettings, providerForTask, providerIsPwaSafe, providerRequiresEncryptedSecret } from "./ai-providers/index.js";

/**
 * Vibe coding — génération structurée de patch.
 * 1) Si un endpoint IA est configuré → appel réel
 * 2) Sinon → moteur local déterministe (règles) clairement libellé
 * Jamais de faux « succès IA ».
 */

export function readAiConfig() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem("nvd.ai") || localStorage.getItem("cvd.ai") || "null") || {};
  } catch {
    raw = {};
  }
  const electron = Boolean(globalThis?.nvdDesktop?.runtime === "electron");
  const local = normalizeLocalAiConfig(raw);
  const providerSettings = normalizeProviderSettings(raw);
  if (electron) {
    const endpoint = providerSettings.providers.find(provider => provider.id === "endpoint");
    if (endpoint) endpoint.apiKey = "";
  }
  const { apiKey: _legacyApiKey, ...safeRaw } = raw;
  return {
    ...safeRaw,
    providers: providerSettings.providers,
    routes: providerSettings.routes,
    localEnabled: local.enabled,
    localBaseUrl: local.baseUrl,
    localModel: local.model,
    localSecondaryModel: local.secondaryModel,
    localParallel: local.parallel,
    localTemperature: local.temperature,
    localMaxOps: local.maxOps,
    localAgents: local.agents,
    // Cloud is opt-in. Legacy configs remain readable but are not contacted unless enabled === true.
    enabled: raw.enabled === true
  };
}

export function saveAiConfig(cfg) {
  localStorage.setItem("nvd.ai", JSON.stringify(cfg));
}

function norm(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Parse local déterministe → ops IR.
 */
export function localVibeParse(text, project) {
  return deterministicVibePlan(text, project);
}

function buildVibePrompt(text, project) {
  const executable = project?.nodes?.map(n => n.type) || [];
  return `Tu es le moteur Vibe de ${APP_NAME} ${APP_VERSION}.
Réponds UNIQUEMENT en JSON strict :
{"ops":[{"op":"addNode","type":"...","x":0,"y":0},{"op":"connect","fromType":"...","fromPort":0,"toType":"...","toPort":0},{"op":"setParam","type":"...","key":"...","value":0},{"op":"addClip","track":0,"start":0,"duration":1,"label":"...","kind":"effect|points|cue|shader"}],"summary":"..."}.
Utilise uniquement des nodes exécutables de No-de. N'active jamais automatiquement caméra, micro, Serial, OSC, Art-Net, Servo ou sortie externe. Toute action externe doit rester désarmée ou passer par un Trigger explicite.
Projet actuel nodes: ${JSON.stringify(project.nodes.map(n => ({ id:n.id, type:n.type })))}
Edges: ${JSON.stringify(project.edges || [])}
Instruction utilisateur: ${text}
Nodes déjà présents: ${JSON.stringify(executable)}`;
}

function parseAiOps(content, label = "IA") {
  let parsed = content;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); }
    catch { return { ok:false, unavailable:true, error:`${label} : JSON invalide` }; }
  }
  if (!parsed?.ops || !Array.isArray(parsed.ops)) {
    return { ok:false, unavailable:true, error:`${label} : réponse sans tableau ops` };
  }
  return { ok:true, ops:parsed.ops, summary:parsed.summary || "" };
}

function localAgentTaskForText(text = "") {
  const value = String(text || "").toLowerCase();
  if (isIsfRequest(value)) return "shader";
  if (/\b(processing|\.pde|processing java)\b/.test(value)) return "code";
  if (/\b(node\.js|nodejs|javascript|js|typescript|\.ts|\.js)\b/.test(value)) return "code";
  if (/\bp5(?:\.js)?\b|p5\.js/.test(value)) return "code";
  if (/(image\s*→\s*vibe|image\s*->\s*vibe|photo|dessin|texture|vision|silhouette|image)/.test(value)) return "vision";
  if (/vite|rapide|léger|leger|draft|brouillon/.test(value)) return "fast";
  return "patch";
}

function withLocalAiDeadline(task, timeoutMs) {
  const deadline = Math.max(1000, Math.min(120000, Number(timeoutMs) || 30000));
  let timer;
  const expiration = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Réponse IA trop lente : aucune réponse avant ${deadline / 1000} s`);
      error.name = "TimeoutError";
      error.code = "LOCAL_AI_TIMEOUT";
      reject(error);
    }, deadline);
  });
  return Promise.race([task, expiration]).finally(() => clearTimeout(timer));
}

async function callLocalAi(text, project, cfg) {
  const local = normalizeLocalAiConfig(cfg);
  if (!local.enabled) return { ok:false, unavailable:true, error:"Local AI Core désactivé" };

  // Vibe is an interactive authoring surface: an unavailable or slow model must
  // yield promptly to the local planner instead of trapping the user on "analyse…".
  let probe;
  try {
    probe = await withLocalAiDeadline(probeLocalAi(cfg), local.interactiveTimeoutMs);
  } catch (e) {
    const timedOut = e?.code === "LOCAL_AI_TIMEOUT" || e?.name === "TimeoutError";
    return {
      ok:false,
      unavailable:!timedOut,
      timedOut,
      responded:false,
      error: timedOut ? `Réponse IA trop lente pour le mode instantané (${local.interactiveTimeoutMs / 1000} s)` : `Local AI Core injoignable : ${e?.message || e}`
    };
  }
  if (!probe.ok) return { ok:false, unavailable:true, responded:false, error:probe.error || "Ollama local indisponible" };

  const agentTask = localAgentTaskForText(text);
  const routedAgents = selectLocalAgents(local.agents, {
    task:agentTask,
    limit:local.parallel ? 2 : 1
  });
  const fallbackModels = (probe.localModels || [probe.model]).filter(Boolean);
  const targets = routedAgents.length
    ? routedAgents.map(agent => ({ model:agent.model, baseUrl:agent.baseUrl || local.baseUrl, role:agent.role }))
    : fallbackModels.map(model => ({ model, baseUrl:local.baseUrl, role:"legacy" }));
  const isfMode = isIsfRequest(text);
  const prompt = isfMode ? buildIsfAgentPrompt(text, project) : buildLocalAiPrompt(text, project);

  const ask = async target => {
    const model = target.model;
    const baseUrl = target.baseUrl || local.baseUrl;
    const timeoutMs = Math.min(local.chatTimeoutMs, local.interactiveTimeoutMs);
    const request = typeof globalThis?.nvdDesktop?.localAiChat === "function"
      ? globalThis.nvdDesktop.localAiChat({
          baseUrl,
          model,
          temperature:local.temperature,
          system:prompt.system,
          user:prompt.user,
          numPredict:isfMode ? 8000 : 1800,
          timeoutMs
        })
      : directOllamaChat({
          baseUrl,
          model,
          temperature:local.temperature,
          system:prompt.system,
          user:prompt.user,
          numPredict:isfMode ? 8000 : 1800,
          timeoutMs
        });
    const raw = await withLocalAiDeadline(request, timeoutMs);
    const parsed = sanitizeLocalAiResponse(raw, { maxOps:local.maxOps });
    if (!parsed.ok) throw new Error(parsed.error || "Réponse locale inexploitable");
    return { model, baseUrl, role:target.role, ...parsed };
  };

  try {
    if (local.parallel && targets.length > 1) {
      const settled = await Promise.allSettled(targets.slice(0, 2).map(ask));
      const successes = settled.filter(x => x.status === "fulfilled").map(x => x.value);
      if (!successes.length) {
        const reasons = settled.map(x => x.reason?.message || x.reason).filter(Boolean).join(" · ");
        throw new Error(reasons || "Duo IA local indisponible");
      }
      // Qwen/primary remains authoritative for graph mutation; the lightweight second model
      // acts as a fast second opinion and can fill in only when primary failed.
      const primary = successes.find(x => x.model === targets[0]?.model) || successes[0];
      const second = successes.find(x => x !== primary);
      return {
        ok:true,
        engine:"local-ai-duo",
        ops:primary.ops,
        summary:primary.summary || second?.summary || "",
        note:"Local AI Core · " + successes.map(x => x.model).join(" + ") + ` · ${agentTask} · OFFLINE`,
        localModel:primary.model,
        localModels:successes.map(x => x.model)
      };
    }

    const parsed = await ask(targets[0] || { model:local.model, baseUrl:local.baseUrl, role:"legacy" });
    return {
      ok:true,
      engine:"local-ai",
      ops:parsed.ops,
      summary:parsed.summary,
      note:"Local AI Core · " + parsed.model + ` · ${agentTask} · OFFLINE`,
      localModel:parsed.model,
      localModels:[parsed.model]
    };
  } catch (e) {
    const message = e?.failure?.message || e?.message || String(e);
    const timedOut = e?.code === "LOCAL_AI_TIMEOUT" || e?.name === "TimeoutError" || /aucune réponse avant/i.test(message);
    return {
      ok:false,
      unavailable:!timedOut,
      timedOut,
      responded:false,
      error:timedOut ? `Réponse IA trop lente pour le mode instantané (${local.interactiveTimeoutMs / 1000} s)` : (e?.failure ? message : "Local AI Core injoignable : " + message)
    };
  }
}
export async function probeLocalAi(cfg = readAiConfig(), { fresh = false } = {}) {
  const local = normalizeLocalAiConfig(cfg);
  if (!local.enabled) return { ok:false, available:false, disabled:true, error:"Local AI Core désactivé", models:[], responded:false };
  try {
    const bridgeProbe = globalThis?.nvdDesktop?.localAiProbe || globalThis?.nvdDesktop?.probeLocalAi;
    const result = typeof bridgeProbe === "function"
      ? await bridgeProbe({ baseUrl:local.baseUrl, model:local.model })
      : await directOllamaProbe(local.baseUrl, { model:local.model });
    if (result && result.ok === false) {
      return {
        ok:false,
        available: result.available === true,
        installed:false,
        baseUrl:local.baseUrl,
        models:Array.isArray(result.models) ? result.models : [],
        model:local.model,
        error:result.error || result.failure?.message || "Ollama inaccessible",
        failure:result.failure || null,
        responded:false,
        fresh
      };
    }
    const models = Array.isArray(result?.models) ? result.models : [];
    const assessed = assessLocalModels(models, local.model);
    if (!assessed.ok) {
      return {
        ok:false,
        available:true,
        reachable:true,
        installed:false,
        baseUrl:local.baseUrl,
        models:assessed.models,
        model:local.model,
        error:assessed.error,
        failure:assessed.failure,
        responded:false,
        fresh
      };
    }
    const selected = selectLocalModels(assessed.models, local.model, local.secondaryModel);
    const primaryInstalled = assessed.models.includes(selected.primary)
      || assessed.models.some(name => String(name).split(":")[0] === String(selected.primary).split(":")[0]);
    return {
      ok:true,
      available:true,
      installed:assessed.installed || primaryInstalled,
      baseUrl:local.baseUrl,
      models:assessed.models,
      model:selected.primary,
      localModels:[selected.primary, selected.secondary].filter(Boolean),
      notice:assessed.notice || result?.notice || "",
      failure:assessed.failure || null,
      responded:false,
      fresh
    };
  } catch (e) {
    const failure = e?.failure || classifyLocalAiFailure(factsFromLocalAiError(e, {
      model:local.model,
      probeTimeout:true,
      loopback:/^(https?:\/\/)?(127\.0\.0\.1|localhost|\[::1\])/.test(local.baseUrl)
    }));
    return {
      ok:false,
      available:false,
      installed:false,
      baseUrl:local.baseUrl,
      models:[],
      error:failure?.message || e?.message || String(e),
      failure:failure || null,
      responded:false,
      fresh
    };
  }
}

function augmentRunnableSources(text, result) {
  const merged = mergeRunnableSources(text, result?.ops || []);
  return {
    ...result,
    ops: merged.ops,
    engines: merged.engines,
    unavailableHosts: merged.unavailable,
    note: [result?.note, merged.summary].filter(Boolean).join(" · ")
  };
}

function finalizeVibeResult(result, project, source = result?.engine || "unknown") {
  const secured = secureVibePlan(project, result?.ops || [], { source });
  const securityNotes = [
    ...(secured.security?.rewrites || []),
    ...(secured.security?.dropped || []).map(x => `Refusé : ${x}`)
  ];
  const dropped = (secured.security?.dropped || []).length;
  let coverage = result?.coverage || null;
  if (!coverage) {
    // Réponses d'IA (locale/distante) : jamais présentées comme « complètes » sans vérification.
    coverage = secured.ops.length
      ? { status:"ai", recipe:null, label:"Généré par l'IA", fulfilled:[], missing:[], notes:["Proposition de l'IA : à vérifier avant d'appliquer."] }
      : { status:"none", recipe:null, label:"Aucune opération", fulfilled:[], missing:[], notes:[] };
  }
  if (dropped && coverage.status === "complete") {
    coverage = { ...coverage, status:"partial", missing:[...(coverage.missing || []), { need:`${dropped} opération(s) refusée(s) par le Safety Engine`, reason:(secured.security.dropped || []).join(" ; "), alternative:"Reformuler ou armer manuellement." }] };
  }
  return {
    ...result,
    coverage,
    ok: secured.ops.length > 0,
    ops: secured.ops,
    security: secured.security,
    note: [result?.note, securityNotes.length ? `Safety Engine · ${securityNotes.length} correction(s)` : "Safety Engine · OK"].filter(Boolean).join(" · ")
  };
}

async function callConfiguredProvider(text, project, cfg, task) {
  const settings = normalizeProviderSettings(cfg);
  const provider = providerForTask(settings, task);
  if (!provider?.enabled) return { ok:false, unavailable:true, error:"Aucun fournisseur IA activé pour cette tâche" };
  if (!globalThis?.nvdDesktop && !providerIsPwaSafe(provider)) return { ok:false, unavailable:true, error:"Ce fournisseur est disponible uniquement dans l’application Electron" };
  if (providerRequiresEncryptedSecret(provider) && provider.configured !== true && !provider.apiKey) {
    return { ok:false, unavailable:true, error:`${provider.label} : clé API non configurée` };
  }
  const prompt = buildVibePrompt(text, project);
  const messages = [
    { role:"system", content:"Tu génères exclusivement des opérations JSON sûres pour No[co]de Vibe Designer." },
    { role:"user", content:prompt }
  ];
  try {
    let content;
    // Electron garde les clés et les CLI hors renderer. La PWA appelle uniquement
    // Ollama ou l'endpoint compatible configuré par son propre utilisateur.
    if (typeof globalThis?.nvdDesktop?.aiProviderChat === "function") {
      const result = await globalThis.nvdDesktop.aiProviderChat({
        providerId:provider.id,
        baseUrl:provider.baseUrl,
        model:provider.model,
        messages,
        temperature:0.2,
        timeoutMs:120000
      });
      content = result?.text;
    } else {
      const result = await chatForTask({ settings, task, messages, timeoutMs:30000, temperature:0.2 });
      content = result.text;
    }
    const parsed = parseAiOps(content, provider.label);
    if (!parsed.ok) return parsed;
    return { ok:true, engine:`provider-${provider.id}`, ops:parsed.ops, summary:parsed.summary, note:`${provider.label} · ${provider.model || "modèle par défaut"}` };
  } catch (error) {
    return { ok:false, unavailable:true, error:`${provider.label} : ${error?.message || error}` };
  }
}

export async function runVibe(text, project, { forceLocal = false, task = "patch" } = {}) {
  const cfg = readAiConfig();
  if (!forceLocal) {
    const provider = await callConfiguredProvider(text, project, cfg, task);
    if (provider.ok) return finalizeVibeResult(augmentRunnableSources(text, provider), project, provider.engine);
    let localAi = null;
    if (cfg.localEnabled !== false) {
      localAi = await callLocalAi(text, project, cfg);
      if (localAi.ok) return finalizeVibeResult(augmentRunnableSources(text, { ...localAi, providerError: provider.error }), project, "local-ai");
    }
    const delayed = localAi?.timedOut === true;
    const rules = localVibeParse(text, project);
    return finalizeVibeResult(augmentRunnableSources(text, {
      ok: rules.ops.length > 0,
      engine: "local-planner-fallback",
      ops: rules.ops,
      coverage: rules.coverage,
      summary: rules.note,
      planner: rules.diagnostics,
      ...(delayed ? {} : { aiError: localAi?.error || provider.error }),
      note: delayed
        ? `IA locale trop lente pour le mode instantané · patch créé par le Planner déterministe`
        : `IA indisponible — ${localAi?.error || provider.error} · repli Planner déterministe`,
      aiUnavailable: !delayed,
      aiDelayed: delayed
    }), project, "local-planner-fallback");
  }
  const local = localVibeParse(text, project);
  return finalizeVibeResult(augmentRunnableSources(text, {
    ok: local.ops.length > 0,
    engine: "local-planner",
    ops: local.ops,
    coverage: local.coverage,
    summary: local.note,
    planner: local.diagnostics,
    note: "Planner local déterministe.",
    aiUnavailable: true
  }), project, "local-planner");
}

const AI_PROTECTED_EXTERNAL_TYPES = new Set(["arduino","esp","servo","dmx","osc","twozero","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);

const ALLOWED_TYPES = new Set(["camera", "pointer", "whale", "blob", "threshold", "ghost", "mirror", "bodyclone", "shadow", "transform", "composite", "blackhole", "shader", "midi", "osc", "tracking", "stageio", "subpatch", "audio", "organicaudio", "soundmemo", "phone-camera-front", "phone-camera-back"]);

export function applyVibeOps(project, ops, helpers) {
  const { addNode, addClip, ensureEdges, nodeById } = helpers;
  const secured = secureVibePlan(project, ops || [], { source: "apply", maxOps: 64, maxNewNodes: 16 });
  const errors = [
    ...(secured.security?.dropped || []).map(x => `Safety Engine · ${x}`),
    ...(secured.security?.rewrites || []).map(x => `Safety Engine · ${x}`)
  ];
  const applied = [];
  const findByType = (type) => project.nodes.filter(n => n.type === type);

  for (const op of secured.ops) {
    try {
      if (op.op === "addNode") {
        if (!ALLOWED_TYPES.has(op.type) && !isExecutable(op.type)) {
          errors.push(`Type de node non exécutable ignoré : ${op.type}`);
          continue;
        }
        if (project.nodes.some(n => n.type === op.type) && !op.allowDuplicate) {
          applied.push({ op: "addNode", skipped: true, type: op.type, reason: "déjà présent" });
        } else {
          const n = addNode(op.type, op.x ?? 60, op.y ?? 60);
          if (op.title) n.title = op.title;
          if (op.params && typeof op.params === "object") {
            n.params = { ...n.params, ...op.params };
            if (AI_PROTECTED_EXTERNAL_TYPES.has(n.type) && n.params.auto === true) n.params.auto = false;
          }
          applied.push({ op: "addNode", id: n.id, type: op.type, title: n.title });
        }
      } else if (op.op === "connect") {
        ensureEdges();
        const fromNode = op.fromId ? nodeById(op.fromId) : findByType(op.fromType).at(-1);
        const toNode = op.toId ? nodeById(op.toId) : findByType(op.toType).at(-1);
        if (!fromNode || !toNode) {
          errors.push(`Connexion impossible : nodes manquants (${op.fromType || op.fromId} → ${op.toType || op.toId})`);
          continue;
        }
        const from = { node: fromNode.id, port: op.fromPort ?? 0 };
        const to = { node: toNode.id, port: op.toPort ?? 0 };
        const v = validateEdge(project, from, to);
        if (!v.ok) {
          errors.push(...v.errors);
          continue;
        }
        project.edges = project.edges.filter(x => !(x.to.node === to.node && x.to.port === to.port));
        const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (!project.edges.some(x => x.from.node === from.node && x.from.port === from.port && x.to.node === to.node && x.to.port === to.port)) {
          project.edges.push({ id, from, to });
          applied.push({ op: "connect", id, from, to });
        }
      } else if (op.op === "setParam") {
        const n = op.id ? nodeById(op.id) : findByType(op.type).at(-1);
        if (!n) {
          errors.push(`setParam : node introuvable (${op.type || op.id})`);
          continue;
        }
        if (AI_PROTECTED_EXTERNAL_TYPES.has(n.type) && op.key === "auto" && op.value === true) {
          errors.push(`Sécurité scène : l’IA ne peut pas armer automatiquement « ${n.title || n.type} »`);
          continue;
        }
        n.params = { ...n.params, [op.key]: op.value };
        applied.push({ op: "setParam", id: n.id, key: op.key, value: op.value });
      } else if (op.op === "addClip") {
        addClip(op.track ?? 1, op.start ?? 0, op.duration ?? 2, op.label || "Vibe", op.kind || "effect");
        applied.push({ op: "addClip", label: op.label });
      } else {
        errors.push(`Opération inconnue : ${op.op}`);
      }
    } catch (e) {
      errors.push(e.message || String(e));
    }
  }
  return { applied, errors };
}
