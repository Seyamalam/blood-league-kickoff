import { evaluateChallenges } from './challenges';
import { accountLevelForXp, updateLifetime, updateMastery, updatePersonalBests } from './profileProgression';
import { calculateRunAccountXp } from './runRewards';
import { masteryLevelForXp, newlyUnlockedMasteryRewards } from './mastery';
import {
  challengesForStadium,
  cloneStadiumMastery,
  createEmptyStadiumMastery,
  stadiumCosmetic,
  updateStadiumMastery,
} from './stadiumMastery';
import {
  CHALLENGE_IDS,
  CHARACTER_IDS,
  PROFILE_STADIUM_IDS,
  type ChallengeId,
  type ChallengeProgress,
  type CharacterId,
  type CharacterMastery,
  type CosmeticSlot,
  type CompletedRun,
  type LifetimeStatistics,
  type PersonalBests,
  type PlayerProfile,
  type ProfileStadiumId,
  type ProfileDocumentV1,
  type RunRecord,
  type RunSettlement,
  type StorageLike,
  type StadiumMasteryProgress,
} from './types';
import { unlockedCharactersForLevel } from './unlocks';

const PROFILE_VERSION = 1;
const DEFAULT_STORAGE_KEY = 'blood-league-kickoff.profile';
const MAX_RECENT_RUNS = 20;
const MAX_PROCESSED_RUN_IDS = 200;

export type ProfileListener = (profile: Readonly<PlayerProfile>) => void;

/** Small, schema-validated persistent profile for browser and desktop builds. */
export class ProfileStore {
  private profile: PlayerProfile;
  private readonly listeners = new Set<ProfileListener>();

  public constructor(
    private readonly storageKey = DEFAULT_STORAGE_KEY,
    private readonly storage: StorageLike | null = browserStorage(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.profile = this.load();
  }

  public get value(): Readonly<PlayerProfile> {
    return cloneProfile(this.profile);
  }

  public recordRun(runInput: Readonly<CompletedRun>): RunSettlement {
    const run = sanitizeCompletedRun(runInput);
    const previousAccountLevel = accountLevelForXp(this.profile.accountXp);
    if (!run || this.profile.processedRunIds.includes(run.id)) {
      return {
        applied: false,
        profile: this.value,
        run: null,
        accountXpEarned: 0,
        previousAccountLevel,
        accountLevel: previousAccountLevel,
        newlyUnlockedCharacterIds: [],
        completedChallengeIds: [],
        newlyUnlockedMasteryRewardIds: [],
        completedStadiumChallengeIds: [],
        newlyUnlockedCosmeticIds: [],
      };
    }

    const accountXpEarned = calculateRunAccountXp(run);
    const record: RunRecord = {
      ...run,
      accountXpEarned,
      masteryXpEarned: accountXpEarned,
    };
    const previousUnlocked = new Set(this.profile.unlockedCharacterIds);
    const previousCosmetics = new Set(this.profile.unlockedCosmeticIds);
    const characterMastery = cloneMastery(this.profile.characterMastery);
    const previousMasteryLevel = masteryLevelForXp(characterMastery[run.characterId].xp);
    characterMastery[run.characterId] = updateMastery(
      characterMastery[run.characterId],
      run,
      record.masteryXpEarned,
    );
    const stadiumUpdate = updateStadiumMastery(this.profile.stadiumMastery, run);
    const newlyUnlockedCosmeticIds = stadiumUpdate.unlockedCosmeticIds.filter(
      (cosmeticId) => !previousCosmetics.has(cosmeticId),
    );
    const next: PlayerProfile = {
      ...cloneProfile(this.profile),
      updatedAt: run.completedAt,
      accountXp: this.profile.accountXp + accountXpEarned,
      characterMastery,
      stadiumMastery: stadiumUpdate.progress,
      unlockedCosmeticIds: uniqueStrings([
        ...this.profile.unlockedCosmeticIds,
        ...stadiumUpdate.unlockedCosmeticIds,
      ]),
      lifetime: updateLifetime(this.profile.lifetime, run),
      personalBests: updatePersonalBests(this.profile.personalBests, run),
      recentRuns: [record, ...this.profile.recentRuns].slice(0, MAX_RECENT_RUNS),
      processedRunIds: [run.id, ...this.profile.processedRunIds].slice(0, MAX_PROCESSED_RUN_IDS),
    };
    const challengeUpdate = evaluateChallenges(next, run);
    next.challengeProgress = challengeUpdate.progress;
    const accountLevel = accountLevelForXp(next.accountXp);
    next.unlockedCharacterIds = unlockedCharactersForLevel(accountLevel);
    if (!next.unlockedCharacterIds.includes(next.selectedCharacterId)) {
      next.selectedCharacterId = 'maestro';
    }
    const newlyUnlockedCharacterIds = next.unlockedCharacterIds.filter(
      (characterId) => !previousUnlocked.has(characterId),
    );
    const nextMasteryLevel = masteryLevelForXp(characterMastery[run.characterId].xp);
    const newlyUnlockedMasteryRewardIds = newlyUnlockedMasteryRewards(
      run.characterId,
      previousMasteryLevel,
      nextMasteryLevel,
    ).map((reward) => reward.id);

    this.profile = next;
    this.persist();
    this.emit();
    return {
      applied: true,
      profile: this.value,
      run: {
        ...record,
        upgradeIds: [...record.upgradeIds],
        evolutionIds: [...record.evolutionIds],
        challengeModifierIds: record.challengeModifierIds ? [...record.challengeModifierIds] : undefined,
      },
      accountXpEarned,
      previousAccountLevel,
      accountLevel,
      newlyUnlockedCharacterIds,
      completedChallengeIds: challengeUpdate.completed,
      newlyUnlockedMasteryRewardIds,
      completedStadiumChallengeIds: stadiumUpdate.completedChallengeIds,
      newlyUnlockedCosmeticIds,
    };
  }

  public selectCharacter(characterId: CharacterId): boolean {
    if (!this.profile.unlockedCharacterIds.includes(characterId)) return false;
    if (this.profile.selectedCharacterId === characterId) return true;
    this.profile = { ...cloneProfile(this.profile), selectedCharacterId: characterId, updatedAt: this.now() };
    this.persist();
    this.emit();
    return true;
  }

  /** Equip an earned presentation-only reward. This never changes combat modifiers. */
  public equipCosmetic(cosmeticId: string): boolean {
    const cosmetic = stadiumCosmetic(cosmeticId);
    if (!cosmetic || !this.profile.unlockedCosmeticIds.includes(cosmeticId)) return false;
    if (this.profile.equippedCosmetics[cosmetic.slot] === cosmeticId) return true;
    this.profile = {
      ...cloneProfile(this.profile),
      equippedCosmetics: { ...this.profile.equippedCosmetics, [cosmetic.slot]: cosmeticId },
      updatedAt: this.now(),
    };
    this.persist();
    this.emit();
    return true;
  }

  public unequipCosmetic(slot: CosmeticSlot): boolean {
    if (!this.profile.equippedCosmetics[slot]) return false;
    const equippedCosmetics = { ...this.profile.equippedCosmetics };
    delete equippedCosmetics[slot];
    this.profile = { ...cloneProfile(this.profile), equippedCosmetics, updatedAt: this.now() };
    this.persist();
    this.emit();
    return true;
  }

  public reset(): Readonly<PlayerProfile> {
    this.profile = createDefaultProfile(this.now());
    this.persist();
    this.emit();
    return this.value;
  }

  public subscribe(listener: ProfileListener, emitCurrent = false): () => void {
    this.listeners.add(listener);
    if (emitCurrent) listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private load(): PlayerProfile {
    const fallback = createDefaultProfile(this.now());
    if (!this.storage) return fallback;
    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (!serialized) return fallback;
      const document: unknown = JSON.parse(serialized);
      if (!isRecord(document) || document.version !== PROFILE_VERSION || !isRecord(document.profile)) {
        return fallback;
      }
      return sanitizeProfile(document.profile, fallback);
    } catch {
      return fallback;
    }
  }

  private persist(): void {
    if (!this.storage) return;
    const document: ProfileDocumentV1 = { version: PROFILE_VERSION, profile: this.profile };
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(document));
    } catch {
      // The in-memory profile remains authoritative when storage is unavailable.
    }
  }

  private emit(): void {
    const snapshot = this.value;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function createDefaultProfile(now = new Date().toISOString()): PlayerProfile {
  return {
    createdAt: now,
    updatedAt: now,
    accountXp: 0,
    selectedCharacterId: 'maestro',
    unlockedCharacterIds: ['maestro'],
    characterMastery: emptyMastery(),
    challengeProgress: emptyChallengeProgress(),
    stadiumMastery: createEmptyStadiumMastery(),
    unlockedCosmeticIds: [],
    equippedCosmetics: {},
    lifetime: emptyLifetime(),
    personalBests: emptyPersonalBests(),
    recentRuns: [],
    processedRunIds: [],
  };
}

export function sanitizeProfile(value: unknown, fallback = createDefaultProfile()): PlayerProfile {
  if (!isRecord(value)) return cloneProfile(fallback);
  const accountXp = integer(value.accountXp);
  const allowedCharacters = unlockedCharactersForLevel(accountLevelForXp(accountXp));
  const storedUnlocked = array(value.unlockedCharacterIds)
    .filter(isCharacterId)
    .filter((id, index, values) => values.indexOf(id) === index);
  const unlockedCharacterIds = CHARACTER_IDS.filter(
    (id) => allowedCharacters.includes(id) || storedUnlocked.includes(id),
  );
  if (!unlockedCharacterIds.includes('maestro')) unlockedCharacterIds.unshift('maestro');
  const selected = isCharacterId(value.selectedCharacterId) ? value.selectedCharacterId : 'maestro';
  const recentRuns = array(value.recentRuns)
    .map(sanitizeRunRecord)
    .filter((run): run is RunRecord => run !== null)
    .slice(0, MAX_RECENT_RUNS);
  const processedRunIds = uniqueStrings([
    ...array(value.processedRunIds),
    ...recentRuns.map((run) => run.id),
  ]).slice(0, MAX_PROCESSED_RUN_IDS);
  return {
    createdAt: string(value.createdAt, fallback.createdAt),
    updatedAt: string(value.updatedAt, fallback.updatedAt),
    accountXp,
    selectedCharacterId: unlockedCharacterIds.includes(selected) ? selected : 'maestro',
    unlockedCharacterIds,
    characterMastery: sanitizeMastery(value.characterMastery),
    challengeProgress: sanitizeChallenges(value.challengeProgress),
    stadiumMastery: sanitizeStadiumMastery(value.stadiumMastery),
    unlockedCosmeticIds: sanitizeUnlockedCosmetics(value.unlockedCosmeticIds),
    equippedCosmetics: sanitizeEquippedCosmetics(value.equippedCosmetics, value.unlockedCosmeticIds),
    lifetime: sanitizeLifetime(value.lifetime),
    personalBests: sanitizePersonalBests(value.personalBests),
    recentRuns,
    processedRunIds,
  };
}

function sanitizeCompletedRun(value: unknown): CompletedRun | null {
  if (!isRecord(value)) return null;
  if (!nonEmptyString(value.id) || !nonEmptyString(value.buildVersion) || !isCharacterId(value.characterId)) {
    return null;
  }
  return {
    id: value.id,
    completedAt: nonEmptyString(value.completedAt) ? value.completedAt : new Date(0).toISOString(),
    buildVersion: value.buildVersion,
    characterId: value.characterId,
    outcome: value.outcome === 'victory' ? 'victory' : 'defeat',
    score: integer(value.score),
    kills: integer(value.kills),
    goals: integer(value.goals),
    timeSeconds: finite(value.timeSeconds),
    level: Math.max(1, integer(value.level)),
    upgradeIds: uniqueStrings(array(value.upgradeIds)),
    evolutionIds: uniqueStrings(array(value.evolutionIds)),
    ...sanitizeReplayMetadata(value),
  };
}

function sanitizeReplayMetadata(
  value: Record<string, unknown>,
): Pick<
  CompletedRun,
  | 'seed'
  | 'seedCode'
  | 'runMode'
  | 'challengeKey'
  | 'rulesetVersion'
  | 'difficultyId'
  | 'challengeModifierIds'
  | 'rewardMultiplier'
  | 'stadiumId'
> {
  const metadata: Pick<
    CompletedRun,
    | 'seed'
    | 'seedCode'
    | 'runMode'
    | 'challengeKey'
    | 'rulesetVersion'
    | 'difficultyId'
    | 'challengeModifierIds'
    | 'rewardMultiplier'
    | 'stadiumId'
  > = {};
  if (typeof value.seed === 'number' && Number.isFinite(value.seed))
    metadata.seed = Math.floor(value.seed) >>> 0;
  if (nonEmptyString(value.seedCode)) metadata.seedCode = value.seedCode.slice(0, 32);
  if (isRecordedRunMode(value.runMode)) metadata.runMode = value.runMode;
  if (value.challengeKey === null) metadata.challengeKey = null;
  else if (nonEmptyString(value.challengeKey)) metadata.challengeKey = value.challengeKey.slice(0, 80);
  if (nonEmptyString(value.rulesetVersion)) metadata.rulesetVersion = value.rulesetVersion.slice(0, 64);
  if (nonEmptyString(value.difficultyId)) metadata.difficultyId = value.difficultyId.slice(0, 32);
  metadata.challengeModifierIds = uniqueStrings(array(value.challengeModifierIds)).slice(0, 8);
  if (typeof value.rewardMultiplier === 'number' && Number.isFinite(value.rewardMultiplier)) {
    metadata.rewardMultiplier = Math.max(0.1, Math.min(5, value.rewardMultiplier));
  }
  if (isProfileStadiumId(value.stadiumId)) metadata.stadiumId = value.stadiumId;
  return metadata;
}

function sanitizeRunRecord(value: unknown): RunRecord | null {
  const run = sanitizeCompletedRun(value);
  if (!run || !isRecord(value)) return null;
  return {
    ...run,
    accountXpEarned: integer(value.accountXpEarned),
    masteryXpEarned: integer(value.masteryXpEarned),
  };
}

function emptyMastery(): Record<CharacterId, CharacterMastery> {
  return Object.fromEntries(
    CHARACTER_IDS.map((id) => [id, { xp: 0, matches: 0, wins: 0, bestScore: 0 }]),
  ) as Record<CharacterId, CharacterMastery>;
}

function sanitizeMastery(value: unknown): Record<CharacterId, CharacterMastery> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    CHARACTER_IDS.map((id) => {
      const item = isRecord(source[id]) ? source[id] : {};
      return [
        id,
        {
          xp: integer(item.xp),
          matches: integer(item.matches),
          wins: integer(item.wins),
          bestScore: integer(item.bestScore),
        },
      ];
    }),
  ) as Record<CharacterId, CharacterMastery>;
}

function emptyChallengeProgress(): Record<ChallengeId, ChallengeProgress> {
  return Object.fromEntries(CHALLENGE_IDS.map((id) => [id, { value: 0, completedAt: null }])) as Record<
    ChallengeId,
    ChallengeProgress
  >;
}

function sanitizeChallenges(value: unknown): Record<ChallengeId, ChallengeProgress> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    CHALLENGE_IDS.map((id) => {
      const item = isRecord(source[id]) ? source[id] : {};
      return [
        id,
        {
          value: finite(item.value),
          completedAt: nonEmptyString(item.completedAt) ? item.completedAt : null,
        },
      ];
    }),
  ) as Record<ChallengeId, ChallengeProgress>;
}

function sanitizeStadiumMastery(value: unknown): Record<ProfileStadiumId, StadiumMasteryProgress> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    PROFILE_STADIUM_IDS.map((stadiumId) => {
      const item = isRecord(source[stadiumId]) ? source[stadiumId] : {};
      const validChallengeIds = new Set(challengesForStadium(stadiumId).map((definition) => definition.id));
      return [
        stadiumId,
        {
          matches: integer(item.matches),
          wins: integer(item.wins),
          goals: integer(item.goals),
          kills: integer(item.kills),
          bestScore: integer(item.bestScore),
          completedChallengeIds: uniqueStrings(array(item.completedChallengeIds)).filter((id) =>
            validChallengeIds.has(id),
          ),
        },
      ];
    }),
  ) as Record<ProfileStadiumId, StadiumMasteryProgress>;
}

function sanitizeUnlockedCosmetics(value: unknown): string[] {
  return uniqueStrings(array(value)).filter((cosmeticId) => stadiumCosmetic(cosmeticId) !== null);
}

function sanitizeEquippedCosmetics(
  value: unknown,
  unlockedValue: unknown,
): Partial<Record<CosmeticSlot, string>> {
  const source = isRecord(value) ? value : {};
  const unlocked = new Set(sanitizeUnlockedCosmetics(unlockedValue));
  const result: Partial<Record<CosmeticSlot, string>> = {};
  for (const slot of ['title', 'banner', 'goalEffect', 'trail'] as const) {
    const cosmeticId = source[slot];
    const cosmetic = typeof cosmeticId === 'string' ? stadiumCosmetic(cosmeticId) : null;
    if (cosmetic && cosmetic.slot === slot && unlocked.has(cosmetic.id)) result[slot] = cosmetic.id;
  }
  return result;
}

function emptyLifetime(): LifetimeStatistics {
  return {
    matchesPlayed: 0,
    wins: 0,
    defeats: 0,
    totalScore: 0,
    kills: 0,
    goals: 0,
    survivalSeconds: 0,
    evolutionsUnlocked: 0,
  };
}

function sanitizeLifetime(value: unknown): LifetimeStatistics {
  const source = isRecord(value) ? value : {};
  return {
    matchesPlayed: integer(source.matchesPlayed),
    wins: integer(source.wins),
    defeats: integer(source.defeats),
    totalScore: integer(source.totalScore),
    kills: integer(source.kills),
    goals: integer(source.goals),
    survivalSeconds: finite(source.survivalSeconds),
    evolutionsUnlocked: integer(source.evolutionsUnlocked),
  };
}

function emptyPersonalBests(): PersonalBests {
  return {
    score: 0,
    kills: 0,
    goals: 0,
    highestLevel: 1,
    longestSurvivalSeconds: 0,
    fastestVictorySeconds: null,
  };
}

function sanitizePersonalBests(value: unknown): PersonalBests {
  const source = isRecord(value) ? value : {};
  return {
    score: integer(source.score),
    kills: integer(source.kills),
    goals: integer(source.goals),
    highestLevel: Math.max(1, integer(source.highestLevel)),
    longestSurvivalSeconds: finite(source.longestSurvivalSeconds),
    fastestVictorySeconds:
      source.fastestVictorySeconds === null || source.fastestVictorySeconds === undefined
        ? null
        : finite(source.fastestVictorySeconds),
  };
}

function cloneProfile(profile: Readonly<PlayerProfile>): PlayerProfile {
  return {
    ...profile,
    unlockedCharacterIds: [...profile.unlockedCharacterIds],
    characterMastery: cloneMastery(profile.characterMastery),
    challengeProgress: Object.fromEntries(
      CHALLENGE_IDS.map((id) => [id, { ...profile.challengeProgress[id] }]),
    ) as Record<ChallengeId, ChallengeProgress>,
    stadiumMastery: cloneStadiumMastery(profile.stadiumMastery),
    unlockedCosmeticIds: [...profile.unlockedCosmeticIds],
    equippedCosmetics: { ...profile.equippedCosmetics },
    lifetime: { ...profile.lifetime },
    personalBests: { ...profile.personalBests },
    recentRuns: profile.recentRuns.map((run) => ({
      ...run,
      upgradeIds: [...run.upgradeIds],
      evolutionIds: [...run.evolutionIds],
      challengeModifierIds: run.challengeModifierIds ? [...run.challengeModifierIds] : undefined,
    })),
    processedRunIds: [...profile.processedRunIds],
  };
}

function cloneMastery(
  mastery: Readonly<Record<CharacterId, CharacterMastery>>,
): Record<CharacterId, CharacterMastery> {
  return Object.fromEntries(CHARACTER_IDS.map((id) => [id, { ...mastery[id] }])) as Record<
    CharacterId,
    CharacterMastery
  >;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTER_IDS.includes(value as CharacterId);
}

function isProfileStadiumId(value: unknown): value is ProfileStadiumId {
  return typeof value === 'string' && PROFILE_STADIUM_IDS.includes(value as ProfileStadiumId);
}

function isRecordedRunMode(value: unknown): value is CompletedRun['runMode'] {
  return value === 'standard' || value === 'daily' || value === 'weekly' || value === 'custom';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function integer(value: unknown): number {
  return Math.floor(finite(value));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function string(value: unknown, fallback: string): string {
  return nonEmptyString(value) ? value : fallback;
}

function uniqueStrings(values: readonly unknown[]): string[] {
  return [...new Set(values.filter(nonEmptyString))];
}
