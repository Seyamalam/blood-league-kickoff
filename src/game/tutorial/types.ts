export const TUTORIAL_STEP_IDS = [
  'movement',
  'kick',
  'recall',
  'dash',
  'progression',
  'scoring',
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEP_IDS)[number];

export type TutorialSignal =
  | 'movement-demonstrated'
  | 'kick-demonstrated'
  | 'recall-demonstrated'
  | 'dash-demonstrated'
  | 'xp-collected'
  | 'upgrade-selected'
  | 'goal-scored';

export type TutorialCompletion = Record<TutorialStepId, boolean>;

export interface TutorialState {
  completed: TutorialCompletion;
  xpCollected: boolean;
  upgradeSelected: boolean;
  skipped: boolean;
}

export interface TutorialPromptDefinition {
  id: TutorialStepId;
  title: string;
  description: string;
  control: string;
  stepNumber: number;
  totalSteps: number;
}

export interface TutorialUpdate {
  state: TutorialState;
  completedNow: readonly TutorialStepId[];
  tutorialCompleted: boolean;
}
