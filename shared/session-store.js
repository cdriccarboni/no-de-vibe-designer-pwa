/**
 * Session resume — last project meta, known hosts/devices, Remote Camera room,
 * workspace prefs. ACCOUNT/ART link is separate from LOCAL (project/Stage/MIDI…).
 * Never persist long-lived secrets/tokens; short pairing codes may expire.
 */

import { LINK_STATES } from "./connection-states.js";
import { rememberHost, loadRememberedHost } from "./discovery/host-card.js";

export const SESSION_KEY = "nvd.session.v1";
export const RC_ROOM_KEY = "nvd.rc.last-room";
export const COMPANION_BASE_KEY = "nvd.companionBase";

const EMPTY = () => ({
  version: 1,
  updatedAt: null,
  lastProjectName: null,
  workspace: "bureau",
  prefs: { restoreAutosave: true, loadDemo: true },
  artAccount: { state: LINK_STATES.DISCONNECTED, note: "LOCAL always available — ART login optional" },
  knownHosts: [],
  knownDevices: [],
  remoteCamera: { room: null, companionBase: null, lastStatus: LINK_STATES.DISCONNECTED, lastSeen: null },
  midiMaps: null,
  stageCueId: null
});

function storageOrThrow(storage) {
  if (!storage?.getItem || !storage?.setItem) throw new Error("Stockage session indisponible");
  return storage;
}

export function loadSession(storage = globalThis.localStorage) {
  const s = storageOrThrow(storage);
  try {
    const raw = s.getItem(SESSION_KEY);
    if (!raw) return EMPTY();
    const parsed = JSON.parse(raw);
    return { ...EMPTY(), ...parsed, prefs: { ...EMPTY().prefs, ...(parsed.prefs || {}) } };
  } catch {
    return EMPTY();
  }
}

export function saveSession(patch, storage = globalThis.localStorage) {
  const s = storageOrThrow(storage);
  const next = {
    ...loadSession(s),
    ...patch,
    updatedAt: new Date().toISOString()
  };
  if (patch?.prefs) next.prefs = { ...loadSession(s).prefs, ...patch.prefs };
  // Strip accidental secrets
  if (next.remoteCamera) {
    delete next.remoteCamera.token;
    delete next.remoteCamera.sessionToken;
  }
  s.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export function rememberRemoteCameraRoom(room, { companionBase = null, status = LINK_STATES.KNOWN } = {}, storage = globalThis.localStorage) {
  const code = String(room || "").toUpperCase();
  if (!code) throw new Error("Salon Remote Camera vide");
  const s = storageOrThrow(storage);
  s.setItem(RC_ROOM_KEY, code);
  if (companionBase) s.setItem(COMPANION_BASE_KEY, companionBase);
  return saveSession({
    remoteCamera: {
      room: code,
      companionBase: companionBase || s.getItem(COMPANION_BASE_KEY) || null,
      lastStatus: status,
      lastSeen: new Date().toISOString()
    }
  }, s);
}

export function loadRemoteCameraRoom(storage = globalThis.localStorage) {
  const s = storageOrThrow(storage);
  const session = loadSession(s);
  const room = (session.remoteCamera?.room || s.getItem(RC_ROOM_KEY) || "").toUpperCase();
  return room || null;
}

export function upsertKnownHost(card, state = LINK_STATES.KNOWN, storage = globalThis.localStorage) {
  if (!card?.host) throw new Error("Carte hôte incomplète");
  rememberHost(storage, card);
  const session = loadSession(storage);
  const id = `${card.host}:${card.port}`;
  const entry = {
    id,
    kind: "ws-host",
    label: card.name || id,
    host: card.host,
    port: card.port,
    wsUrl: card.wsUrl,
    pairCode: card.pairCode || null,
    state,
    lastSeen: new Date().toISOString()
  };
  const knownHosts = [entry, ...session.knownHosts.filter((h) => h.id !== id)].slice(0, 12);
  return saveSession({ knownHosts }, storage);
}

export function upsertKnownDevice(device, storage = globalThis.localStorage) {
  if (!device?.id || !device?.kind) throw new Error("Appareil connu incomplet");
  const session = loadSession(storage);
  const entry = {
    ...device,
    state: device.state || LINK_STATES.KNOWN,
    lastSeen: device.lastSeen || new Date().toISOString()
  };
  // Never store raw tokens
  if (entry.resume) {
    delete entry.resume.token;
    delete entry.resume.sessionToken;
  }
  const knownDevices = [entry, ...session.knownDevices.filter((d) => d.id !== entry.id)].slice(0, 24);
  return saveSession({ knownDevices }, storage);
}

export function setDeviceLinkState(id, state, storage = globalThis.localStorage) {
  if (!LINK_STATES[state]) throw new Error(`État lien inconnu : ${state}`);
  const session = loadSession(storage);
  const knownDevices = session.knownDevices.map((d) => (d.id === id ? { ...d, state, lastSeen: new Date().toISOString() } : d));
  const knownHosts = session.knownHosts.map((h) => (h.id === id ? { ...h, state, lastSeen: new Date().toISOString() } : h));
  return saveSession({ knownDevices, knownHosts }, storage);
}

/** Boot helper: last host for mobile / remote WS without forcing QR rescan. */
export function resumeLastHost(storage = globalThis.localStorage) {
  const card = loadRememberedHost(storage);
  if (!card) return { state: LINK_STATES.UNAVAILABLE, card: null };
  return { state: LINK_STATES.KNOWN, card };
}

export function markProjectMeta(name, extras = {}, storage = globalThis.localStorage) {
  return saveSession({ lastProjectName: name || null, ...extras }, storage);
}
