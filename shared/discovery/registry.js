/**
 * Registre de découverte réseau — point d'extension pour un futur backend mDNS/Bonjour.
 * Aujourd'hui : backends LAN UDP + QR/HTTP. Aucun faux succès mDNS.
 */

export function createDiscoveryRegistry(backends = []) {
  const list = Array.isArray(backends) ? [...backends] : [];
  return {
    register(backend) {
      if (!backend?.id) throw new Error("Backend de découverte sans id");
      list.push(backend);
      return this;
    },
    listBackends() {
      return list.map((b) => ({
        id: b.id,
        label: b.label || b.id,
        status: typeof b.status === "function" ? b.status() : (b.status || "unavailable")
      }));
    },
    /**
     * Agrège les hôtes trouvés par les backends disponibles.
     * Les backends PLATFORM-LIMITED / unavailable sont ignorés (pas d'erreur simulée).
     */
    async discover(opts = {}) {
      const found = [];
      for (const b of list) {
        const status = typeof b.status === "function" ? b.status() : (b.status || "unavailable");
        if (status !== "available") continue;
        if (typeof b.discover !== "function") continue;
        const items = await b.discover(opts);
        if (Array.isArray(items)) found.push(...items);
      }
      return found;
    }
  };
}

/** Backend LAN UDP — disponible dès qu'un listener Node fournit des balises. */
export function createLanUdpBackend({ listen } = {}) {
  return {
    id: "lan-udp",
    label: "Balise LAN UDP",
    status: () => (typeof listen === "function" ? "available" : "unavailable"),
    async discover(opts = {}) {
      if (typeof listen !== "function") return [];
      return listen(opts);
    }
  };
}

/**
 * Emplacement réservé pour Bonjour/mDNS.
 * Ne découvre jamais tant qu'aucun adaptateur natif n'est injecté.
 */
export function createMdnsBackend({ adapter = null } = {}) {
  return {
    id: "mdns",
    label: "Bonjour / mDNS",
    status: () => (adapter && typeof adapter.browse === "function" ? "available" : "PLATFORM-LIMITED"),
    async discover(opts = {}) {
      if (!adapter || typeof adapter.browse !== "function") {
        throw new Error("mDNS/Bonjour PLATFORM-LIMITED — aucun adaptateur natif");
      }
      return adapter.browse(opts);
    }
  };
}

/** Backend mémoire / QR / last-host — toujours disponible côté UI. */
export function createRememberedHostBackend({ load } = {}) {
  return {
    id: "remembered-host",
    label: "Dernier hôte / QR",
    status: () => (typeof load === "function" ? "available" : "unavailable"),
    async discover() {
      if (typeof load !== "function") return [];
      const card = load();
      return card ? [card] : [];
    }
  };
}
