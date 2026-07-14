import type { MatchStage } from './types';
import type { RivalTeamDefinition } from './rivalTeams';

export interface MatchModifierState {
  readonly multiballCountdown: number;
  readonly multiballRemaining: number;
  readonly possessionProgress: number;
  readonly possessionCooldown: number;
}

export interface MatchModifierInput {
  readonly dt: number;
  readonly stage: MatchStage;
  readonly ballPossessed: boolean;
}

export type MatchModifierEvent =
  | { readonly type: 'multiballStarted'; readonly duration: number; readonly count: number }
  | { readonly type: 'multiballEnded' }
  | {
      readonly type: 'possessionCompleted';
      readonly scoreReward: number;
      readonly ultimateCharge: number;
    };

export interface MatchModifierEffects {
  readonly multiballActive: boolean;
  readonly multiballCount: number;
  readonly multiballDamageMultiplier: number;
  readonly possessionProgress: number;
  readonly possessionTarget: number;
}

export interface MatchModifierUpdate {
  readonly state: MatchModifierState;
  readonly effects: MatchModifierEffects;
  readonly events: readonly MatchModifierEvent[];
}

export function createMatchModifierState(team: RivalTeamDefinition): MatchModifierState {
  return Object.freeze({
    multiballCountdown: bounded(team.multiball.interval, 20, 90),
    multiballRemaining: 0,
    possessionProgress: 0,
    possessionCooldown: 0,
  });
}

/** Pure, allocation-light rules for supernatural multiball windows and possession challenges. */
export function updateMatchModifiers(
  previous: MatchModifierState,
  input: MatchModifierInput,
  team: RivalTeamDefinition,
): MatchModifierUpdate {
  const dt = bounded(input.dt, 0, 0.1);
  const events: MatchModifierEvent[] = [];
  const combatActive = isCombatStage(input.stage);
  let multiballCountdown = previous.multiballCountdown;
  let multiballRemaining = previous.multiballRemaining;
  let possessionProgress = previous.possessionProgress;
  let possessionCooldown = Math.max(0, previous.possessionCooldown - dt);

  if (combatActive) {
    if (multiballRemaining > 0) {
      multiballRemaining = Math.max(0, multiballRemaining - dt);
      if (multiballRemaining === 0) {
        multiballCountdown = bounded(team.multiball.interval, 20, 90);
        events.push({ type: 'multiballEnded' });
      }
    } else {
      multiballCountdown = Math.max(0, multiballCountdown - dt);
      if (multiballCountdown === 0) {
        multiballRemaining = bounded(team.multiball.duration, 4, 15);
        events.push({
          type: 'multiballStarted',
          duration: multiballRemaining,
          count: Math.floor(bounded(team.multiball.count, 1, 4)),
        });
      }
    }

    if (possessionCooldown === 0) {
      possessionProgress = input.ballPossessed
        ? possessionProgress + dt
        : Math.max(0, possessionProgress - dt * 0.5);
      const target = bounded(team.possession.targetSeconds, 4, 20);
      if (possessionProgress >= target) {
        possessionProgress = 0;
        possessionCooldown = bounded(team.possession.cooldown, 10, 60);
        events.push({
          type: 'possessionCompleted',
          scoreReward: Math.floor(bounded(team.possession.scoreReward, 100, 1_000)),
          ultimateCharge: bounded(team.possession.ultimateCharge, 4, 25),
        });
      }
    } else {
      possessionProgress = 0;
    }
  } else {
    possessionProgress = 0;
  }

  const state = Object.freeze({
    multiballCountdown,
    multiballRemaining,
    possessionProgress,
    possessionCooldown,
  });
  return {
    state,
    effects: effectsFor(state, team),
    events,
  };
}

export function getMatchModifierEffects(
  state: MatchModifierState,
  team: RivalTeamDefinition,
): MatchModifierEffects {
  return effectsFor(state, team);
}

function effectsFor(state: MatchModifierState, team: RivalTeamDefinition): MatchModifierEffects {
  return Object.freeze({
    multiballActive: state.multiballRemaining > 0,
    multiballCount: Math.floor(bounded(team.multiball.count, 1, 4)),
    multiballDamageMultiplier: bounded(team.multiball.damageMultiplier, 0.25, 1),
    possessionProgress: state.possessionProgress,
    possessionTarget: bounded(team.possession.targetSeconds, 4, 20),
  });
}

function isCombatStage(stage: MatchStage): boolean {
  return (
    stage === 'opening' ||
    stage === 'firstHalf' ||
    stage === 'escalation' ||
    stage === 'bloodMoon' ||
    stage === 'finalWave'
  );
}

function bounded(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}
