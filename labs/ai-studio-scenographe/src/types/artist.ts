import { EngineId } from './engine';

export interface ArtisticParameter {
  id: string;
  label: string; // e.g. "Énergie cinétique", "Luminescence poétique"
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  mappedEngineParam: string; // Internal engine variable (e.g. "Vitesse", "Aberration", "u_custom.x")
}

export interface ArtisticScene {
  id: string;
  title: string;
  intentionText: string;
  category: 'Danse & Chorégraphie' | 'Concert & Musique' | 'Théâtre & Scénographie' | 'Installation Immersive';
  selectedEngineId: EngineId;
  engineReasoning: string;
  code: string;
  secondaryCode?: string;
  parameters: ArtisticParameter[];
  visualMood: string;
}

export interface ConversationTurn {
  id: string;
  sender: 'artist' | 'nocode';
  text: string;
  appliedAction?: string;
  timestamp: string;
}
