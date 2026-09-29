/**
 * MIDI Learn — mappe le prochain CC/note reçu vers une cible.
 * Pas de succès simulé : sans événement MIDI, learn reste en attente.
 */

export function createMidiLearn() {
  let pending = null;
  const maps = new Map(); // targetKey -> { type, channel, number }

  return {
    arm(targetKey, { timeoutMs = 15000 } = {}) {
      if (!targetKey) throw new Error("Cible MIDI Learn manquante");
      pending = { targetKey, armedAt: Date.now(), timeoutMs };
      return { armed: true, targetKey };
    },
    cancel() {
      pending = null;
      return { armed: false };
    },
    isArmed() {
      return !!pending;
    },
    status() {
      if (!pending) return { armed: false };
      if (Date.now() - pending.armedAt > pending.timeoutMs) {
        pending = null;
        return { armed: false, timedOut: true };
      }
      return { armed: true, targetKey: pending.targetKey };
    },
    ingest(message) {
      if (!pending) return null;
      if (Date.now() - pending.armedAt > pending.timeoutMs) {
        pending = null;
        return { timedOut: true };
      }
      const type = message?.type;
      if (type !== "CC" && type !== "NOTE ON") return null;
      const binding = {
        type,
        channel: Number(message.channel) || 1,
        number: Number(message.number) || 0
      };
      maps.set(pending.targetKey, binding);
      const targetKey = pending.targetKey;
      pending = null;
      return { learned: true, targetKey, binding };
    },
    get(targetKey) {
      return maps.get(targetKey) || null;
    },
    resolve(message) {
      const hits = [];
      for (const [targetKey, binding] of maps) {
        if (binding.type !== message?.type) continue;
        if (binding.channel !== (Number(message.channel) || 1)) continue;
        if (binding.number !== (Number(message.number) || 0)) continue;
        hits.push({ targetKey, value: message.value, binding });
      }
      return hits;
    },
    clear(targetKey) {
      if (targetKey) maps.delete(targetKey);
      else maps.clear();
    },
    serialize() {
      return Object.fromEntries(maps);
    },
    restore(obj = {}) {
      maps.clear();
      for (const [k, v] of Object.entries(obj)) maps.set(k, v);
    }
  };
}
