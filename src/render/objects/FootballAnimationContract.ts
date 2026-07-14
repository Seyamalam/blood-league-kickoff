export const FOOTBALL_ANIMATION_STATES = [
  'idle',
  'dribble',
  'strafeLeft',
  'strafeRight',
  'groundPass',
  'lobPass',
  'shoot',
  'header',
  'slideTackle',
  'bicycleKick',
  'damage',
  'knockdown',
  'celebration',
  'victory',
  'defeat',
] as const;

export type FootballAnimationState = (typeof FOOTBALL_ANIMATION_STATES)[number];
export type FootballAnimationPlayback = 'loop' | 'once' | 'terminal';

export interface FootballAnimationResolution {
  readonly state: FootballAnimationState;
  readonly clipName?: string;
  /** Dedicated means a purpose-authored football clip was found. */
  readonly source: 'dedicated' | 'fallback-alias' | 'unavailable';
  readonly playback: FootballAnimationPlayback;
}

interface FootballAnimationDefinition {
  readonly dedicated: readonly string[];
  readonly fallback: readonly string[];
  readonly playback: FootballAnimationPlayback;
}

/**
 * Stable runtime contract for every player avatar. New shared-skeleton exports
 * should use the first dedicated name. Alternative DCC naming is accepted to
 * avoid forcing a re-export solely for a harmless clip-name difference.
 *
 * Fallback entries are honest aliases from the current CC0 general-animation
 * library. They preserve readable timing, but are not claimed as authored
 * football motion.
 */
export const FOOTBALL_ANIMATION_CONTRACT: Readonly<
  Record<FootballAnimationState, FootballAnimationDefinition>
> = {
  idle: {
    dedicated: ['Football_Idle_Loop', 'Idle_Football_Loop'],
    fallback: ['Idle_Loop'],
    playback: 'loop',
  },
  dribble: {
    dedicated: ['Football_Dribble_Loop', 'Dribble_Loop'],
    fallback: ['Jog_Fwd_Loop', 'Walk_Loop'],
    playback: 'loop',
  },
  strafeLeft: {
    dedicated: ['Football_Strafe_Left_Loop', 'Strafe_Left_Loop'],
    fallback: ['Walk_Loop', 'Jog_Fwd_Loop'],
    playback: 'loop',
  },
  strafeRight: {
    dedicated: ['Football_Strafe_Right_Loop', 'Strafe_Right_Loop'],
    fallback: ['Walk_Loop', 'Jog_Fwd_Loop'],
    playback: 'loop',
  },
  groundPass: {
    dedicated: ['Football_Ground_Pass', 'Ground_Pass'],
    fallback: ['Punch_Jab', 'Interact'],
    playback: 'once',
  },
  lobPass: {
    dedicated: ['Football_Lob_Pass', 'Lob_Pass'],
    fallback: ['Spell_Simple_Shoot', 'Interact'],
    playback: 'once',
  },
  shoot: {
    dedicated: ['Football_Shoot', 'Power_Shot', 'Shoot'],
    fallback: ['Punch_Cross', 'Spell_Simple_Shoot'],
    playback: 'once',
  },
  header: {
    dedicated: ['Football_Header', 'Header'],
    fallback: ['Jump_Start', 'Hit_Head'],
    playback: 'once',
  },
  slideTackle: {
    dedicated: ['Football_Slide_Tackle', 'Slide_Tackle'],
    fallback: ['Roll'],
    playback: 'once',
  },
  bicycleKick: {
    dedicated: ['Football_Bicycle_Kick', 'Bicycle_Kick'],
    fallback: ['Roll'],
    playback: 'once',
  },
  damage: {
    dedicated: ['Football_Damage', 'Damage'],
    fallback: ['Hit_Chest', 'Hit_Head'],
    playback: 'once',
  },
  knockdown: {
    dedicated: ['Football_Knockdown', 'Knockdown'],
    fallback: ['Jump_Land', 'Death01'],
    playback: 'once',
  },
  celebration: {
    dedicated: ['Football_Celebration', 'Celebration'],
    fallback: ['Dance_Loop'],
    playback: 'once',
  },
  victory: {
    dedicated: ['Football_Victory', 'Victory'],
    fallback: ['Dance_Loop'],
    playback: 'terminal',
  },
  defeat: {
    dedicated: ['Football_Defeat', 'Defeat'],
    fallback: ['Death01'],
    playback: 'terminal',
  },
};

export function resolveFootballAnimation(
  state: FootballAnimationState,
  availableClipNames: Iterable<string>,
): FootballAnimationResolution {
  const definition = FOOTBALL_ANIMATION_CONTRACT[state];
  const actualNameByLowercase = new Map<string, string>();
  for (const name of availableClipNames) actualNameByLowercase.set(name.toLowerCase(), name);

  const dedicated = findAvailable(definition.dedicated, actualNameByLowercase);
  if (dedicated) return { state, clipName: dedicated, source: 'dedicated', playback: definition.playback };

  const fallback = findAvailable(definition.fallback, actualNameByLowercase);
  if (fallback) {
    return { state, clipName: fallback, source: 'fallback-alias', playback: definition.playback };
  }

  return { state, source: 'unavailable', playback: definition.playback };
}

export function resolveFootballAnimationContract(
  availableClipNames: Iterable<string>,
): ReadonlyMap<FootballAnimationState, FootballAnimationResolution> {
  const names = [...availableClipNames];
  return new Map(FOOTBALL_ANIMATION_STATES.map((state) => [state, resolveFootballAnimation(state, names)]));
}

function findAvailable(
  candidates: readonly string[],
  available: ReadonlyMap<string, string>,
): string | undefined {
  for (const candidate of candidates) {
    const actual = available.get(candidate.toLowerCase());
    if (actual) return actual;
  }
  return undefined;
}
