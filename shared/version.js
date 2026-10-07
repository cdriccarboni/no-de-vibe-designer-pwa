/** Version logicielle No[co]de Vibe Designer — incrémenter à chaque livraison. */
export const APP_VERSION = "3.3.8";
export const APP_NAME = "No[co]de Vibe Designer";
export const PROJECT_SCHEMA = "cvd.graph";
/** Format projet. 1 = 0.10.x, 2 = ports de boîte et nodes logique 0.11. Les deux restent lisibles. */
export const PROJECT_FORMAT = 2;
export const BUILD_LABEL = `${APP_NAME} ${APP_VERSION}`;
/** Rempli au build ; vide en dev. */
export const SOURCE_COMMIT = "";

/** Nouveautés affichées par le popup commun à toutes les surfaces. */
export const RELEASE_NOTES = Object.freeze([
  "Identité unifiée : nouveau logo No[co]de à cercles concentriques sur fond noir sur toutes les surfaces et applications.",
  "Nom système corrigé : l’application s’appelle désormais No[co]de Vibe Designer sur macOS, Windows, Linux et Android.",
  "Installer public nettoyé : aucun AAB non signé n’est proposé aux utilisateurs.",
  "Remote Camera occupe toute la largeur de la dernière ligne sur mobile.",
  "macOS Universal reste la version desktop recommandée (Apple Silicon + Intel)."
]);
