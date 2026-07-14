import type { MatchStage } from '../match';
import type { EnemyArchetype } from '../simulation/types';
import { FULL_MATCH_SPAWN_CONFIG } from './config';
import type {
  MutableSpawnProfile,
  SpawnDirectorConfig,
  SpawnDirectorInput,
  SpawnProfile,
  SpawnRandomSource,
} from './types';

const EMPTY_ROSTER = Object.freeze([]);

/** Resolves the authored pressure budget for the current match stage. */
export function resolveSpawnProfile(
  input: Readonly<SpawnDirectorInput>,
  config: SpawnDirectorConfig = FULL_MATCH_SPAWN_CONFIG,
): SpawnProfile {
  return Object.freeze(
    resolveSpawnProfileInto(
      input,
      { enabled: false, matchElapsed: 0, populationCap: 0, spawnInterval: 1, roster: EMPTY_ROSTER },
      config,
    ),
  );
}

/** Fills a caller-owned profile for allocation-free fixed-step simulation use. */
export function resolveSpawnProfileInto(
  input: Readonly<SpawnDirectorInput>,
  target: MutableSpawnProfile,
  config: SpawnDirectorConfig = FULL_MATCH_SPAWN_CONFIG,
): MutableSpawnProfile {
  const stageConfig = config[input.stage];
  if (!stageConfig.enabled) {
    target.enabled = false;
    target.matchElapsed = 0;
    target.populationCap = 0;
    target.spawnInterval = Number.POSITIVE_INFINITY;
    target.roster = EMPTY_ROSTER;
    return target;
  }

  const stageElapsed = finiteInRange(input.stageElapsed, 0, stageConfig.rampDuration, 0);
  const matchElapsed = finiteInRange(input.matchElapsed, 0, 60 * 60, 0);
  const ramp = stageConfig.rampDuration > 0 ? stageElapsed / stageConfig.rampDuration : 1;
  const populationCap = Math.max(
    1,
    Math.round(lerp(stageConfig.populationCapStart, stageConfig.populationCapEnd, ramp)),
  );
  const spawnInterval = finiteInRange(
    lerp(stageConfig.spawnIntervalStart, stageConfig.spawnIntervalEnd, ramp),
    0.1,
    10,
    1,
  );

  target.enabled = true;
  target.matchElapsed = matchElapsed;
  target.populationCap = populationCap;
  target.spawnInterval = spawnInterval;
  target.roster = stageConfig.roster;
  return target;
}

/** Weighted selection consumes randomness only when the simulation actually spawns. */
export function selectSpawnArchetype(
  profile: Readonly<SpawnProfile>,
  rng: SpawnRandomSource = Math.random,
): EnemyArchetype | null {
  if (!profile.enabled || profile.roster.length === 0) return null;
  let totalWeight = 0;
  for (const entry of profile.roster) {
    if (!isUnlocked(entry.unlockMatchTime, profile.matchElapsed)) continue;
    totalWeight += positiveFinite(entry.weight);
  }
  if (totalWeight <= 0) return null;

  let roll = normalizeRandom(rng()) * totalWeight;
  for (const entry of profile.roster) {
    if (!isUnlocked(entry.unlockMatchTime, profile.matchElapsed)) continue;
    roll -= positiveFinite(entry.weight);
    if (roll < 0) return entry.archetype;
  }
  return null;
}

/** Compatibility context for simulation-only tests and diagnostics without a match director. */
export function inferSpawnDirectorInput(matchElapsed: number): SpawnDirectorInput {
  const elapsed = finiteInRange(matchElapsed, 0, 60 * 60, 0);
  let stage: MatchStage;
  let stageStart: number;
  if (elapsed < 30) {
    stage = 'opening';
    stageStart = 0;
  } else if (elapsed < 165) {
    stage = 'firstHalf';
    stageStart = 30;
  } else if (elapsed < 270) {
    stage = 'escalation';
    stageStart = 165;
  } else if (elapsed < 430) {
    stage = 'bloodMoon';
    stageStart = 270;
  } else {
    stage = 'finalWave';
    stageStart = 430;
  }
  return { stage, stageElapsed: elapsed - stageStart, matchElapsed: elapsed };
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * Math.min(1, Math.max(0, alpha));
}

function positiveFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function isUnlocked(unlockMatchTime: number | undefined, matchElapsed: number): boolean {
  return matchElapsed >= finiteInRange(unlockMatchTime ?? 0, 0, 60 * 60, 0);
}

function finiteInRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}
