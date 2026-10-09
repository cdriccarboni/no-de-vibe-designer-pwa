// Interpréteur de Commandes Contextuelles pour Objets Scénographiques
// No[co]de Vibe Designer — Le Scénographe
// Permet de modifier un objet sélectionné (Ombre, Baleine, Rideau) en langage naturel SANS recréer tout le projet.

import { LiveSilhouetteObject } from '../types/scenography';

export interface ContextualPromptResult {
  updatedObject: LiveSilhouetteObject;
  explanation: string;
  success: boolean;
}

export function executeContextualObjectPrompt(
  prompt: string,
  targetObject: LiveSilhouetteObject
): ContextualPromptResult {
  const lower = prompt.toLowerCase().trim();
  const obj = JSON.parse(JSON.stringify(targetObject)) as LiveSilhouetteObject;

  // 1. MODES D'ANIMATION (Miroir, Autonome, Hybride)
  if (lower.includes('danse') || lower.includes('danse autonome') || lower.includes('prends vie') || lower.includes('autonome')) {
    obj.animationMode = 'autonomous';
    obj.autonomousMotion.style = 'pirate_dance';
    obj.cues.isTriggered = true;
    obj.transform.opacity = 1.0;
    return {
      updatedObject: obj,
      success: true,
      explanation: 'L’Ombre du Pirate prend vie en mode autonome. Elle se détache du comédien et entame une danse scénique rythmée.'
    };
  }

  if (lower.includes('miroir') || lower.includes('imite') || lower.includes('reproduit') || lower.includes('suit le comédien')) {
    obj.animationMode = 'mirror';
    obj.transform.flipHorizontal = true;
    return {
      updatedObject: obj,
      success: true,
      explanation: 'Mode Miroir réactivé : L’ombre se replace face au comédien et reproduit fidèlement chacun de ses gestes avec inversion scénique.'
    };
  }

  if (lower.includes('duo') || lower.includes('hybride') || lower.includes('ensemble') || lower.includes('altern')) {
    obj.animationMode = 'hybrid';
    obj.hybridConfig.danceTogetherBlend = 0.55;
    return {
      updatedObject: obj,
      success: true,
      explanation: 'Mode Hybride Duo engagé : L’ombre alterne entre imitation réactive et pas de danse autonomes pour composer un duo chorégraphique.'
    };
  }

  // 2. CADENCE & RYTHME ("plus lentement", "plus vite")
  if (lower.includes('plus lentement') || lower.includes('ralenti') || lower.includes('calme') || lower.includes('doucement')) {
    obj.autonomousMotion.speed = Math.max(0.3, obj.autonomousMotion.speed * 0.65);
    return {
      updatedObject: obj,
      success: true,
      explanation: `Cadence ralentie (${obj.autonomousMotion.speed.toFixed(2)}x) : Le mouvement de l'ombre devient fluide, délié et contemplatif.`
    };
  }

  if (lower.includes('plus vite') || lower.includes('accélèr') || lower.includes('dynamique') || lower.includes('vitesse')) {
    obj.autonomousMotion.speed = Math.min(2.8, obj.autonomousMotion.speed * 1.45);
    return {
      updatedObject: obj,
      success: true,
      explanation: `Cadence accélérée (${obj.autonomousMotion.speed.toFixed(2)}x) : L'ombre gagne en vivacité et en réactivité scénique.`
    };
  }

  // 3. TRAJECTOIRES & POSITION ("traverse", "éloigne-toi", "reviens", "à jardin", "à cour")
  if (lower.includes('traverse') || lower.includes('traverse la scène') || lower.includes('plateau')) {
    obj.autonomousMotion.spatialRadius = 0.45;
    obj.transform.x = 0.65;
    return {
      updatedObject: obj,
      success: true,
      explanation: 'Trajectoire étendue : L’ombre traverse maintenant la largeur du plateau d’un côté à l’autre.'
    };
  }

  if (lower.includes('éloigne') || lower.includes('distance') || lower.includes('détache')) {
    obj.autonomousMotion.spatialRadius = Math.min(0.5, obj.autonomousMotion.spatialRadius + 0.15);
    obj.transform.x = Math.min(0.85, obj.transform.x + 0.15);
    return {
      updatedObject: obj,
      success: true,
      explanation: 'Éloignement scénique : L’ombre s’écarte spatialement du comédien pour occuper son propre espace de jeu.'
    };
  }

  if (lower.includes('reviens') || lower.includes('derrière') || lower.includes('proche')) {
    obj.autonomousMotion.spatialRadius = 0.12;
    obj.transform.x = 0.35;
    return {
      updatedObject: obj,
      success: true,
      explanation: 'Rapprochement : L’ombre revient se caler dans les pas du comédien.'
    };
  }

  // 4. TAILLE & PROPORTIONS ("plus grande", "réduis la taille", "géante")
  if (lower.includes('plus grand') || lower.includes('agrandi') || lower.includes('géant') || lower.includes('immense')) {
    obj.transform.scale = Math.min(2.5, obj.transform.scale * 1.35);
    return {
      updatedObject: obj,
      success: true,
      explanation: `Échelle scénique augmentée (${obj.transform.scale.toFixed(2)}x) : L'ombre se déploie en silhouette monumentale sur le fond de scène.`
    };
  }

  if (lower.includes('plus petit') || lower.includes('réduis') || lower.includes('discret')) {
    obj.transform.scale = Math.max(0.4, obj.transform.scale * 0.75);
    return {
      updatedObject: obj,
      success: true,
      explanation: `Échelle réduite (${obj.transform.scale.toFixed(2)}x) : La silhouette redevient intime et condensée.`
    };
  }

  // 5. COSTUME & DETAILS ("retire le sabre", "ajoute le chapeau", "plume")
  if (lower.includes('sabre') || lower.includes('rapière')) {
    obj.costume.hasCutlassSabre = !lower.includes('sans') && !lower.includes('enlève') && !lower.includes('retire');
    return {
      updatedObject: obj,
      success: true,
      explanation: obj.costume.hasCutlassSabre
        ? 'Détail de costume actif : Le sabre courbe du pirate est matérialisé à sa ceinture.'
        : 'Détail de costume retiré : Le pirate est désormais sans arme apparente.'
    };
  }

  if (lower.includes('chapeau') || lower.includes('tricorne')) {
    obj.costume.hatType = lower.includes('sans') || lower.includes('retire') ? 'none' : 'tricorn';
    return {
      updatedObject: obj,
      success: true,
      explanation: obj.costume.hatType === 'tricorn'
        ? 'Détail de costume actif : Le chapeau tricorne à panache est fidèlement découpé sur la silhouette.'
        : 'Chapeau retiré de la silhouette.'
    };
  }

  // 6. CAS NON RECONNU -> Demande de clarification sans casser l'objet existant
  return {
    updatedObject: targetObject,
    success: false,
    explanation: `Instruction non comprise pour cet objet ("${prompt}"). Suggestions : « Fais danser cette ombre plus lentement », « Mode miroir », « Traverse la scène », « Agrandis l’ombre » ou « Ajoute le sabre ».'`
  };
}
