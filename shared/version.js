/** Version logicielle No-de Vibe Designer — incrémenter à chaque livraison. */
export const APP_VERSION = "3.3.4";
export const APP_NAME = "No[co]de Vibe Designer";
export const PROJECT_SCHEMA = "cvd.graph";
/** Format projet. 1 = 0.10.x, 2 = ports de boîte et nodes logique 0.11. Les deux restent lisibles. */
export const PROJECT_FORMAT = 2;
export const BUILD_LABEL = `${APP_NAME} ${APP_VERSION}`;
/** Rempli au build ; vide en dev. */
export const SOURCE_COMMIT = "";

/** Nouveautés affichées par le popup commun à toutes les surfaces. */
export const RELEASE_NOTES = Object.freeze([
  "Nouvelle page Installer No[co]de dans la charte graphique du logiciel.",
  "macOS Universal devient la version desktop prioritaire (Apple Silicon + Intel).",
  "Accès Installer / mettre à jour directement depuis Préférences.",
  "Popup de mise à jour commun à Designer, Show, Mobile, Régie, Plateau et Remote Camera."
]);
