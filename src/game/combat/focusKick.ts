export type FocusKickPhase = 'building' | 'ready' | 'aiming' | 'cooldown';

export type FocusKickCombatAction = 'enemy-hit' | 'enemy-kill' | 'boss-hit' | 'goal';

export interface FocusKickState {
  readonly phase: FocusKickPhase;
  readonly charge: number;
  readonly aimTimeRemaining: number;
  readonly cooldownRemaining: number;
}

export interface FocusKickConfig {
  readonly maximumCharge: number;
  readonly chargePerAction: Readonly<Record<FocusKickCombatAction, number>>;
  readonly aimDuration: number;
  readonly aimingTimeScale: number;
  readonly cooldownDuration: number;
}

export interface FocusKickShotResult {
  readonly state: FocusKickState;
  readonly empowered: boolean;
}

export const DEFAULT_FOCUS_KICK_CONFIG: Readonly<FocusKickConfig> = Object.freeze({
  maximumCharge: 100,
  chargePerAction: Object.freeze({
    'enemy-hit': 3,
    'enemy-kill': 12,
    'boss-hit': 6,
    goal: 35,
  }),
  aimDuration: 2.5,
  aimingTimeScale: 0.22,
  cooldownDuration: 15,
});

export function createFocusKickState(): FocusKickState {
  return { phase: 'building', charge: 0, aimTimeRemaining: 0, cooldownRemaining: 0 };
}

/** Adds meter from one confirmed combat action. Charge cannot build during use or cooldown. */
export function applyFocusKickCombatAction(
  state: Readonly<FocusKickState>,
  action: FocusKickCombatAction,
  config: Readonly<FocusKickConfig> = DEFAULT_FOCUS_KICK_CONFIG,
): FocusKickState {
  if (state.phase !== 'building') return state;
  const maximumCharge = positive(config.maximumCharge, DEFAULT_FOCUS_KICK_CONFIG.maximumCharge);
  const gain = nonNegative(config.chargePerAction[action]);
  const charge = Math.min(maximumCharge, nonNegative(state.charge) + gain);
  return {
    phase: charge >= maximumCharge ? 'ready' : 'building',
    charge,
    aimTimeRemaining: 0,
    cooldownRemaining: 0,
  };
}

export function canActivateFocusKick(state: Readonly<FocusKickState>): boolean {
  return state.phase === 'ready';
}

/** Consumes the full meter and enters the brief slow-time aiming window. */
export function activateFocusKick(
  state: Readonly<FocusKickState>,
  config: Readonly<FocusKickConfig> = DEFAULT_FOCUS_KICK_CONFIG,
): FocusKickState {
  if (!canActivateFocusKick(state)) return state;
  return {
    phase: 'aiming',
    charge: 0,
    aimTimeRemaining: positive(config.aimDuration, DEFAULT_FOCUS_KICK_CONFIG.aimDuration),
    cooldownRemaining: 0,
  };
}

/** Returns the simulation scale requested by the ultimate; rendering can remain unscaled. */
export function getFocusKickTimeScale(
  state: Readonly<FocusKickState>,
  config: Readonly<FocusKickConfig> = DEFAULT_FOCUS_KICK_CONFIG,
): number {
  if (state.phase !== 'aiming') return 1;
  return clamp(config.aimingTimeScale, 0.05, 1, DEFAULT_FOCUS_KICK_CONFIG.aimingTimeScale);
}

/** Consumes exactly one empowered shot. Ordinary shots leave the state untouched. */
export function consumeFocusKickShot(
  state: Readonly<FocusKickState>,
  config: Readonly<FocusKickConfig> = DEFAULT_FOCUS_KICK_CONFIG,
): FocusKickShotResult {
  if (state.phase !== 'aiming') return { state, empowered: false };
  return { state: startCooldown(config), empowered: true };
}

/** Advances aiming and cooldown timers, carrying excess dt across phase boundaries. */
export function stepFocusKick(
  state: Readonly<FocusKickState>,
  dt: number,
  config: Readonly<FocusKickConfig> = DEFAULT_FOCUS_KICK_CONFIG,
): FocusKickState {
  const elapsed = nonNegative(dt);
  if (elapsed === 0 || state.phase === 'building' || state.phase === 'ready') return state;

  if (state.phase === 'aiming') {
    const aimRemaining = nonNegative(state.aimTimeRemaining);
    if (elapsed < aimRemaining) return { ...state, aimTimeRemaining: aimRemaining - elapsed };
    return advanceCooldown(startCooldown(config), elapsed - aimRemaining);
  }

  return advanceCooldown(state, elapsed);
}

export function resetFocusKick(): FocusKickState {
  return createFocusKickState();
}

function startCooldown(config: Readonly<FocusKickConfig>): FocusKickState {
  return {
    phase: 'cooldown',
    charge: 0,
    aimTimeRemaining: 0,
    cooldownRemaining: positive(config.cooldownDuration, DEFAULT_FOCUS_KICK_CONFIG.cooldownDuration),
  };
}

function advanceCooldown(state: Readonly<FocusKickState>, elapsed: number): FocusKickState {
  const remaining = Math.max(0, nonNegative(state.cooldownRemaining) - elapsed);
  return remaining > 0
    ? { phase: 'cooldown', charge: 0, aimTimeRemaining: 0, cooldownRemaining: remaining }
    : createFocusKickState();
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}
