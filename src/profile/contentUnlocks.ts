import {
  CURSE_IDS,
  UPGRADE_DEFINITIONS,
  UPGRADE_IDS,
  type CurseId,
  type UpgradeId,
} from '../game/progression';
import { masteryLevelForXp, masteryRewardsFor } from './mastery';
import type { CharacterId, PlayerProfile } from './types';
import { accountLevelForXp } from './profileProgression';

export const UPGRADE_UNLOCK_LEVELS: Readonly<Record<UpgradeId, number>> = Object.freeze(
  Object.fromEntries(
    UPGRADE_IDS.map((upgradeId) => [upgradeId, authoredUpgradeUnlockLevel(upgradeId)]),
  ) as Record<UpgradeId, number>,
);

export const CURSE_UNLOCK_LEVELS: Readonly<Record<CurseId, number>> = Object.freeze({
  bloodMoonPact: 2,
  glassGoal: 3,
  hungryPitch: 4,
  suddenDeath: 5,
  offsideTrap: 6,
  cursedCrowd: 7,
});

export interface ContentUnlockSummary {
  accountLevel: number;
  upgradeIds: readonly UpgradeId[];
  curseIds: readonly CurseId[];
  startingBonusUpgradeIds: Readonly<Partial<Record<CharacterId, UpgradeId>>>;
}

export function unlockedUpgradeIdsForLevel(level: number): UpgradeId[] {
  const safeLevel = safeUnlockLevel(level);
  return UPGRADE_IDS.filter((upgradeId) => UPGRADE_UNLOCK_LEVELS[upgradeId] <= safeLevel);
}

export function unlockedCurseIdsForLevel(level: number): CurseId[] {
  const safeLevel = safeUnlockLevel(level);
  return CURSE_IDS.filter((curseId) => CURSE_UNLOCK_LEVELS[curseId] <= safeLevel);
}

/** Mastery level five unlocks the authored affinity as an optional starting bonus. */
export function unlockedStartingBonus(
  profile: Readonly<PlayerProfile>,
  characterId: CharacterId,
): UpgradeId | null {
  const masteryLevel = masteryLevelForXp(profile.characterMastery[characterId].xp);
  const reward = masteryRewardsFor(characterId).find(
    (candidate) => candidate.kind === 'loadout' && candidate.level <= masteryLevel,
  );
  return reward?.upgradeId ?? null;
}

export function contentUnlockSummary(profile: Readonly<PlayerProfile>): ContentUnlockSummary {
  const accountLevel = accountLevelForXp(profile.accountXp);
  const startingBonusUpgradeIds: Partial<Record<CharacterId, UpgradeId>> = {};
  for (const characterId of profile.unlockedCharacterIds) {
    const upgradeId = unlockedStartingBonus(profile, characterId);
    if (upgradeId) startingBonusUpgradeIds[characterId] = upgradeId;
  }
  return Object.freeze({
    accountLevel,
    upgradeIds: unlockedUpgradeIdsForLevel(accountLevel),
    curseIds: unlockedCurseIdsForLevel(accountLevel),
    startingBonusUpgradeIds: Object.freeze(startingBonusUpgradeIds),
  });
}

function authoredUpgradeUnlockLevel(upgradeId: UpgradeId): number {
  const definition = UPGRADE_DEFINITIONS[upgradeId];
  if (['silverBall', 'powerKick', 'rapidRecall', 'ironHeart', 'bloodMagnet'].includes(upgradeId)) return 1;
  if (definition.kind === 'passive') return Math.min(6, Math.max(2, definition.minPlayerLevel));
  if (['redCard', 'voidGoal', 'spectralTeammate'].includes(upgradeId)) return 7;
  if (definition.minPlayerLevel >= 4) return 6;
  if (definition.prerequisites.length > 0) return 4;
  return 2 + Math.min(3, definition.minPlayerLevel - 1);
}

function safeUnlockLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}
