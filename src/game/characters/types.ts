import type { ProgressionModifiers, UpgradeId } from '../progression/types';

export const CHARACTER_IDS = ['maestro', 'breakaway', 'tower', 'finisher', 'engine', 'guardian'] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterVisualStyle {
  primaryColor: number;
  accentColor: number;
  bootColor: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  strength: string;
  weakness: string;
  startingUpgradeAffinity: UpgradeId;
  modifierBonus: Readonly<Partial<ProgressionModifiers>>;
  visualStyle: Readonly<CharacterVisualStyle>;
}
