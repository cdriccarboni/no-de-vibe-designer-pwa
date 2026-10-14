/**
 * Recettes Vibe — intentions créatives complètes (P0 audit 2026-10-10).
 *
 * Le planner par mots-clés ajoutait un nœud isolé par mot reconnu ("particule" → 1 nœud,
 * aucun câblage) tout en annonçant un succès. Une recette décrit au contraire une chaîne
 * complète sources → traitements → sortie, avec uniquement des nœuds exécutables et des
 * ports réels (vérifiés par `validateEdge` au moment de l'application).
 *
 * Chaque recette déclare HONNÊTEMENT ce qu'elle ne peut pas faire (`missing`) : le résultat
 * est alors « partiel » et l'interface l'affiche. Aucun périphérique n'est armé, aucune
 * permission (micro/caméra) n'est demandée automatiquement.
 */
// Normalisation locale (évite un import circulaire avec vibe-planner.js).
const normalizeVibeText = text => String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const has = (t, re) => re.test(t);

const MIC = /\b(micro|microphone|voix|son|sonore|audio|bruit|musique)\b/;
const PARTICLES = /\b(particule|particules|particle|particles|poussiere|etincelles?)\b/;
const MOTION = /\b(mouvement|bouge|bouger|geste|gestes|danse|deplacement|presence|personne|acteur|actrice|interprete|comedien|comedienne)\b/;

function add(type, x, y, extra = {}) {
  return { op: "addNode", type, x, y, allowDuplicate: true, ...extra };
}
function link(fromType, fromPort, toType, toPort) {
  return { op: "connect", fromType, fromPort, toType, toPort };
}

export const VIBE_RECIPES = [
  {
    id: "mic-particles",
    label: "Particules pilotées par le micro",
    match: t => has(t, PARTICLES) && has(t, MIC) && !has(t, MOTION),
    build() {
      return {
        ops: [
          add("audio", 60, 60, { title: "Micro (désarmé)", params: { mode: "mic", enabled: false } }),
          add("smooth", 300, 60, { title: "Lissage niveau" }),
          add("pointer", 60, 250),
          add("flowfield", 540, 120, { title: "Particules · flux" }),
          add("stage-output", 800, 120, { title: "Sortie particules" }),
          link("audio", 2, "smooth", 0),
          link("smooth", 1, "flowfield", 2),
          link("pointer", 0, "flowfield", 0),
          link("pointer", 1, "flowfield", 1),
          link("flowfield", 3, "stage-output", 0)
        ],
        fulfilled: ["particules (champ de flux)", "niveau du micro lissé → énergie des particules", "sortie vidéo"],
        missing: [],
        notes: ["Le micro est ajouté DÉSARMÉ : activez « enabled » du nœud Micro dans l'inspecteur (autorisation navigateur requise)."]
      };
    }
  },
  {
    id: "button-sound-light",
    label: "Bouton → son + changement lumineux",
    match: t => has(t, /\b(bouton|button|interrupteur|toggle)\b/) && has(t, /\b(son|sonore|audio)\b/) && has(t, /\b(lumi|lumiere|eclairage|light|dmx|projecteur)\w*/),
    build() {
      return {
        ops: [
          add("boolean", 60, 120, { title: "Bouton (bascule)" }),
          add("audio", 320, 40, { title: "Son (oscillateur)", params: { mode: "tone", freq: 330, gain: 0.12 } }),
          add("shader", 320, 220, { title: "Lumière visuelle" }),
          add("dmx", 320, 400, { title: "Lumière DMX (désarmée)", params: { auto: false } }),
          add("stage-output", 580, 220, { title: "Sortie lumière" }),
          link("boolean", 0, "audio", 1),
          link("boolean", 0, "shader", 1),
          link("boolean", 0, "dmx", 2),
          link("shader", 2, "stage-output", 0)
        ],
        fulfilled: ["bascule logique (bouton)", "son déclenché par la bascule", "changement lumineux à l'écran (Shader Lab)", "valeur DMX câblée (désarmée)"],
        missing: [
          { need: "Vrai bouton cliquable dans l'interface", reason: "Aucun nœud « bouton » n'existe ; la bascule se règle via « value » dans l'inspecteur ou une Control Surface.", alternative: "Exposer « value » sur une Control Surface (Régie/Mobile)." },
          { need: "Lumière physique", reason: "Le DMX/Art-Net exige le bridge desktop ou un ENTTEC branché ; rien n'est envoyé tant que le nœud est désarmé.", alternative: "Utiliser le rendu « Lumière visuelle » en répétition." }
        ],
        notes: []
      };
    }
  },
  {
    id: "camera-mask",
    label: "Masque vidéo interactif piloté par la caméra",
    match: t => has(t, /\b(masque|mask|detourage)\b/) && has(t, /\b(camera|webcam)\b/),
    build() {
      return {
        ops: [
          add("camera", 60, 80, { title: "Caméra" }),
          add("pointer", 60, 300, { title: "Pointeur (seuil)" }),
          add("depthmask", 340, 80, { title: "Masque silhouette" }),
          add("videofile", 340, 300, { title: "Vidéo masquée (fichier à choisir)" }),
          add("composite", 620, 160, { title: "Masque sur vidéo", params: { blend: "normal", opacity: 1 } }),
          add("stage-output", 880, 160, { title: "Sortie masque" }),
          link("camera", 0, "depthmask", 0),
          link("pointer", 0, "depthmask", 1),
          link("videofile", 0, "composite", 0),
          link("depthmask", 2, "composite", 1),
          link("composite", 2, "stage-output", 0)
        ],
        fulfilled: ["caméra → masque de silhouette", "seuil piloté par le pointeur", "composition sur une vidéo", "sortie"],
        missing: [
          { need: "Fichier vidéo de fond", reason: "Le nœud Fichier vidéo est ajouté vide : aucun média n'est inventé.", alternative: "Choisir un fichier dans l'inspecteur du nœud." }
        ],
        notes: ["La caméra n'est pas démarrée automatiquement : l'autorisation du navigateur reste à votre main."]
      };
    }
  },
  {
    id: "video-crossfade-osc",
    label: "Fondu entre deux vidéos",
    match: t => has(t, /\b(fondu|crossfade|fondu enchaine|transition)\b/) && has(t, /\b(video|videos)\b/),
    build(t) {
      const wantsOsc = has(t, /\bosc\b/);
      const missing = [
        { need: "Fichiers vidéo A et B", reason: "Les deux nœuds Fichier vidéo sont ajoutés vides : aucun média n'est inventé.", alternative: "Choisir les deux fichiers dans l'inspecteur." }
      ];
      if (wantsOsc) {
        missing.push({
          need: "Réception d'une commande OSC",
          reason: "Le nœud OSC de No[co]de ENVOIE seulement ; il n'existe pas encore de nœud d'entrée OSC dans le graphe.",
          alternative: "Le fondu est piloté par une Automation (LFO) ; remplacez-la par un contrôleur MIDI (CC) pour un déclenchement externe."
        });
      }
      return {
        ops: [
          // Ordre significatif : « connect » vise le DERNIER nœud du type, donc A est câblé
          // avant l'ajout de B.
          add("composite", 380, 160, { title: "Fondu A→B", params: { blend: "normal" } }),
          add("videofile", 60, 60, { title: "Vidéo A" }),
          link("videofile", 0, "composite", 0),
          add("videofile", 60, 260, { title: "Vidéo B" }),
          link("videofile", 0, "composite", 1),
          add("automation", 60, 470, { title: "Fondu (LFO)" }),
          link("automation", 2, "composite", 3),
          add("stage-output", 660, 160, { title: "Sortie fondu" }),
          link("composite", 2, "stage-output", 0)
        ],
        fulfilled: ["deux sources vidéo", "mélange A/B piloté par un signal (port « mix » du Composite)", "sortie"],
        missing,
        notes: []
      };
    }
  },
  {
    id: "silhouette-particles",
    label: "Silhouette interactive + particules qui suivent l'acteur",
    match: t => has(t, /\b(silhouette|ombre|contour)\b/) && has(t, PARTICLES),
    build() {
      return {
        ops: [
          add("camera", 60, 120, { title: "Caméra scène" }),
          add("presence", 320, 120, { title: "Présence acteur" }),
          add("threshold", 580, 40, { title: "Silhouette" }),
          add("flowfield", 580, 260, { title: "Particules · suivent l'acteur" }),
          add("composite", 840, 150, { title: "Silhouette + particules", params: { blend: "screen" } }),
          add("stage-output", 1100, 150, { title: "Sortie silhouette" }),
          link("camera", 0, "presence", 0),
          link("presence", 4, "threshold", 0),
          link("presence", 1, "flowfield", 0),
          link("presence", 2, "flowfield", 1),
          link("presence", 3, "flowfield", 2),
          link("threshold", 2, "composite", 0),
          link("flowfield", 3, "composite", 1),
          link("composite", 2, "stage-output", 0)
        ],
        fulfilled: ["caméra → présence de l'acteur", "silhouette (seuil)", "particules pilotées par la position et l'activité de l'acteur", "composition + sortie"],
        missing: [],
        notes: ["La caméra n'est pas démarrée automatiquement ; la qualité du suivi dépend de l'éclairage (à valider sur plateau)."]
      };
    }
  },
  {
    id: "sound-from-motion",
    label: "Ambiance sonore générative pilotée par le mouvement",
    match: t => has(t, /\b(ambiance|sonore|son|audio|musique|sonorisation|drone)\b/) && has(t, /\b(generatif|generative|genere|generer|procedural)\b/) && has(t, MOTION),
    build() {
      return {
        ops: [
          add("camera", 60, 120, { title: "Caméra mouvement" }),
          add("presence", 320, 120, { title: "Présence / activité" }),
          add("smooth", 580, 120, { title: "Lissage activité" }),
          add("organicaudio", 820, 120, { title: "Ambiance générative", params: { gain: 0.08 } }),
          link("camera", 0, "presence", 0),
          link("presence", 3, "smooth", 0),
          link("smooth", 1, "organicaudio", 1)
        ],
        fulfilled: ["caméra → activité de la personne", "lissage", "oscillateur génératif dont la hauteur suit le mouvement"],
        missing: [
          { need: "Texture sonore riche", reason: "Le moteur audio embarqué est un oscillateur simple (volume bas par défaut) : pas de nappes ni d'échantillons.", alternative: "Remplacer par un patch libpd/Pure Data pour un vrai sound design." }
        ],
        notes: ["Le son démarre dès l'application (geste utilisateur) : baissez le gain ou désactivez « enabled » en salle."]
      };
    }
  }
];

/**
 * @param {string} text
 * @param {{nodes?:object[]}} [project] projet courant (idempotence : une recette déjà appliquée n'est pas rejouée)
 * @returns {null | {recipe:object, ops:object[], coverage:object, note:string}}
 */
export function planFromRecipe(text, project = { nodes: [] }) {
  const t = normalizeVibeText(text);
  for (const recipe of VIBE_RECIPES) {
    if (!recipe.match(t)) continue;
    const already = (project?.nodes || []).filter(n => n?.params?.vibeRecipe === recipe.id);
    if (already.length) {
      return {
        recipe,
        ops: [],
        coverage: {
          status: "unchanged",
          recipe: recipe.id,
          label: recipe.label,
          fulfilled: [`« ${recipe.label} » est déjà présent (${already.length} nœud(s)) : rien n'a été dupliqué.`],
          missing: [],
          notes: ["Pour recommencer, supprimez ces nœuds ou modifiez-les directement dans le graphe."]
        },
        note: `Recette « ${recipe.label} » déjà appliquée · aucune duplication`
      };
    }
    const built = recipe.build(t);
    const status = built.missing.length ? "partial" : "complete";
    // Marqueur de provenance : permet l'idempotence et le suivi dans l'inspecteur.
    const ops = built.ops.map(o => o.op === "addNode" ? { ...o, params: { ...(o.params || {}), vibeRecipe: recipe.id } } : o);
    return {
      recipe,
      ops,
      coverage: {
        status,
        recipe: recipe.id,
        label: recipe.label,
        fulfilled: built.fulfilled,
        missing: built.missing,
        notes: built.notes
      },
      note: `Recette « ${recipe.label} » · ${status === "complete" ? "patch complet" : `patch partiel (${built.missing.length} manque${built.missing.length > 1 ? "s" : ""})`}`
    };
  }
  return null;
}
