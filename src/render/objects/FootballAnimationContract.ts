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

export type FootballAnimationContactSocket = 'root' | 'foot_l' | 'foot_r' | 'hand_l' | 'hand_r' | 'head';

export interface FootballAnimationContactEvent {
  readonly state: FootballAnimationState;
  readonly clipName: string;
  readonly socket: FootballAnimationContactSocket;
  /** World-space render position sampled on the authored contact frame. */
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface FootballAnimationPresentation {
  /** Normalized clip time for the readable gameplay contact. Omitted for non-contact motion. */
  readonly contactAt?: number;
  /** Socket presentation systems should use for contact VFX/SFX. */
  readonly contactSocket?: FootballAnimationContactSocket;
  /** Normalized clip time after which locomotion may safely take over again. */
  readonly recoverAt: number;
}

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
  readonly presentation: FootballAnimationPresentation;
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
    presentation: { recoverAt: 1 },
  },
  dribble: {
    dedicated: ['Football_Dribble_Loop', 'Dribble_Loop'],
    fallback: ['Jog_Fwd_Loop', 'Walk_Loop'],
    playback: 'loop',
    presentation: { contactAt: 0.42, contactSocket: 'foot_r', recoverAt: 1 },
  },
  strafeLeft: {
    dedicated: ['Football_Strafe_Left_Loop', 'Strafe_Left_Loop'],
    fallback: ['Walk_Loop', 'Jog_Fwd_Loop'],
    playback: 'loop',
    presentation: { recoverAt: 1 },
  },
  strafeRight: {
    dedicated: ['Football_Strafe_Right_Loop', 'Strafe_Right_Loop'],
    fallback: ['Walk_Loop', 'Jog_Fwd_Loop'],
    playback: 'loop',
    presentation: { recoverAt: 1 },
  },
  groundPass: {
    dedicated: ['Football_Ground_Pass', 'Ground_Pass'],
    fallback: ['Punch_Jab', 'Interact'],
    playback: 'once',
    presentation: { contactAt: 0.4, contactSocket: 'foot_r', recoverAt: 0.82 },
  },
  lobPass: {
    dedicated: ['Football_Lob_Pass', 'Lob_Pass'],
    fallback: ['Spell_Simple_Shoot', 'Interact'],
    playback: 'once',
    presentation: { contactAt: 0.48, contactSocket: 'foot_r', recoverAt: 0.86 },
  },
  shoot: {
    dedicated: ['Football_Shoot', 'Power_Shot', 'Shoot'],
    fallback: ['Punch_Cross', 'Spell_Simple_Shoot'],
    playback: 'once',
    presentation: { contactAt: 0.43, contactSocket: 'foot_r', recoverAt: 0.88 },
  },
  header: {
    dedicated: ['Football_Header', 'Header'],
    fallback: ['Jump_Start', 'Hit_Head'],
    playback: 'once',
    presentation: { contactAt: 0.46, contactSocket: 'head', recoverAt: 0.84 },
  },
  slideTackle: {
    dedicated: ['Football_Slide_Tackle', 'Slide_Tackle'],
    fallback: ['Roll'],
    playback: 'once',
    presentation: { contactAt: 0.34, contactSocket: 'foot_r', recoverAt: 0.9 },
  },
  bicycleKick: {
    dedicated: ['Football_Bicycle_Kick', 'Bicycle_Kick'],
    fallback: ['Roll'],
    playback: 'once',
    presentation: { contactAt: 0.58, contactSocket: 'foot_r', recoverAt: 0.96 },
  },
  damage: {
    dedicated: ['Football_Damage', 'Damage'],
    fallback: ['Hit_Chest', 'Hit_Head'],
    playback: 'once',
    presentation: { contactAt: 0.18, contactSocket: 'root', recoverAt: 0.72 },
  },
  knockdown: {
    dedicated: ['Football_Knockdown', 'Knockdown'],
    fallback: ['Jump_Land', 'Death01'],
    playback: 'once',
    presentation: { contactAt: 0.22, contactSocket: 'root', recoverAt: 0.96 },
  },
  celebration: {
    dedicated: ['Football_Celebration', 'Celebration'],
    fallback: ['Dance_Loop'],
    playback: 'once',
    presentation: { recoverAt: 0.94 },
  },
  victory: {
    dedicated: ['Football_Victory', 'Victory'],
    fallback: ['Dance_Loop'],
    playback: 'terminal',
    presentation: { recoverAt: 1 },
  },
  defeat: {
    dedicated: ['Football_Defeat', 'Defeat'],
    fallback: ['Death01'],
    playback: 'terminal',
    presentation: { contactAt: 0.2, contactSocket: 'root', recoverAt: 1 },
  },
};

/**
 * Timing metadata is deliberately normalized and simulation-agnostic. It lets
 * render/audio layers line up feedback without moving the authoritative player
 * or delaying gameplay rules to wait for a clip.
 */
export function getFootballAnimationPresentation(
  state: FootballAnimationState,
): FootballAnimationPresentation {
  return FOOTBALL_ANIMATION_CONTRACT[state].presentation;
}

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
