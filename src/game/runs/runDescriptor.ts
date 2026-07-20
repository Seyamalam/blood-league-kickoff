import { SeededRandom, deriveSeed, hashSeed, normalizeSeed, type RandomSource } from '../random';

export const RUN_RANDOM_STREAM_NAMES = ['spawn', 'upgrades', 'events', 'loot', 'boss', 'cosmetic'] as const;

export type RunRandomStreamName = (typeof RUN_RANDOM_STREAM_NAMES)[number];
export type RunMode = 'standard' | 'tutorial' | 'daily' | 'weekly' | 'custom';

export interface RunDescriptor {
  readonly seed: number;
  readonly seedCode: string;
  readonly mode: RunMode;
  readonly challengeKey: string | null;
  readonly rulesetVersion: string;
}

export interface ScheduledRunSeed {
  readonly seed: number;
  readonly seedCode: string;
  readonly challengeKey: string;
}

export interface CreateRunDescriptorOptions {
  readonly seed?: number | string;
  readonly mode?: RunMode;
  readonly now?: Date;
  readonly rulesetVersion?: string;
  readonly entropy?: RandomSource;
}

export type RunRandomStreams = Readonly<Record<RunRandomStreamName, SeededRandom>>;

export function createRunDescriptor(options: CreateRunDescriptorOptions = {}): RunDescriptor {
  const mode = options.mode ?? 'standard';
  const scheduled =
    mode === 'daily' ? dailyRunSeed(options.now) : mode === 'weekly' ? weeklyRunSeed(options.now) : null;
  const rawSeed =
    scheduled?.seed ??
    options.seed ??
    (mode === 'tutorial' ? 'blood-league-guided-kickoff' : entropySeed(options.entropy ?? Math.random));
  const seed = normalizeSeed(typeof rawSeed === 'string' ? hashSeed(rawSeed.trim()) : rawSeed);
  return Object.freeze({
    seed,
    seedCode: scheduled?.seedCode ?? encodeSeed(seed),
    mode,
    challengeKey: scheduled?.challengeKey ?? null,
    rulesetVersion: cleanRuleset(options.rulesetVersion),
  });
}

/**
 * Named streams prevent a new cosmetic roll from silently changing enemy waves
 * or upgrade offers for the same run seed.
 */
export function createRunRandomStreams(
  descriptor: Pick<RunDescriptor, 'seed' | 'rulesetVersion'>,
): RunRandomStreams {
  return Object.freeze(
    Object.fromEntries(
      RUN_RANDOM_STREAM_NAMES.map((name) => [
        name,
        new SeededRandom(deriveSeed(descriptor.seed, `${descriptor.rulesetVersion}:${name}`)),
      ]),
    ) as Record<RunRandomStreamName, SeededRandom>,
  );
}

export function dailyRunSeed(date = new Date()): ScheduledRunSeed {
  const day = validDate(date).toISOString().slice(0, 10);
  const challengeKey = `daily:${day}`;
  const seed = hashSeed(`blood-league:${challengeKey}`);
  return Object.freeze({ seed, seedCode: encodeSeed(seed), challengeKey });
}

export function weeklyRunSeed(date = new Date()): ScheduledRunSeed {
  const { year, week } = isoWeek(validDate(date));
  const challengeKey = `weekly:${year}-W${String(week).padStart(2, '0')}`;
  const seed = hashSeed(`blood-league:${challengeKey}`);
  return Object.freeze({ seed, seedCode: encodeSeed(seed), challengeKey });
}

export function encodeSeed(seed: number): string {
  return normalizeSeed(seed).toString(36).toUpperCase().padStart(7, '0');
}

function entropySeed(entropy: RandomSource): number {
  const value = entropy();
  return normalizeSeed(Math.floor((Number.isFinite(value) ? value : 0.5) * 4_294_967_296));
}

function cleanRuleset(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 64) : '1';
}

function validDate(date: Date): Date {
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}

function isoWeek(date: Date): { year: number; week: number } {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year, week };
}
