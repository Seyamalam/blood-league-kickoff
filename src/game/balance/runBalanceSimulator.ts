import { CHARACTER_IDS, applyStartingLoadout, type CharacterId } from '../characters';
import { MINIBOSS_CONFIGS } from '../boss/minibosses';
import { DEFAULT_COUNT_GOALKEEPER_CONFIG } from '../boss/config';
import type { EliteModifierId } from '../encounters';
import {
  EVOLUTION_DEFINITIONS,
  EVOLUTION_IDS,
  UPGRADE_IDS,
  calculateCurseDirectorModifiers,
  calculateModifiers,
  createProgressionState,
  type CurseId,
  type ProgressionModifiers,
  type UpgradeId,
  type UpgradeStacks,
} from '../progression';
import { SeededRandom } from '../random';

export const BALANCE_RUN_DURATION = 540;

export interface BalanceRunOptions {
  readonly characterId: CharacterId;
  readonly seed: number;
  readonly curseIds?: readonly CurseId[];
  readonly duration?: number;
}

export interface BalanceRunReport {
  readonly characterId: CharacterId;
  readonly seed: number;
  readonly duration: number;
  readonly build: readonly UpgradeId[];
  readonly sustainedDps: number;
  readonly burstDps: number;
  readonly effectiveHealth: number;
  readonly mobility: number;
  readonly estimatedKills: number;
  readonly estimatedGoals: number;
  readonly estimatedScore: number;
  readonly crimsonCaptainDefeated: boolean;
  readonly graveyardPlaymakerDefeated: boolean;
  readonly goalkeeperDamage: number;
  readonly goalkeeperDefeated: boolean;
  readonly pressureRating: number;
  readonly powerRating: number;
}

export interface CharacterBalanceSummary {
  readonly reports: readonly BalanceRunReport[];
  readonly averagePower: Readonly<Record<CharacterId, number>>;
  readonly lowestPower: number;
  readonly highestPower: number;
  readonly spreadRatio: number;
}

export interface EncounterBalanceReport {
  readonly id:
    | EliteModifierId
    | 'crimsonCaptain'
    | 'graveyardPlaymaker'
    | 'goalkeeper-guarding'
    | 'goalkeeper-bloodRush'
    | 'goalkeeper-desperation';
  readonly effectiveHealth: number;
  readonly pressure: number;
  readonly targetTimeToDefeat: number;
}

export interface BuildContentCoverage {
  readonly upgrades: readonly UpgradeId[];
  readonly evolutions: readonly string[];
  readonly missingUpgrades: readonly UpgradeId[];
  readonly missingEvolutions: readonly string[];
}

/** Authored routes cover each striker's fantasy while sharing enough defense to finish a full run. */
export const RECOMMENDED_CHARACTER_BUILDS: Readonly<Record<CharacterId, readonly UpgradeId[]>> =
  Object.freeze({
    maestro: build([
      'rapidRecall',
      'ghostPass',
      'frostCleats',
      'voidGoal',
      'bloodDrinker',
      'killerInstinct',
      'spectralTeammate',
      'spectralVolley',
      'bloodBarrier',
      'ironHeart',
      'bloodMagnet',
      'powerKick',
    ]),
    breakaway: build([
      'powerKick',
      'dashShockwave',
      'stormStuds',
      'bloodBomb',
      'killerInstinct',
      'bloodDrinker',
      'bootCyclone',
      'redCard',
      'bloodBarrier',
      'ironHeart',
      'silverBall',
      'bloodMagnet',
    ]),
    tower: build([
      'powerKick',
      'headerCannon',
      'silverBall',
      'rapidRecall',
      'ironHeart',
      'bloodDrinker',
      'piercingStuds',
      'bloodMagnet',
      'bloodBarrier',
      'penaltyMine',
      'cornerStorm',
      'stormStuds',
    ]),
    finisher: build([
      'silverBall',
      'piercingStuds',
      'ricochetBall',
      'stormStuds',
      'killerInstinct',
      'bloodDrinker',
      'redCard',
      'bootCyclone',
      'powerKick',
      'headerCannon',
      'ironHeart',
      'bloodBarrier',
    ]),
    engine: build([
      'garlicTrail',
      'bloodMagnet',
      'frostCleats',
      'consecratedPitch',
      'bloodDrinker',
      'killerInstinct',
      'penaltyMine',
      'bootCyclone',
      'bloodBarrier',
      'ironHeart',
      'dashShockwave',
      'rapidRecall',
    ]),
    guardian: build([
      'orbitingSpectralBall',
      'bloodBarrier',
      'consecratedPitch',
      'stormStuds',
      'ironHeart',
      'bloodDrinker',
      'spectralVolley',
      'killerInstinct',
      'spectralTeammate',
      'cornerStorm',
      'rapidRecall',
      'silverBall',
    ]),
  });

/**
 * Fast deterministic model for relative balance regression, not a replacement
 * for hands-on playtests. It evaluates the same modifiers and authored boss HP.
 */
export function simulateBalanceRun(options: Readonly<BalanceRunOptions>): BalanceRunReport {
  const duration = finiteRange(options.duration ?? BALANCE_RUN_DURATION, 60, BALANCE_RUN_DURATION);
  const curseIds = options.curseIds ?? [];
  const build = RECOMMENDED_CHARACTER_BUILDS[options.characterId];
  const modifiers = modifiersForBuild(options.characterId, build, curseIds);
  const director = calculateCurseDirectorModifiers(curseIds);
  const rng = new SeededRandom(options.seed);
  const execution = 0.94 + rng.next() * 0.12;
  const primaryDps =
    17.5 *
    0.82 *
    modifiers.ballDamageMultiplier *
    modifiers.kickPowerMultiplier *
    modifiers.allDamageMultiplier;
  const secondaryDps =
    estimateSecondaryDps(modifiers) * modifiers.secondaryDamageMultiplier * modifiers.allDamageMultiplier;
  const ultimateDps = ULTIMATE_DPS[options.characterId] * execution;
  const sustainedDps = (primaryDps + secondaryDps + ultimateDps) * execution;
  const burstDps = sustainedDps * (1.32 + modifiers.eliteDamageMultiplier * 0.12);
  const maxHealth = Math.max(50, 100 + modifiers.maxHealthBonus);
  const mitigation = 1 / Math.max(0.25, modifiers.damageTakenMultiplier * director.enemyDamageMultiplier);
  const mobility = modifiers.movementSpeedMultiplier / Math.max(0.4, modifiers.dashCooldownMultiplier);
  const sustain =
    1 +
    modifiers.lifeStealOnPrimaryKill * 0.025 +
    modifiers.lifeStealOnSecondaryKill * 0.04 +
    modifiers.bloodBarrierCharges * 0.12;
  const effectiveHealth = maxHealth * mitigation * sustain * (0.88 + mobility * 0.12);
  const pressureRating =
    director.spawnRateMultiplier *
    director.enemySpeedMultiplier *
    director.enemyHealthMultiplier *
    (1 + director.eliteChanceBonus);
  const activeCombatSeconds = duration * 0.8;
  const enemyBudget = (sustainedDps * activeCombatSeconds) / (24 * director.enemyHealthMultiplier);
  const spawnBudget = (duration / 1.28) * director.spawnRateMultiplier;
  const estimatedKills = Math.floor(Math.min(enemyBudget, spawnBudget) * (0.96 + rng.next() * 0.08));
  const estimatedGoals = Math.max(
    1,
    Math.floor((duration / 82) * (0.9 + modifiers.ballSpeedMultiplier * 0.12) * execution),
  );
  const captainTtk = (MINIBOSS_CONFIGS.crimsonCaptain.maxHealth * director.enemyHealthMultiplier) / burstDps;
  const playmakerTtk =
    (MINIBOSS_CONFIGS.graveyardPlaymaker.maxHealth * director.enemyHealthMultiplier) / burstDps;
  const bossWindow = Math.max(0, duration - 390);
  const goalkeeperDamage = Math.round(
    bossWindow * sustainedDps * 0.27 * modifiers.eliteDamageMultiplier * execution,
  );
  const goalkeeperHealth = DEFAULT_COUNT_GOALKEEPER_CONFIG.maxHealth * director.bossHealthMultiplier;
  const estimatedScore = Math.round(
    (estimatedKills * 36 + estimatedGoals * 1_500 + goalkeeperDamage * 8) * director.rewardMultiplier,
  );
  const powerRating =
    Math.sqrt(sustainedDps) * 14 + Math.sqrt(effectiveHealth) * 4.2 + mobility * 8 + estimatedGoals * 1.8;

  return Object.freeze({
    characterId: options.characterId,
    seed: options.seed,
    duration,
    build,
    sustainedDps: round(sustainedDps),
    burstDps: round(burstDps),
    effectiveHealth: round(effectiveHealth),
    mobility: round(mobility),
    estimatedKills,
    estimatedGoals,
    estimatedScore,
    crimsonCaptainDefeated: captainTtk <= 18,
    graveyardPlaymakerDefeated: playmakerTtk <= 18,
    goalkeeperDamage,
    goalkeeperDefeated: goalkeeperDamage >= goalkeeperHealth,
    pressureRating: round(pressureRating),
    powerRating: round(powerRating),
  });
}

/** Runs the standard fixed seed suite used by tests and pre-release balance checks. */
export function auditCharacterBalance(
  seeds: readonly number[] = [42417, 0x51a7, 0xb100d],
): CharacterBalanceSummary {
  const reports = CHARACTER_IDS.flatMap((characterId) =>
    seeds.map((seed) => simulateBalanceRun({ characterId, seed })),
  );
  const averagePower = Object.fromEntries(
    CHARACTER_IDS.map((characterId) => {
      const characterReports = reports.filter((report) => report.characterId === characterId);
      return [
        characterId,
        round(
          characterReports.reduce((sum, report) => sum + report.powerRating, 0) / characterReports.length,
        ),
      ];
    }),
  ) as Record<CharacterId, number>;
  const powers = Object.values(averagePower);
  const lowestPower = Math.min(...powers);
  const highestPower = Math.max(...powers);
  return Object.freeze({
    reports: Object.freeze(reports),
    averagePower: Object.freeze(averagePower),
    lowestPower,
    highestPower,
    spreadRatio: round((highestPower - lowestPower) / lowestPower),
  });
}

/** Ensures authored routes collectively exercise the complete weapon/evolution matrix. */
export function auditBuildContentCoverage(): BuildContentCoverage {
  const upgrades = new Set(Object.values(RECOMMENDED_CHARACTER_BUILDS).flat());
  const evolutions = EVOLUTION_IDS.filter((evolutionId) =>
    Object.values(RECOMMENDED_CHARACTER_BUILDS).some((path) => {
      const owned = new Set(path);
      return EVOLUTION_DEFINITIONS[evolutionId].requirements.every((requirement) =>
        owned.has(requirement.upgradeId),
      );
    }),
  );
  return Object.freeze({
    upgrades: Object.freeze(UPGRADE_IDS.filter((upgradeId) => upgrades.has(upgradeId))),
    evolutions: Object.freeze(evolutions),
    missingUpgrades: Object.freeze(UPGRADE_IDS.filter((upgradeId) => !upgrades.has(upgradeId))),
    missingEvolutions: Object.freeze(
      EVOLUTION_IDS.filter((evolutionId) => !evolutions.includes(evolutionId)),
    ),
  });
}

/** Target envelopes for elite variants, both minibosses, and every final-boss combat phase. */
export function auditEncounterBalance(referenceDps = 24): readonly EncounterBalanceReport[] {
  const dps = finiteRange(referenceDps, 1, 500);
  const elites: readonly [EliteModifierId, number, number][] = [
    ['armored', 1.75, 1.05],
    ['frenzied', 1, 1.58],
    ['regenerating', 1.25, 1.32],
    ['explosive', 1, 1.45],
    ['possessed', 1.35, 1.5],
  ];
  const reports: EncounterBalanceReport[] = elites.map(([id, healthMultiplier, pressure]) => ({
    id,
    effectiveHealth: round(28 * healthMultiplier),
    pressure,
    targetTimeToDefeat: round((28 * healthMultiplier) / dps),
  }));
  for (const kind of ['crimsonCaptain', 'graveyardPlaymaker'] as const) {
    const config = MINIBOSS_CONFIGS[kind];
    reports.push({
      id: kind,
      effectiveHealth: config.maxHealth,
      pressure: round((config.contactDamage / config.contactCooldown) * 0.1),
      targetTimeToDefeat: round(config.maxHealth / dps),
    });
  }
  const phaseHealth = DEFAULT_COUNT_GOALKEEPER_CONFIG.maxHealth / 3;
  reports.push(
    {
      id: 'goalkeeper-guarding',
      effectiveHealth: phaseHealth,
      pressure: 1,
      targetTimeToDefeat: round(phaseHealth / dps),
    },
    {
      id: 'goalkeeper-bloodRush',
      effectiveHealth: phaseHealth,
      pressure: 1.45,
      targetTimeToDefeat: round(phaseHealth / dps),
    },
    {
      id: 'goalkeeper-desperation',
      effectiveHealth: phaseHealth,
      pressure: 1.9,
      targetTimeToDefeat: round(phaseHealth / dps),
    },
  );
  return Object.freeze(reports.map((report) => Object.freeze(report)));
}

function modifiersForBuild(
  characterId: CharacterId,
  build: readonly UpgradeId[],
  curseIds: readonly CurseId[],
): ProgressionModifiers {
  const base = createProgressionState(characterId);
  const stacks: UpgradeStacks = applyStartingLoadout(base.upgradeStacks, characterId);
  for (const upgradeId of build) stacks[upgradeId] += 1;
  return calculateModifiers(stacks, undefined, characterId, {}, curseIds);
}

function estimateSecondaryDps(modifiers: ProgressionModifiers): number {
  return (
    modifiers.garlicTrailDamage * 0.5 +
    modifiers.orbitingBallDamage * modifiers.orbitingBallCount * 0.38 +
    modifiers.bloodBombDamage * 0.14 +
    modifiers.chainLightningDamage * modifiers.chainLightningTargets * 0.16 +
    modifiers.frostBurstDamage * 0.16 +
    modifiers.dashShockwaveDamage * 0.12 +
    modifiers.holyZoneDamage * 0.75 +
    modifiers.ricochetDamage * modifiers.ricochetTargets * 0.16 +
    modifiers.headerCannonDamage * 0.11 +
    modifiers.cornerStormDamage * modifiers.cornerStormStrikes * 0.2 +
    modifiers.redCardDamage * 0.2 +
    modifiers.spectralTeammateDamage * modifiers.spectralTeammateCount * 0.42 +
    modifiers.penaltyMineDamage * Math.max(1, modifiers.penaltyMineCount) * 0.16 +
    modifiers.bootCycloneDamage * 0.55
  );
}

const ULTIMATE_DPS: Readonly<Record<CharacterId, number>> = Object.freeze({
  maestro: 4.8,
  breakaway: 4.5,
  tower: 5.4,
  finisher: 5.2,
  engine: 4.4,
  guardian: 3.5,
});

function build(upgradeIds: readonly UpgradeId[]): readonly UpgradeId[] {
  return Object.freeze(upgradeIds);
}

function finiteRange(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : maximum;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
