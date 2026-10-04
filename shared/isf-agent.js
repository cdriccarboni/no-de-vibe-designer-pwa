/**
 * ISF Shader Agent — génération spécialisée de shaders interactifs.
 *
 * Le runtime No[co]de Vibe Designer exécute le fragment GLSL du node shader.
 * Les métadonnées ISF sont conservées dans params.isf pour rester exportables
 * et permettre un futur échange avec des hôtes ISF sans inventer de compatibilité.
 */

export const ISF_AGENT_ID = "isf";
export const ISF_AGENT_VERSION = "1.0";

export function isIsfRequest(text = "") {
  const t = String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return /\bisf\b|image shader format|shader interactif|shader realiste|shader réaliste|gros shader|shader generatif|shader génératif|glsl interactif/.test(t);
}

export function buildIsfAgentPrompt(text, project = {}) {
  const nodes = (project.nodes || []).slice(0, 80).map(n => ({
    id:n.id, type:n.type, title:n.title,
    params:Object.fromEntries(Object.entries(n.params || {})
      .filter(([k,v]) => ["number","string","boolean"].includes(typeof v) && !/key|token|secret|password/i.test(k))
      .slice(0, 10))
  }));

  return {
    system: [
      "Tu es ISF Shader Agent de No[co]de Vibe Designer.",
      "Ta spécialité est la création de shaders GLSL fragment interactifs, complexes, visuellement riches et réellement exécutables dans le node shader.",
      "Tu travailles OFFLINE. Tu ne demandes jamais d'accès matériel et tu n'actives jamais caméra, micro, MIDI, OSC ou sortie externe.",
      "Tu dois produire exclusivement un objet JSON valide, sans markdown.",
      "Le résultat doit contenir UNE opération addNode de type shader avec params.glsl contenant un fragment GLSL ES 3.00 complet.",
      "Le shader doit être autonome : il doit fonctionner même sans texture d'entrée.",
      "Utilise les uniformes disponibles : u_time, u_resolution, u_intensity.",
      "Pour l'interactivité, dérive les mouvements de u_time, u_resolution et u_intensity ; n'invente pas d'uniforme obligatoire non fourni.",
      "Ajoute aussi params.isf comme objet de métadonnées ISF : ISFVSERSION, TYPE, NAME, DESCRIPTION et INPUTS.",
      "INPUTS doit rester compatible avec les paramètres réellement disponibles ; n'annonce pas de contrôle que le runtime ne fournit pas.",
      "Privilégie une composition procédurale stable : champs de distance, bruit, fractales légères, feedback simulé, lumière, profondeur et palettes peuvent être combinés.",
      "Évite les boucles non bornées, les divisions par zéro et les fonctions coûteuses qui risquent de bloquer un GPU de spectacle.",
      "Le shader doit être esthétique dès son premier rendu et conserver une bonne lisibilité à 1280×720.",
      "Ne produis jamais de shell, de commande système, de chemin privé, de clé ou de secret."
    ].join("\n"),
    user: JSON.stringify({
      task:String(text || "").slice(0, 8000),
      outputSchema:{
        ops:[{
          op:"addNode",
          type:"shader",
          title:"ISF · <nom>",
          x:320,
          y:160,
          allowDuplicate:true,
          params:{
            glsl:"<fragment GLSL ES 3.00>",
            isf:{
              ISFVSERSION:"2",
              TYPE:"IMAGE",
              NAME:"<nom>",
              DESCRIPTION:"<description>",
              INPUTS:[]
            },
            intensity:1,
            opacity:0.92
          }
        }],
        summary:"résumé court"
      },
      currentProject:{name:project.name || "Projet", nodes}
    })
  };
}

export function normalizeIsfNodeParams(params = {}) {
  const safe = {};
  if (typeof params.glsl === "string") safe.glsl = params.glsl.slice(0, 60000);
  if (params.isf && typeof params.isf === "object") {
    const meta = params.isf;
    safe.isf = {
      ISFVSERSION:String(meta.ISFVSERSION || meta.ISFVERSION || "2").slice(0, 12),
      TYPE:String(meta.TYPE || "IMAGE").slice(0, 32),
      NAME:String(meta.NAME || "No[co]de ISF").slice(0, 160),
      DESCRIPTION:String(meta.DESCRIPTION || "").slice(0, 500),
      INPUTS:Array.isArray(meta.INPUTS) ? meta.INPUTS.slice(0, 32).map(input => {
        if (!input || typeof input !== "object") return null;
        const out = {};
        for (const [k,v] of Object.entries(input).slice(0, 12)) {
          if (typeof v === "string") out[k] = v.slice(0, 240);
          else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
          else if (Array.isArray(v)) out[k] = v.slice(0, 16);
        }
        return out;
      }).filter(Boolean) : []
    };
  }
  for (const key of ["intensity","opacity"]) {
    if (typeof params[key] === "number" && Number.isFinite(params[key])) safe[key] = Math.max(0, Math.min(2, params[key]));
  }
  return safe;
}
