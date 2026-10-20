/** États honnêtes d'une capture getUserMedia (micro / caméra) : jamais « actif » sans flux réel. */
export function mediaErrorState(error, kind = "micro") {
  const name = error?.name || "";
  const msg = error?.message || String(error || "");
  if (name === "NotAllowedError" || name === "SecurityError" || name === "NotSupportedError" || /permission|denied|not supported/i.test(msg)) return { state: "denied", label: `REFUSÉ · autorisation ${kind} refusée (réglages du navigateur)` };
  if (name === "NotFoundError" || name === "OverconstrainedError" || /not found|requested device/i.test(msg)) return { state: "no-device", label: kind === "caméra" ? "AUCUNE CAMÉRA détectée" : "AUCUN MICRO détecté" };
  if (name === "NotReadableError" || name === "AbortError") return { state: "busy", label: `${kind} occupé(e) par une autre application` };
  if (/indisponible|getUserMedia/i.test(msg)) return { state: "unsupported", label: `${kind} indisponible dans ce navigateur` };
  return { state: "error", label: `ERREUR ${kind} · ${msg}` };
}
