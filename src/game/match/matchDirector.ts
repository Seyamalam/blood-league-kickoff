import { PROTOTYPE_MATCH_CONFIG } from './config';
import type {
  ActiveCombatStage,
  CombatStageRule,
  GoalOpportunity,
  HalftimeChoice,
  MatchDirectorConfig,
  MatchDirectorEvent,
  MatchDirectorInput,
  MatchDirectorState,
  MatchDirectorUpdate,
  MatchObjective,
  MatchStage,
} from './types';

const HALFTIME_CHOICES: readonly HalftimeChoice[] = ['power', 'pace', 'control'];

export function createMatchDirectorState(): MatchDirectorState {
  return {
    stage: 'opening',
    matchElapsed: 0,
    stageElapsed: 0,
    totalKills: 0,
    goalScored: false,
    goalsScored: 0,
    halftimeChoice: null,
  };
}

/** Pure fixed-step transition function; gameplay reacts only to returned events. */
export function updateMatchDirector(
  previous: MatchDirectorState,
  input: MatchDirectorInput,
  config: MatchDirectorConfig = PROTOTYPE_MATCH_CONFIG,
): MatchDirectorUpdate {
  validateInput(input);
  validateMatchConfig(config);
  if (previous.stage === 'victory' || previous.stage === 'dead') return { state: previous, events: [] };

  const events: MatchDirectorEvent[] = [];
  const matchElapsed = previous.matchElapsed + input.dt;
  const stageElapsed = previous.stageElapsed + input.dt;
  const totalKills = Math.max(previous.totalKills, Math.floor(input.totalKills));
  let stage: MatchStage = previous.stage;
  let goalScored = previous.goalScored;
  let goalsScored = previous.goalsScored;
  let halftimeChoice = previous.halftimeChoice;

  if (input.playerDead) {
    events.push({ type: 'playerDied' });
    transition(events, stage, 'dead');
    return {
      state: { stage: 'dead', matchElapsed, stageElapsed: 0, totalKills, goalScored, goalsScored, halftimeChoice },
      events,
    };
  }

  if (stage === 'goalOpportunity' || stage === 'finalGoal') {
    const opportunity: GoalOpportunity = stage === 'goalOpportunity' ? 'first' : 'final';
    const duration = opportunity === 'first' ? config.goalOpportunityDuration : config.finalGoalDuration;
    if (input.goalScored) {
      goalScored = true;
      goalsScored += 1;
      events.push({ type: 'goalScored', goal: opportunity });
      const next = opportunity === 'first' ? 'escalation' : 'finalWave';
      transition(events, stage, next);
      stage = next;
    } else if (stageElapsed >= duration) {
      events.push({ type: 'goalMissed', goal: opportunity });
      const next = opportunity === 'first' ? 'escalation' : 'finalWave';
      transition(events, stage, next);
      stage = next;
    }
  } else if (stage === 'halftimeChoice') {
    const selected = input.halftimeChoice
      ?? (stageElapsed >= config.halftimeChoiceDuration ? config.defaultHalftimeChoice : null);
    if (selected) {
      halftimeChoice = selected;
      events.push({
        type: 'halftimeChoiceSelected',
        choice: selected,
        automatic: input.halftimeChoice === undefined,
      });
      transition(events, stage, 'bloodMoon');
      events.push({ type: 'bloodMoonStarted' });
      stage = 'bloodMoon';
    }
  } else {
    const next = stage === 'finalWave' && input.bossDefeated
      ? 'victory'
      : nextCombatStage(stage, matchElapsed, totalKills, config);
    if (next !== stage) {
      transition(events, stage, next);
      stage = next;
      emitStageStartEvent(events, next, config);
    }
  }

  return {
    state: {
      stage,
      matchElapsed,
      stageElapsed: stage === previous.stage ? stageElapsed : 0,
      totalKills,
      goalScored,
      goalsScored,
      halftimeChoice,
    },
    events,
  };
}

export function getMatchObjective(
  state: MatchDirectorState,
  config: MatchDirectorConfig = PROTOTYPE_MATCH_CONFIG,
): MatchObjective {
  validateMatchConfig(config);
  if (state.stage === 'goalOpportunity' || state.stage === 'finalGoal') {
    const final = state.stage === 'finalGoal';
    const duration = final ? config.finalGoalDuration : config.goalOpportunityDuration;
    return {
      id: state.stage,
      title: final ? 'Final goal' : 'Shoot your shot',
      detail: final ? 'Score to summon the final encounter.' : 'Score before the goal seals shut.',
      progress: Math.min(duration, state.stageElapsed),
      target: duration,
      unit: 'seconds',
      status: 'active',
    };
  }
  if (state.stage === 'halftimeChoice') {
    return {
      id: state.stage,
      title: 'Halftime',
      detail: 'Choose the blessing that defines your second half.',
      progress: Math.min(config.halftimeChoiceDuration, state.stageElapsed),
      target: config.halftimeChoiceDuration,
      unit: 'choice',
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

function nextCombatStage(
  stage: ActiveCombatStage,
  elapsed: number,
  kills: number,
  config: MatchDirectorConfig,
): MatchStage {
  if (!stageComplete(config[stage], elapsed, kills)) return stage;
  switch (stage) {
    case 'opening': return 'firstHalf';
    case 'firstHalf': return 'goalOpportunity';
    case 'escalation': return 'halftimeChoice';
    case 'bloodMoon': return 'finalGoal';
    case 'finalWave': return 'victory';
  }
}

function stageComplete(rule: CombatStageRule, elapsed: number, kills: number): boolean {
  return elapsed >= rule.deadlineMatchTime
    || (elapsed >= rule.minimumMatchTime && kills >= rule.killTarget);
}

function emitStageStartEvent(
  events: MatchDirectorEvent[],
  stage: MatchStage,
  config: MatchDirectorConfig,
): void {
  if (stage === 'goalOpportunity') {
    events.push({ type: 'goalOpportunityStarted', goal: 'first', duration: config.goalOpportunityDuration });
  } else if (stage === 'halftimeChoice') {
    events.push({ type: 'halftimeChoiceStarted', duration: config.halftimeChoiceDuration });
  } else if (stage === 'finalGoal') {
    events.push({ type: 'goalOpportunityStarted', goal: 'final', duration: config.finalGoalDuration });
  } else if (stage === 'victory') {
    events.push({ type: 'victory' });
  }
}

function transition(events: MatchDirectorEvent[], from: MatchStage, to: MatchStage): void {
  events.push({ type: 'stageChanged', from, to });
}

function objectiveCopy(stage: ActiveCombatStage): { title: string; detail: string } {
  switch (stage) {
    case 'opening': return { title: 'Kickoff', detail: 'Break through the opening rush.' };
    case 'firstHalf': return { title: 'Hold the pitch', detail: 'Build your attack and survive the first half.' };
    case 'escalation': return { title: 'Pressure rising', detail: 'Stronger opponents have entered the pitch.' };
    case 'bloodMoon': return { title: 'Blood Moon', detail: 'Survive the empowered vampire assault.' };
    case 'finalWave': return { title: 'Final wave', detail: 'Defeat Count Goalkeeper before full time.' };
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

function validateInput(input: MatchDirectorInput): void {
  if (!Number.isFinite(input.dt) || input.dt < 0) throw new Error('Match director dt must be finite and non-negative.');
  if (!Number.isFinite(input.totalKills) || input.totalKills < 0) {
    throw new Error('Match director totalKills must be finite and non-negative.');
  }
  if (input.halftimeChoice !== undefined && !HALFTIME_CHOICES.includes(input.halftimeChoice)) {
    throw new Error('Unknown halftime choice.');
  }
}

function validateMatchConfig(config: MatchDirectorConfig): void {
  const stages: readonly ActiveCombatStage[] = ['opening', 'firstHalf', 'escalation', 'bloodMoon', 'finalWave'];
  let lastDeadline = 0;
  let lastKills = 0;
  for (const stage of stages) {
    const rule = config[stage];
    if (!Number.isFinite(rule.minimumMatchTime) || !Number.isFinite(rule.deadlineMatchTime)
      || rule.minimumMatchTime < 0 || rule.deadlineMatchTime < rule.minimumMatchTime) {
      throw new Error(`Invalid timing for match stage: ${stage}.`);
    }
    if (!Number.isInteger(rule.killTarget) || rule.killTarget < 0) {
      throw new Error(`Invalid kill target for match stage: ${stage}.`);
    }
    if (rule.deadlineMatchTime < lastDeadline || rule.killTarget < lastKills) {
      throw new Error(`Match stage thresholds must be monotonic: ${stage}.`);
    }
    lastDeadline = rule.deadlineMatchTime;
    lastKills = rule.killTarget;
  }
  const durations = [config.goalOpportunityDuration, config.halftimeChoiceDuration, config.finalGoalDuration];
  if (durations.some((duration) => !Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Match opportunity durations must be positive and finite.');
  }
  if (!HALFTIME_CHOICES.includes(config.defaultHalftimeChoice)) throw new Error('Invalid default halftime choice.');
}
