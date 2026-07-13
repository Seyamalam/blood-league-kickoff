import {
  TUTORIAL_STEP_IDS,
  type TutorialCompletion,
  type TutorialPromptDefinition,
  type TutorialSignal,
  type TutorialState,
  type TutorialStepId,
  type TutorialUpdate,
} from './types';

const PROMPTS: Readonly<Record<TutorialStepId, Omit<TutorialPromptDefinition, 'stepNumber' | 'totalSteps'>>> = {
  movement: {
    id: 'movement',
    title: 'Find Your Feet',
    description: 'Move across the pitch and keep space between yourself and the crowd.',
    control: 'W A S D',
  },
  kick: {
    id: 'kick',
    title: 'Weaponize the Ball',
    description: 'Hold to charge, then release to launch the ball through vampires.',
    control: 'HOLD LMB',
  },
  recall: {
    id: 'recall',
    title: 'Call It Home',
    description: 'Recall a loose ball. Its returning path can strike enemies again.',
    control: 'RMB / E',
  },
  dash: {
    id: 'dash',
    title: 'Break Through',
    description: 'Dash out of a closing crowd. The first instant protects you from damage.',
    control: 'SPACE',
  },
  progression: {
    id: 'progression',
    title: 'Drink Their Power',
    description: 'Collect blood shards, level up, and choose one upgrade for your build.',
    control: 'COLLECT + CHOOSE',
  },
  scoring: {
    id: 'scoring',
    title: 'Seize the Kickoff',
    description: 'When the cursed goal opens, drive the ball into it before time expires.',
    control: 'SCORE A GOAL',
  },
};

/** Creates a fresh tutorial or an already-complete state for returning players. */
export function createTutorialState(alreadyCompleted = false): TutorialState {
  return {
    completed: createCompletionMap(alreadyCompleted),
    xpCollected: alreadyCompleted,
    upgradeSelected: alreadyCompleted,
    skipped: alreadyCompleted,
  };
}

/**
 * Pure transition function. Signals may arrive out of order; demonstrated actions
 * stay complete and are skipped when the presentation reaches their step.
 */
export function reduceTutorialState(
  previous: Readonly<TutorialState>,
  signal: TutorialSignal,
): TutorialUpdate {
  if (isTutorialComplete(previous)) {
    return { state: cloneState(previous), completedNow: [], tutorialCompleted: true };
  }

  const state = cloneState(previous);
  const completedNow: TutorialStepId[] = [];
  switch (signal) {
    case 'movement-demonstrated':
      complete(state, 'movement', completedNow);
      break;
    case 'kick-demonstrated':
      complete(state, 'kick', completedNow);
      break;
    case 'recall-demonstrated':
      complete(state, 'recall', completedNow);
      break;
    case 'dash-demonstrated':
      complete(state, 'dash', completedNow);
      break;
    case 'xp-collected':
      state.xpCollected = true;
      if (state.upgradeSelected) complete(state, 'progression', completedNow);
      break;
    case 'upgrade-selected':
      state.upgradeSelected = true;
      if (state.xpCollected) complete(state, 'progression', completedNow);
      break;
    case 'goal-scored':
      complete(state, 'scoring', completedNow);
      break;
  }
  return { state, completedNow, tutorialCompleted: isTutorialComplete(state) };
}

export function getActiveTutorialPrompt(
  state: Readonly<TutorialState>,
): TutorialPromptDefinition | null {
  if (state.skipped) return null;
  const stepIndex = TUTORIAL_STEP_IDS.findIndex((stepId) => !state.completed[stepId]);
  if (stepIndex < 0) return null;
  const stepId = TUTORIAL_STEP_IDS[stepIndex];
  if (!stepId) return null;
  return {
    ...PROMPTS[stepId],
    stepNumber: stepIndex + 1,
    totalSteps: TUTORIAL_STEP_IDS.length,
  };
}

export function isTutorialComplete(state: Readonly<TutorialState>): boolean {
  return state.skipped || TUTORIAL_STEP_IDS.every((stepId) => state.completed[stepId]);
}

/** Small stateful adapter for main-loop integration. */
export class TutorialTracker {
  private current: TutorialState;

  public constructor(alreadyCompleted = false) {
    this.current = createTutorialState(alreadyCompleted);
  }

  public get state(): Readonly<TutorialState> {
    return cloneState(this.current);
  }

  public get activePrompt(): TutorialPromptDefinition | null {
    return getActiveTutorialPrompt(this.current);
  }

  public get complete(): boolean {
    return isTutorialComplete(this.current);
  }

  public signal(signal: TutorialSignal): TutorialUpdate {
    const update = reduceTutorialState(this.current, signal);
    this.current = update.state;
    return update;
  }

  public skip(): void {
    this.current = {
      completed: createCompletionMap(true),
      xpCollected: true,
      upgradeSelected: true,
      skipped: true,
    };
  }

  public reset(alreadyCompleted = false): void {
    this.current = createTutorialState(alreadyCompleted);
  }
}

function complete(state: TutorialState, stepId: TutorialStepId, completedNow: TutorialStepId[]): void {
  if (state.completed[stepId]) return;
  state.completed[stepId] = true;
  completedNow.push(stepId);
}

function createCompletionMap(value: boolean): TutorialCompletion {
  return {
    movement: value,
    kick: value,
    recall: value,
    dash: value,
    progression: value,
    scoring: value,
  };
}

function cloneState(state: Readonly<TutorialState>): TutorialState {
  return { ...state, completed: { ...state.completed } };
}
