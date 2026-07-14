import { CHARACTER_IDS, type CharacterId } from './types';

export const CHARACTER_UNLOCK_LEVELS: Readonly<Record<CharacterId, number>> = Object.freeze({
  maestro: 1,
  breakaway: 2,
  tower: 3,
  finisher: 4,
  engine: 5,
  guardian: 6,
});

export function unlockedCharactersForLevel(level: number): CharacterId[] {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return CHARACTER_IDS.filter((id) => CHARACTER_UNLOCK_LEVELS[id] <= safeLevel);
}
