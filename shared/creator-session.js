/**
 * État léger du composeur Créateur partagé par Vibe et CX.
 * Le brouillon survit au rechargement ; une proposition reste volontairement
 * en mémoire afin de ne jamais restaurer une action non confirmée.
 */
export function createCreatorSession({ storage = globalThis.localStorage, key = "nvd.creator-session.v1" } = {}) {
  let proposal = null;

  function read() {
    try {
      const value = JSON.parse(storage?.getItem?.(key) || "null");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function saveDraft(text = "") {
    const draft = String(text || "").slice(0, 12000);
    try { storage?.setItem?.(key, JSON.stringify({ draft })); } catch { /* quota or private mode: keep the input in memory */ }
    return draft;
  }

  return {
    saveDraft,
    loadDraft() {
      return String(read().draft || "");
    },
    setProposal(result) {
      proposal = result?.ops?.length ? result : null;
      return proposal;
    },
    getProposal() {
      return proposal;
    },
    clearProposal() {
      proposal = null;
    }
  };
}
