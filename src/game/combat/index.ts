export { SecondaryWeaponSystem } from './SecondaryWeaponSystem';
export { selectAimAssistTarget, steerAimDirection } from './aimAssist';
export type { AimAssistCandidate, AimAssistTarget, AimVector } from './aimAssist';
export {
  activateFocusKick,
  applyFocusKickCombatAction,
  canActivateFocusKick,
  consumeFocusKickShot,
  createFocusKickState,
  DEFAULT_FOCUS_KICK_CONFIG,
  getFocusKickTimeScale,
  resetFocusKick,
  stepFocusKick,
} from './focusKick';
export type {
  FocusKickCombatAction,
  FocusKickConfig,
  FocusKickPhase,
  FocusKickShotResult,
  FocusKickState,
} from './focusKick';
export type {
  CombatTarget,
  GarlicZoneState,
  GhostPassState,
  GhostPassTrigger,
  MultiBallShotState,
  MultiBallTrigger,
  OrbitingBallState,
  SecondaryCombatModifiers,
  SecondaryDamageHit,
  SecondaryDamageSource,
  SecondaryWeaponEvent,
  SecondaryWeaponRenderState,
  SecondaryWeaponStepInput,
  SecondaryWeaponStepResult,
} from './types';
