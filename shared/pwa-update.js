/**
 * Décision de mise à jour PWA.
 * Une nouvelle version ne recharge jamais la page tant que l'utilisateur
 * n'a pas confirmé : un rechargement silencieux perdrait le patch en cours.
 */

export function shouldPromptForUpdate({ hasController = false, workerState = "", userConfirmed = false } = {}) {
  return !!hasController && workerState === "installed" && !userConfirmed;
}

export function shouldActivateWaitingWorker({ hasController = false, workerState = "" } = {}) {
  return !hasController && workerState === "installed";
}

export function shouldReloadAfterUpdate({ userConfirmed = false, controllerChanged = false } = {}) {
  return !!userConfirmed && !!controllerChanged;
}
