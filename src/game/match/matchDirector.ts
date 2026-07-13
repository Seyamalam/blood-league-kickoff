import { PROTOTYPE_MATCH_CONFIG } from './config';
import type {
  ActiveCombatStage,
  CombatStageRule,
  MatchDirectorConfig,
  MatchDirectorEvent,
  MatchDirectorInput,
  MatchDirectorState,
  MatchDirectorUpdate,
  MatchObjective,
  MatchStage,
} from './types';

export function createMatchDirectorState(): MatchDirectorState {
  return {
    stage: 'opening',
    matchElapsed: 0,
    stageElapsed: 0,
    totalKills: 0,
    goalScored: false,
  };
}

/**
 * Advances the match without mutating state or gameplay systems. Call once per
 * fixed simulation step and consume the returned events in the integration layer.
 */
export function updateMatchDirector(
  previous: MatchDirectorState,
  input: MatchDirectorInput,
  config: MatchDirectorConfig = PROTOTYPE_MATCH_CONFIG,
): MatchDirectorUpdate {
  if (!Number.isFinite(input.dt) || input.dt < 0) throw new Error('Match director dt must be finite and non-negative.');
  if (!Number.isFinite(input.totalKills) || input.totalKills < 0) {
    throw new Error('Match director totalKills must be finite and non-negative.');
  }
  validateMatchConfig(config);

  if (previous.stage === 'victory' || previous.stage === 'dead') {
    return { state: previous, events: [] };
  }

  const events: MatchDirectorEvent[] = [];
  const matchElapsed = previous.matchElapsed + input.dt;
  const stageElapsed = previous.stageElapsed + input.dt;
  const totalKills = Math.max(previous.totalKills, Math.floor(input.totalKills));
  let stage: MatchStage = previous.stage;
  let goalScored = previous.goalScored;

  if (input.playerDead) {
    events.push({ type: 'playerDied' });
    transition(events, stage, 'dead');
    return {
      state: { stage: 'dead', matchElapsed, stageElapsed: 0, totalKills, goalScored },
      events,
    };
  }

  if (stage === 'goalOpportunity') {
    if (input.goalScored) {
      goalScored = true;
      events.push({ type: 'goalScored' });
      transition(events, stage, 'escalation');
      stage = 'escalation';
    } else if (stageElapsed >= config.goalOpportunityDuration) {
      events.push({ type: 'goalMissed' });
      transition(events, stage, 'escalation');
      stage = 'escalation';
    }
  } else {
    const next = stage === 'finalWave' && input.bossDefeated
      ? 'victory'
      : nextStage(stage, matchElapsed, totalKills, config);
    if (next !== stage) {
      transition(events, stage, next);
      stage = next;
      if (next === 'goalOpportunity') {
        events.push({ type: 'goalOpportunityStarted', duration: config.goalOpportunityDuration });
      } else if (next === 'victory') {
        events.push({ type: 'victory' });
      }
    }
  }

  return {
    state: {
      stage,
      matchElapsed,
      stageElapsed: stage === previous.stage ? stageElapsed : 0,
      totalKills,
      goalScored,
    },
    events,
  };
}

export function getMatchObjective(
  state: MatchDirectorState,
  config: MatchDirectorConfig = PROTOTYPE_MATCH_CONFIG,
): MatchObjective {
  validateMatchConfig(config);
  if (state.stage === 'goalOpportunity') {
    return {
      id: state.stage,
      title: 'Shoot your shot',
      detail: 'Score before the goal seals shut.',
      progress: Math.min(config.goalOpportunityDuration, state.stageElapsed),
      target: config.goalOpportunityDuration,
      unit: 'seconds',
      status: 'active',
    };
  }
  if (state.stage === 'victory') {
    return outcomeObjective('victory', 'Full time', 'The Blood League has been defeated.', 'completed');
  }
  if (state.stage === 'dead') {
    return outcomeObjective('dead', 'Match over', 'Kick off another run.', 'failed');
  }

  const rule = config[state.stage];
  const copy = objectiveCopy(state.stage);
  return {
    id: state.stage,
    title: copy.title,
    detail: copy.detail,
    progress: Math.min(rule.killTarget, state.totalKills),
    target: rule.killTarget,
    unit: 'kills',
    status: 'active',
  };
}

function nextStage(
  stage: Exclude<MatchStage, 'goalOpportunity' | 'victory' | 'dead'>,
  elapsed: number,
  kills: number,
  config: MatchDirectorConfig,
): Exclude<MatchStage, 'dead'> {
  const rule = config[stage];
  if (!stageComplete(rule, elapsed, kills)) return stage;
  switch (stage) {
    case 'opening': return 'firstHalf';
    case 'firstHalf': return 'goalOpportunity';
    case 'escalation': return 'finalWave';
    case 'finalWave': return 'victory';
  }
}

function stageComplete(rule: CombatStageRule, elapsed: number, kills: number): boolean {
  return elapsed >= rule.deadlineMatchTime
    || (elapsed >= rule.minimumMatchTime && kills >= rule.killTarget);
}

function transition(events: MatchDirectorEvent[], from: MatchStage, to: MatchStage): void {
  events.push({ type: 'stageChanged', from, to });
}

function objectiveCopy(stage: ActiveCombatStage): { title: string; detail: string } {
  switch (stage) {
    case 'opening': return { title: 'Kickoff', detail: 'Break through the opening rush.' };
    case 'firstHalf': return { title: 'Hold the pitch', detail: 'Build your attack and survive the first half.' };
    case 'escalation': return { title: 'Blood moon rising', detail: 'Stronger opponents have entered the pitch.' };
    case 'finalWave': return { title: 'Final wave', detail: 'Clear the last assault before full time.' };
  }
}

function outcomeObjective(
  id: 'victory' | 'dead',
  title: string,
  detail: string,
  status: 'completed' | 'failed',
): MatchObjective {
  return { id, title, detail, progress: 1, target: 1, unit: 'outcome', status };
}

function validateMatchConfig(config: MatchDirectorConfig): void {
  const stages: readonly ActiveCombatStage[] = ['opening', 'firstHalf', 'escalation', 'finalWave'];
  let lastDeadline = 0;
  let lastKills = 0;
  for (const stage of stages) {
    const rule = config[stage];
    if (rule.minimumMatchTime < 0 || rule.deadlineMatchTime < rule.minimumMatchTime) {
      throw new Error(`Invalid timing for match stage: ${stage}.`);
    }
    if (rule.deadlineMatchTime < lastDeadline || rule.killTarget < lastKills) {
      throw new Error(`Match stage thresholds must be monotonic: ${stage}.`);
    }
    lastDeadline = rule.deadlineMatchTime;
    lastKills = rule.killTarget;
  }
  if (!Number.isFinite(config.goalOpportunityDuration) || config.goalOpportunityDuration <= 0) {
    throw new Error('Goal opportunity duration must be positive and finite.');
  }
}
