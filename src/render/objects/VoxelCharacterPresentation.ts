import type { CharacterId } from '../../game/characters';
import type { VoxelAnimationState } from './VoxelAnimationController';

export type CharacterDifficulty = 1 | 2 | 3 | 4 | 5;

export interface VoxelPersonalityProfile {
  readonly movementWeight: number;
  readonly strideScale: number;
  readonly bounceScale: number;
  readonly torsoLean: number;
  readonly armSwing: number;
  readonly actionSpeed: number;
  readonly lateralSwagger: number;
}

export interface CharacterSelectionPresentation {
  readonly tagline: string;
  readonly signatureState: VoxelAnimationState;
  readonly introductionState: VoxelAnimationState;
  readonly difficulty: CharacterDifficulty;
  readonly difficultyLabel: string;
  readonly playStyle: string;
}

export const VOXEL_PERSONALITIES: Readonly<Record<CharacterId, VoxelPersonalityProfile>> = Object.freeze({
  maestro: {
    movementWeight: 0.84,
    strideScale: 0.88,
    bounceScale: 0.62,
    torsoLean: 0.7,
    armSwing: 0.78,
    actionSpeed: 0.92,
    lateralSwagger: 1.25,
  },
  breakaway: {
    movementWeight: 0.76,
    strideScale: 1.25,
    bounceScale: 1.28,
    torsoLean: 1.4,
    armSwing: 1.38,
    actionSpeed: 1.22,
    lateralSwagger: 0.78,
  },
  tower: {
    movementWeight: 1.42,
    strideScale: 0.78,
    bounceScale: 0.48,
    torsoLean: 0.62,
    armSwing: 0.68,
    actionSpeed: 0.78,
    lateralSwagger: 0.42,
  },
  finisher: {
    movementWeight: 1.05,
    strideScale: 1.04,
    bounceScale: 0.9,
    torsoLean: 1.16,
    armSwing: 1.08,
    actionSpeed: 1.12,
    lateralSwagger: 0.62,
  },
  engine: {
    movementWeight: 0.94,
    strideScale: 1.08,
    bounceScale: 0.96,
    torsoLean: 1.02,
    armSwing: 1.18,
    actionSpeed: 1.04,
    lateralSwagger: 0.84,
  },
  guardian: {
    movementWeight: 1.22,
    strideScale: 0.86,
    bounceScale: 0.58,
    torsoLean: 0.66,
    armSwing: 0.72,
    actionSpeed: 0.86,
    lateralSwagger: 0.48,
  },
});

export const CHARACTER_SELECTION_PRESENTATIONS: Readonly<
  Record<CharacterId, CharacterSelectionPresentation>
> = Object.freeze({
  maestro: {
    tagline: 'Sees the return before the first touch.',
    signatureState: 'lobPass',
    introductionState: 'celebration',
    difficulty: 4,
    difficultyLabel: 'TACTICAL',
    playStyle: 'Precision passing, curve control, and deliberate spacing.',
  },
  breakaway: {
    tagline: 'One lane is all the opening required.',
    signatureState: 'sprint',
    introductionState: 'slideTackle',
    difficulty: 2,
    difficultyLabel: 'AGGRESSIVE',
    playStyle: 'Explosive movement, rapid dashes, and counterattacks.',
  },
  tower: {
    tagline: 'The goalmouth moves when the Tower arrives.',
    signatureState: 'shoot',
    introductionState: 'victory',
    difficulty: 2,
    difficultyLabel: 'POWER',
    playStyle: 'Heavy strikes, high durability, and committed positioning.',
  },
  finisher: {
    tagline: 'Every crowded box contains one fatal angle.',
    signatureState: 'bicycleKick',
    introductionState: 'shoot',
    difficulty: 3,
    difficultyLabel: 'CLINICAL',
    playStyle: 'Elite hunting, direct shots, and decisive close-range play.',
  },
  engine: {
    tagline: 'Still running when the floodlights surrender.',
    signatureState: 'dribble',
    introductionState: 'sprint',
    difficulty: 1,
    difficultyLabel: 'MOBILE',
    playStyle: 'Pickup control, constant movement, and broad field coverage.',
  },
  guardian: {
    tagline: 'Nothing crosses the line without permission.',
    signatureState: 'header',
    introductionState: 'victory',
    difficulty: 3,
    difficultyLabel: 'DEFENSIVE',
    playStyle: 'Damage resistance, controlled space, and safe possession.',
  },
});
