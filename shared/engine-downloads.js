/**
 * Téléchargements officiels proposés seulement si l'outil manque.
 * Processing déjà présent : pas de relance. Max/MSP n'est pas proposé.
 */
export const PROCESSING_PAGE = "https://processing.org/download";
export const PROCESSING_VERSION = "4.5.7";

const PROCESSING_TAG = "processing-1435-4.5.7";
const PROCESSING_BASE = `https://github.com/processing/processing4/releases/download/${PROCESSING_TAG}`;

export const PROCESSING_ARCHIVES = {
  "darwin-arm64": {
    zip: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-macos-aarch64-portable.zip`,
    dmg: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-macos-aarch64.dmg`
  },
  "darwin-x64": {
    zip: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-macos-x64-portable.zip`,
    dmg: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-macos-x64.dmg`
  },
  "linux-x64": {
    zip: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-linux-x64-portable.zip`
  },
  "win32-x64": {
    zip: `${PROCESSING_BASE}/processing-${PROCESSING_VERSION}-windows-x64-portable.zip`
  }
};

export function processingHostKey(platform = "", arch = "") {
  if (platform === "darwin" && arch === "arm64") return "darwin-arm64";
  if (platform === "darwin") return "darwin-x64";
  if (platform === "win32") return "win32-x64";
  return "linux-x64";
}

export function processingOffer({ installed = false, platform = "darwin", arch = "arm64" } = {}) {
  if (installed) return null;
  const archive = PROCESSING_ARCHIVES[processingHostKey(platform, arch)] || PROCESSING_ARCHIVES["darwin-arm64"];
  return {
    id: "processing",
    title: "Processing",
    page: PROCESSING_PAGE,
    downloadUrl: archive.zip,
    dmgUrl: archive.dmg || "",
    note: "Archive portable officielle. Dézipper et ouvrir Processing.app. Aucun Java séparé.",
    separateJava: false
  };
}

export const LIBPD_PAGE = "https://github.com/libpd/libpd";
export const LIBPD_FREE_BUILD = "https://github.com/hyrfilm/libpd-wasm/releases/download/v0.1.6/libpd-wasm-browser.zip";

export function libpdOffer({ ready = false } = {}) {
  if (ready) return null;
  return {
    id: "libpd",
    title: "libpd",
    page: LIBPD_PAGE,
    downloadUrl: LIBPD_FREE_BUILD,
    note: "Build libre de libpd. Une valeur n'est publiée que si ce runtime la renvoie."
  };
}

export function missingEngineOffers({ processingInstalled = false, libpdReady = false, platform = "darwin", arch = "arm64" } = {}) {
  return [
    processingOffer({ installed: processingInstalled, platform, arch }),
    libpdOffer({ ready: libpdReady })
  ].filter(Boolean);
}
