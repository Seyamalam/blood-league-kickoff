import type { ProgressionModifiers, UpgradeId } from '../game/progression/types';
import { CHARACTER_IDS, type CharacterId, type CharacterMastery } from './types';

export const MAX_MASTERY_LEVEL = 20;

export type MasteryRewardKind = 'title' | 'perk' | 'loadout' | 'colorway';

export interface CharacterMasteryPerk {
  readonly id: string;
  readonly level: number;
  readonly name: string;
  readonly description: string;
  readonly modifierBonus: Readonly<Partial<ProgressionModifiers>>;
}

export interface MasteryReward {
  readonly id: string;
  readonly characterId: CharacterId;
  readonly level: number;
  readonly kind: MasteryRewardKind;
  readonly name: string;
  readonly description: string;
  readonly upgradeId?: UpgradeId;
  readonly perkId?: string;
}

const CHARACTER_TITLES: Readonly<Record<CharacterId, string>> = Object.freeze({
  maestro: 'Midnight Conductor',
  breakaway: 'Uncatchable',
  tower: 'Giant of the Box',
  finisher: 'Cold-Blooded',
  engine: 'Every Blade of Grass',
  guardian: 'Last Line',
});

export const CHARACTER_MASTERY_PERKS: Readonly<Record<CharacterId, readonly CharacterMasteryPerk[]>> =
  Object.freeze({
    maestro: perks(
      perk('maestro-threaded-needle', 3, 'Threaded Needle', 'Adds more bend to every driven ball.', {
        curveStrengthMultiplier: 0.08,
      }),
      perk('maestro-first-touch', 7, 'First Touch', 'Widens the perfect-volley timing window.', {
        volleyWindowBonus: 0.08,
      }),
    ),
    breakaway: perks(
      perk('breakaway-flying-start', 3, 'Flying Start', 'Builds a little more pace immediately.', {
        movementSpeedMultiplier: 0.04,
      }),
      perk('breakaway-second-wind', 7, 'Second Wind', 'Shortens the gap between explosive dashes.', {
        dashCooldownMultiplier: -0.07,
      }),
    ),
    tower: perks(
      perk('tower-aerial-presence', 3, 'Aerial Presence', 'Adds force and control to heavy strikes.', {
        kickPowerMultiplier: 0.06,
        knockbackMultiplier: 0.04,
      }),
      perk('tower-iron-frame', 7, 'Iron Frame', 'Adds ten maximum health.', { maxHealthBonus: 10 }),
    ),
    finisher: perks(
      perk('finisher-composure', 3, 'Composure', 'Deals extra damage to elite threats.', {
        eliteDamageMultiplier: 0.07,
      }),
      perk('finisher-one-touch', 7, 'One Touch', 'Improves direct ball damage.', {
        ballDamageMultiplier: 0.06,
      }),
    ),
    engine: perks(
      perk('engine-wide-coverage', 3, 'Wide Coverage', 'Pulls blood shards from farther away.', {
        pickupRadiusMultiplier: 0.12,
      }),
      perk('engine-extra-time', 7, 'Extra Time', 'Turns relentless running into more pace.', {
        movementSpeedMultiplier: 0.04,
      }),
    ),
    guardian: perks(
      perk('guardian-body-on-line', 3, 'Body on the Line', 'Reduces incoming damage further.', {
        damageTakenMultiplier: -0.06,
      }),
      perk('guardian-command-box', 7, 'Command the Box', 'Strengthens knockback and shard control.', {
        knockbackMultiplier: 0.05,
        pickupRadiusMultiplier: 0.08,
      }),
    ),
  });

/** Total character XP required to enter a mastery level. */
export function totalMasteryXpForLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.floor(level) : 1;
  const steps = Math.max(0, Math.min(MAX_MASTERY_LEVEL, safeLevel) - 1);
  return steps * 180 + steps * steps * 45;
}

export function masteryLevelForXp(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1;
  while (level < MAX_MASTERY_LEVEL && safeXp >= totalMasteryXpForLevel(level + 1)) level += 1;
  return level;
}

export function masteryLevel(mastery: Readonly<CharacterMastery>): number {
  return masteryLevelForXp(mastery.xp);
}

export function masteryRewardsFor(characterId: CharacterId): readonly MasteryReward[] {
  const perksForCharacter = CHARACTER_MASTERY_PERKS[characterId];
  return Object.freeze([
    reward(characterId, 2, 'title', CHARACTER_TITLES[characterId], 'A character-specific profile title.'),
    reward(
      characterId,
      3,
      'perk',
      perksForCharacter[0]?.name ?? 'Signature I',
      perksForCharacter[0]?.description ?? '',
      {
        perkId: perksForCharacter[0]?.id,
      },
    ),
    reward(
      characterId,
      5,
      'loadout',
      'Affinity Start',
      'Unlocks the character affinity as a starting-loadout option.',
      {
        upgradeId: affinityFor(characterId),
      },
    ),
    reward(
      characterId,
      7,
      'perk',
      perksForCharacter[1]?.name ?? 'Signature II',
      perksForCharacter[1]?.description ?? '',
      {
        perkId: perksForCharacter[1]?.id,
      },
    ),
    reward(characterId, 10, 'colorway', 'Crimson Legend', 'Unlocks the mastery colorway for this character.'),
  ]);
}

export function unlockedMasteryRewards(characterId: CharacterId, level: number): readonly MasteryReward[] {
  const safeLevel = Math.max(1, Math.min(MAX_MASTERY_LEVEL, Math.floor(Number.isFinite(level) ? level : 1)));
  return masteryRewardsFor(characterId).filter((rewardItem) => rewardItem.level <= safeLevel);
}

/** Add these values to the base character modifiers when mastery perks are enabled. */
export function masteryModifierBonusFor(
  characterId: CharacterId,
  level: number,
): Readonly<Partial<ProgressionModifiers>> {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(MAX_MASTERY_LEVEL, Math.floor(level))) : 1;
  const result: Partial<ProgressionModifiers> = {};
  for (const masteryPerk of CHARACTER_MASTERY_PERKS[characterId]) {
    if (masteryPerk.level > safeLevel) continue;
    for (const [key, value] of Object.entries(masteryPerk.modifierBonus) as [
      keyof ProgressionModifiers,
      number,
    ][]) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return Object.freeze(result);
}

export function newlyUnlockedMasteryRewards(
  characterId: CharacterId,
  previousLevel: number,
  nextLevel: number,
): readonly MasteryReward[] {
  return masteryRewardsFor(characterId).filter(
    (rewardItem) => rewardItem.level > previousLevel && rewardItem.level <= nextLevel,
  );
}

export function allMasteryRewards(): readonly MasteryReward[] {
  return Object.freeze(CHARACTER_IDS.flatMap((characterId) => masteryRewardsFor(characterId)));
}

function perks(...items: CharacterMasteryPerk[]): readonly CharacterMasteryPerk[] {
  return Object.freeze(items);
}

function perk(
  id: string,
  level: number,
  name: string,
  description: string,
  modifierBonus: Readonly<Partial<ProgressionModifiers>>,
): CharacterMasteryPerk {
  return Object.freeze({ id, level, name, description, modifierBonus: Object.freeze({ ...modifierBonus }) });
}

function reward(
  characterId: CharacterId,
  level: number,
  kind: MasteryRewardKind,
  name: string,
  description: string,
  extra: Pick<MasteryReward, 'upgradeId' | 'perkId'> = {},
): MasteryReward {
  return Object.freeze({
    id: `${characterId}-mastery-${level}`,
    characterId,
    level,
    kind,
    name,
    description,
    ...extra,
  });
}

function affinityFor(characterId: CharacterId): UpgradeId {
  const affinity: Record<CharacterId, UpgradeId> = {
    maestro: 'rapidRecall',
    breakaway: 'powerKick',
    tower: 'powerKick',
    finisher: 'silverBall',
    engine: 'garlicTrail',
    guardian: 'orbitingSpectralBall',
  };
  return affinity[characterId];
}
