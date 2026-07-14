import { UPGRADE_DEFINITIONS } from './upgradeDefinitions';
import { getAvailableUpgradeIds } from './progression';
import type { ProgressionState, RandomSource, UpgradeId } from './types';

export const UPGRADE_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type UpgradeRarity = (typeof UPGRADE_RARITIES)[number];

export interface UpgradeDraftResources {
  rerolls: number;
  banishes: number;
  skips: number;
}

export interface UpgradeDraftRules {
  choices: number;
  allowedUpgradeIds?: readonly UpgradeId[];
  startingResources: UpgradeDraftResources;
}

export const DEFAULT_UPGRADE_DRAFT_RULES: Readonly<UpgradeDraftRules> = Object.freeze({
  choices: 3,
  startingResources: Object.freeze({ rerolls: 2, banishes: 1, skips: 1 }),
});

const RARITY_WEIGHTS: Readonly<Record<UpgradeRarity, number>> = Object.freeze({
  common: 1,
  rare: 0.62,
  epic: 0.32,
  legendary: 0.14,
});

const LEGENDARY_UPGRADES = new Set<UpgradeId>(['redCard', 'voidGoal', 'spectralTeammate']);
const EPIC_UPGRADES = new Set<UpgradeId>([
  'bloodBomb',
  'spectralVolley',
  'consecratedPitch',
  'headerCannon',
  'cornerStorm',
  'penaltyMine',
  'bootCyclone',
]);

export function rarityForUpgrade(upgradeId: UpgradeId): UpgradeRarity {
  if (LEGENDARY_UPGRADES.has(upgradeId)) return 'legendary';
  if (EPIC_UPGRADES.has(upgradeId)) return 'epic';
  const definition = UPGRADE_DEFINITIONS[upgradeId];
  return definition.minPlayerLevel >= 3 || definition.prerequisites.length > 0 ? 'rare' : 'common';
}

/** Weighted, deterministic-capable offer with unlock, banish, and duplicate filtering. */
export function createDraftOffer(
  state: Readonly<ProgressionState>,
  rng: RandomSource = Math.random,
  options: Readonly<{
    count?: number;
    allowedUpgradeIds?: readonly UpgradeId[];
    banishedUpgradeIds?: readonly UpgradeId[];
    previousOffer?: readonly UpgradeId[];
  }> = {},
): UpgradeId[] {
  const allowed = options.allowedUpgradeIds ? new Set(options.allowedUpgradeIds) : null;
  const banned = new Set(options.banishedUpgradeIds ?? []);
  const previous = new Set(options.previousOffer ?? []);
  let pool = getAvailableUpgradeIds(state).filter(
    (upgradeId) => (!allowed || allowed.has(upgradeId)) && !banned.has(upgradeId),
  );
  const wanted = Math.min(Math.max(0, Math.floor(options.count ?? 3)), pool.length);
  if (wanted === 0) return [];

  // A reroll should feel different whenever the remaining pool permits it.
  if (pool.length - previous.size >= wanted) pool = pool.filter((upgradeId) => !previous.has(upgradeId));

  const result: UpgradeId[] = [];
  while (result.length < wanted && pool.length > 0) {
    const selected = takeWeighted(pool, rng);
    result.push(selected);
    pool = pool.filter((upgradeId) => upgradeId !== selected);
  }
  return result;
}

/** Run-scoped economy for reroll, banish, and skip actions. */
export class UpgradeDraftSession {
  private resources: UpgradeDraftResources;
  private readonly banished = new Set<UpgradeId>();
  private offer: UpgradeId[] = [];

  public constructor(private readonly rules: Readonly<UpgradeDraftRules> = DEFAULT_UPGRADE_DRAFT_RULES) {
    this.resources = normalizeResources(rules.startingResources);
  }

  public get state(): Readonly<{
    resources: UpgradeDraftResources;
    banishedUpgradeIds: readonly UpgradeId[];
    currentOffer: readonly UpgradeId[];
  }> {
    return Object.freeze({
      resources: { ...this.resources },
      banishedUpgradeIds: [...this.banished],
      currentOffer: [...this.offer],
    });
  }

  public roll(state: Readonly<ProgressionState>, rng: RandomSource = Math.random): readonly UpgradeId[] {
    this.offer = createDraftOffer(state, rng, {
      count: this.rules.choices,
      allowedUpgradeIds: this.rules.allowedUpgradeIds,
      banishedUpgradeIds: [...this.banished],
    });
    return [...this.offer];
  }

  public reroll(
    state: Readonly<ProgressionState>,
    rng: RandomSource = Math.random,
  ): readonly UpgradeId[] | null {
    if (this.resources.rerolls <= 0 || this.offer.length === 0) return null;
    this.resources.rerolls -= 1;
    const previousOffer = this.offer;
    this.offer = createDraftOffer(state, rng, {
      count: this.rules.choices,
      allowedUpgradeIds: this.rules.allowedUpgradeIds,
      banishedUpgradeIds: [...this.banished],
      previousOffer,
    });
    return [...this.offer];
  }

  public banish(
    upgradeId: UpgradeId,
    state: Readonly<ProgressionState>,
    rng: RandomSource = Math.random,
  ): readonly UpgradeId[] | null {
    if (this.resources.banishes <= 0 || !this.offer.includes(upgradeId)) return null;
    this.resources.banishes -= 1;
    this.banished.add(upgradeId);
    this.offer = createDraftOffer(state, rng, {
      count: this.rules.choices,
      allowedUpgradeIds: this.rules.allowedUpgradeIds,
      banishedUpgradeIds: [...this.banished],
      previousOffer: [upgradeId],
    });
    return [...this.offer];
  }

  public skip(): boolean {
    if (this.resources.skips <= 0 || this.offer.length === 0) return false;
    this.resources.skips -= 1;
    this.offer = [];
    return true;
  }

  public accept(upgradeId: UpgradeId): boolean {
    if (!this.offer.includes(upgradeId)) return false;
    this.offer = [];
    return true;
  }

  public reset(): void {
    this.resources = normalizeResources(this.rules.startingResources);
    this.banished.clear();
    this.offer = [];
  }
}

function takeWeighted(pool: readonly UpgradeId[], rng: RandomSource): UpgradeId {
  const weighted = pool.map((upgradeId) => ({
    upgradeId,
    weight: RARITY_WEIGHTS[rarityForUpgrade(upgradeId)],
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999999, rng())) * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor < 0) return item.upgradeId;
  }
  return weighted.at(-1)?.upgradeId ?? pool[0]!;
}

function normalizeResources(resources: Readonly<UpgradeDraftResources>): UpgradeDraftResources {
  return {
    rerolls: safeCount(resources.rerolls),
    banishes: safeCount(resources.banishes),
    skips: safeCount(resources.skips),
  };
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
