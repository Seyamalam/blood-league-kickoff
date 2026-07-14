import {
  PROFILE_STADIUM_IDS,
  type CompletedRun,
  type CosmeticSlot,
  type ProfileStadiumId,
  type StadiumMasteryProgress,
} from './types';

export type StadiumMasteryMetric = 'matches' | 'wins' | 'goals' | 'kills';

export interface StadiumCosmeticDefinition {
  readonly id: string;
  readonly stadiumId: ProfileStadiumId;
  readonly slot: CosmeticSlot;
  readonly name: string;
  readonly description: string;
}

export interface StadiumMasteryChallengeDefinition {
  readonly id: string;
  readonly stadiumId: ProfileStadiumId;
  readonly name: string;
  readonly description: string;
  readonly metric: StadiumMasteryMetric;
  readonly target: number;
  readonly cosmeticId: string;
}

const STADIUM_NAMES: Readonly<Record<ProfileStadiumId, string>> = Object.freeze({
  'blood-court': 'Blood Court',
  'moonlit-classic': 'Moonlit Classic',
  'emerald-cathedral': 'Emerald Cathedral',
  'royal-amethyst': 'Royal Amethyst',
  'frostbound-arena': 'Frostbound Arena',
});

const COSMETIC_FLAVORS: Readonly<Record<ProfileStadiumId, readonly [string, string, string, string]>> =
  Object.freeze({
    'blood-court': ['Court Initiate', 'Crimson Standard', 'Blood Goal', 'Ember Wake'],
    'moonlit-classic': ['Moonlit Regular', 'Silver Terrace', 'Lunar Goal', 'Rainline Wake'],
    'emerald-cathedral': ['Cathedral Faithful', 'Gilded Standard', 'Sacred Goal', 'Firefly Wake'],
    'royal-amethyst': ['Amethyst Contender', 'Royal Standard', 'Arcane Goal', 'Violet Wake'],
    'frostbound-arena': ['Frostbound Brave', 'Glacial Standard', 'Frozen Goal', 'Snowdrift Wake'],
  });

export const STADIUM_COSMETICS: Readonly<Record<string, StadiumCosmeticDefinition>> = Object.freeze(
  Object.fromEntries(
    PROFILE_STADIUM_IDS.flatMap((stadiumId) => {
      const names = COSMETIC_FLAVORS[stadiumId];
      return [
        cosmetic(stadiumId, 'title', names[0], `A profile title earned at ${STADIUM_NAMES[stadiumId]}.`),
        cosmetic(
          stadiumId,
          'banner',
          names[1],
          `A supporter banner inspired by ${STADIUM_NAMES[stadiumId]}.`,
        ),
        cosmetic(
          stadiumId,
          'goalEffect',
          names[2],
          `A goal celebration themed after ${STADIUM_NAMES[stadiumId]}.`,
        ),
        cosmetic(stadiumId, 'trail', names[3], `A movement trail themed after ${STADIUM_NAMES[stadiumId]}.`),
      ].map((definition) => [definition.id, definition] as const);
    }),
  ),
);

export const STADIUM_MASTERY_CHALLENGES: readonly StadiumMasteryChallengeDefinition[] = Object.freeze(
  PROFILE_STADIUM_IDS.flatMap((stadiumId) => {
    const stadium = STADIUM_NAMES[stadiumId];
    return [
      challenge(stadiumId, 'debut', `Enter ${stadium}`, 'Complete one match here.', 'matches', 1, 'title'),
      challenge(stadiumId, 'victor', `${stadium} Victor`, 'Win three matches here.', 'wins', 3, 'banner'),
      challenge(stadiumId, 'scorer', `${stadium} Scorer`, 'Score ten goals here.', 'goals', 10, 'goalEffect'),
      challenge(stadiumId, 'hunter', `${stadium} Hunter`, 'Defeat 250 enemies here.', 'kills', 250, 'trail'),
    ];
  }),
);

export interface StadiumMasteryUpdate {
  progress: Record<ProfileStadiumId, StadiumMasteryProgress>;
  completedChallengeIds: string[];
  unlockedCosmeticIds: string[];
}

export function createEmptyStadiumMastery(): Record<ProfileStadiumId, StadiumMasteryProgress> {
  return Object.fromEntries(PROFILE_STADIUM_IDS.map((stadiumId) => [stadiumId, emptyProgress()])) as Record<
    ProfileStadiumId,
    StadiumMasteryProgress
  >;
}

export function updateStadiumMastery(
  current: Readonly<Record<ProfileStadiumId, StadiumMasteryProgress>>,
  run: Readonly<CompletedRun>,
): StadiumMasteryUpdate {
  const progress = cloneStadiumMastery(current);
  if (!run.stadiumId) return { progress, completedChallengeIds: [], unlockedCosmeticIds: [] };

  const stadiumProgress = progress[run.stadiumId];
  stadiumProgress.matches += 1;
  stadiumProgress.wins += run.outcome === 'victory' ? 1 : 0;
  stadiumProgress.goals += safeInteger(run.goals);
  stadiumProgress.kills += safeInteger(run.kills);
  stadiumProgress.bestScore = Math.max(stadiumProgress.bestScore, safeInteger(run.score));

  const completedChallengeIds: string[] = [];
  const unlockedCosmeticIds: string[] = [];
  for (const definition of challengesForStadium(run.stadiumId)) {
    if (stadiumProgress.completedChallengeIds.includes(definition.id)) continue;
    if (stadiumProgress[definition.metric] < definition.target) continue;
    stadiumProgress.completedChallengeIds.push(definition.id);
    completedChallengeIds.push(definition.id);
    unlockedCosmeticIds.push(definition.cosmeticId);
  }

  return { progress, completedChallengeIds, unlockedCosmeticIds };
}

export function challengesForStadium(
  stadiumId: ProfileStadiumId,
): readonly StadiumMasteryChallengeDefinition[] {
  return STADIUM_MASTERY_CHALLENGES.filter((definition) => definition.stadiumId === stadiumId);
}

export function stadiumCosmetic(cosmeticId: string): StadiumCosmeticDefinition | null {
  return STADIUM_COSMETICS[cosmeticId] ?? null;
}

export function cloneStadiumMastery(
  value: Readonly<Record<ProfileStadiumId, StadiumMasteryProgress>>,
): Record<ProfileStadiumId, StadiumMasteryProgress> {
  return Object.fromEntries(
    PROFILE_STADIUM_IDS.map((stadiumId) => [
      stadiumId,
      {
        ...value[stadiumId],
        completedChallengeIds: [...value[stadiumId].completedChallengeIds],
      },
    ]),
  ) as Record<ProfileStadiumId, StadiumMasteryProgress>;
}

function cosmetic(
  stadiumId: ProfileStadiumId,
  slot: CosmeticSlot,
  name: string,
  description: string,
): StadiumCosmeticDefinition {
  return Object.freeze({ id: `${stadiumId}-${slot}`, stadiumId, slot, name, description });
}

function challenge(
  stadiumId: ProfileStadiumId,
  suffix: string,
  name: string,
  description: string,
  metric: StadiumMasteryMetric,
  target: number,
  slot: CosmeticSlot,
): StadiumMasteryChallengeDefinition {
  return Object.freeze({
    id: `${stadiumId}-${suffix}`,
    stadiumId,
    name,
    description,
    metric,
    target,
    cosmeticId: `${stadiumId}-${slot}`,
  });
}

function emptyProgress(): StadiumMasteryProgress {
  return { matches: 0, wins: 0, goals: 0, kills: 0, bestScore: 0, completedChallengeIds: [] };
}

function safeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
