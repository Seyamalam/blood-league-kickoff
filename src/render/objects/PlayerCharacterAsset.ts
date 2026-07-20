import * as THREE from 'three';
import type { CharacterId } from '../../game/characters';
import type { PlayerState } from '../../game/simulation/types';
import {
  FOOTBALL_ANIMATION_CONTRACT,
  getFootballAnimationPresentation,
  type FootballAnimationContactEvent,
  type FootballAnimationContactSocket,
  type FootballAnimationResolution,
  type FootballAnimationState,
} from './FootballAnimationContract';
import { VoxelAnimationController, type VoxelAnimationState } from './VoxelAnimationController';
import type { VoxelHumanoid } from './VoxelHumanoid';
import { createVoxelPlayerVariantController, type VoxelPlayerVariantController } from './VoxelPlayerVariants';
import type { CustomCharacterAppearance } from '../../profile/CharacterCustomizationStore';
import {
  createCustomVoxelAppearanceController,
  type CustomVoxelAppearanceController,
} from './CustomVoxelAppearance';

export type PlayerTechnique = 'kick' | 'ground-pass' | 'lob-pass' | 'header' | 'slide-tackle' | 'bicycle';
export type PlayerReaction = 'damage' | 'knockdown';
export type PlayerOutcome = 'celebration' | 'victory' | 'defeat';

interface PendingContact {
  readonly state: FootballAnimationState;
  readonly clipName: string;
  readonly socket: FootballAnimationContactSocket;
  remaining: number;
}

const VOXEL_STATE_DURATION: Readonly<Partial<Record<FootballAnimationState, number>>> = Object.freeze({
  groundPass: 0.56,
  lobPass: 0.72,
  shoot: 0.68,
  header: 0.62,
  slideTackle: 0.9,
  bicycleKick: 1.12,
  damage: 0.38,
  knockdown: 1.15,
  celebration: 1.4,
  victory: 1.15,
  defeat: 0.82,
});

export interface PlayerCharacterAssetOptions {
  /** Shows the articulated voxel joint helpers in development diagnostics. */
  readonly showSkeleton?: boolean;
}

export function rigDiagnosticsRequested(search: string, isDevelopment: boolean): boolean {
  return isDevelopment && new URLSearchParams(search).get('rigDebug') === '1';
}

export function techniqueAnimationFor(technique: PlayerTechnique): FootballAnimationState {
  if (technique === 'bicycle') return 'bicycleKick';
  if (technique === 'ground-pass') return 'groundPass';
  if (technique === 'lob-pass') return 'lobPass';
  if (technique === 'header') return 'header';
  if (technique === 'slide-tackle') return 'slideTackle';
  return 'shoot';
}

/** Resolves movement relative to facing without ever affecting simulation movement. */
export function locomotionStateFor(
  speed: number,
  forwardSpeed: number,
  lateralSpeed: number,
): Extract<FootballAnimationState, 'idle' | 'dribble' | 'strafeLeft' | 'strafeRight'> {
  if (speed <= 0.15) return 'idle';
  if (Math.abs(lateralSpeed) > Math.abs(forwardSpeed) * 1.15) {
    return lateralSpeed < 0 ? 'strafeLeft' : 'strafeRight';
  }
  return 'dribble';
}

/** Kept as a compatibility helper for diagnostics and older replay fixtures. */
export function locomotionClipFor(speed: number, dashing: boolean): string {
  if (dashing) return 'Roll';
  if (speed > 7.5) return 'Sprint_Loop';
  if (speed > 0.15) return 'Jog_Fwd_Loop';
  return 'Idle_Loop';
}

/**
 * Render-only adapter for the original voxel athlete. It preserves the public
 * semantic animation contract while removing all runtime GLB/network loading.
 */
export class PlayerCharacterAsset {
  private readonly animationController: VoxelAnimationController;
  private readonly variants: VoxelPlayerVariantController;
  private readonly customAppearance: CustomVoxelAppearanceController;
  private readonly contactEvents: FootballAnimationContactEvent[] = [];
  private readonly pendingContacts: PendingContact[] = [];
  private readonly diagnosticHelpers: THREE.BoxHelper[] = [];
  private previousDashTime = 0;
  private previousHealth?: number;
  private selectedCharacter: CharacterId = 'maestro';
  private customization?: Readonly<CustomCharacterAppearance>;
  private terminalState?: Extract<FootballAnimationState, 'victory' | 'defeat'>;
  private disposed = false;

  constructor(
    private readonly rig: VoxelHumanoid,
    private readonly options: PlayerCharacterAssetOptions = {},
  ) {
    this.animationController = new VoxelAnimationController(rig);
    this.animationController.setPersonality('maestro');
    this.animationController.setGrounding(0, 0);
    this.variants = createVoxelPlayerVariantController(rig);
    this.customAppearance = createCustomVoxelAppearanceController(rig);
    this.variants.apply('maestro');
  }

  get ready(): boolean {
    return !this.disposed;
  }

  load(): void {
    if (this.disposed) return;
    this.animationController.play('idle');
    const showDiagnostics =
      this.options.showSkeleton ??
      (typeof window !== 'undefined' && rigDiagnosticsRequested(window.location.search, import.meta.env.DEV));
    this.setRigDiagnosticsEnabled(showDiagnostics);
  }

  update(dt: number, player: PlayerState): void {
    if (this.disposed) return;
    this.animationController.update(dt);
    this.customAppearance.update(dt);
    this.updateContactEvents(dt);
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const forwardSpeed =
      player.velocity.x * Math.sin(player.facing) + player.velocity.z * Math.cos(player.facing);
    const lateralSpeed =
      player.velocity.x * Math.cos(player.facing) - player.velocity.z * Math.sin(player.facing);
    const locomotion = speed > 7.5 ? 'sprint' : locomotionStateFor(speed, forwardSpeed, lateralSpeed);
    this.animationController.setLocomotion(locomotion);
    const dashStarted = player.dashTime > 0 && this.previousDashTime <= 0;
    this.previousDashTime = player.dashTime;
    const tookDamage = this.previousHealth !== undefined && player.health < this.previousHealth;
    this.previousHealth = player.health;

    if (!this.terminalState && tookDamage) {
      this.playReaction(player.health <= 0 ? 'knockdown' : 'damage');
    } else if (!this.terminalState && dashStarted) {
      this.playFootballAnimation('slideTackle');
    }
    for (const helper of this.diagnosticHelpers) helper.update();
  }

  playTechnique(technique: PlayerTechnique): void {
    this.playFootballAnimation(techniqueAnimationFor(technique));
  }

  setCharacter(id: CharacterId): void {
    this.selectedCharacter = id;
    this.animationController.setPersonality(id);
    this.applyVisualIdentity();
  }

  setCustomization(customization: Readonly<CustomCharacterAppearance>): void {
    this.customization = { ...customization };
    this.applyVisualIdentity();
  }

  playReaction(reaction: PlayerReaction): FootballAnimationResolution | undefined {
    if (this.terminalState) return voxelResolution(reaction);
    return this.playFootballAnimation(reaction);
  }

  /** Voxel animation is full-body and intentionally rejects imported additive clip names. */
  playAdditiveOverlay(_name: string, _weight = 1): boolean {
    return false;
  }

  drainContactEvents(): readonly FootballAnimationContactEvent[] {
    return this.contactEvents.splice(0);
  }

  setRigDiagnosticsEnabled(enabled: boolean): void {
    if (enabled && this.diagnosticHelpers.length === 0) {
      for (const joint of Object.values(this.rig.joints)) {
        const helper = new THREE.BoxHelper(joint, 0x70ffbc);
        helper.name = 'player-rig-diagnostics';
        helper.visible = true;
        this.rig.root.add(helper);
        this.diagnosticHelpers.push(helper);
      }
    }
    for (const helper of this.diagnosticHelpers) helper.visible = enabled;
  }

  playOutcome(outcome: PlayerOutcome): FootballAnimationResolution | undefined {
    const result = this.playFootballAnimation(outcome);
    if (result?.clipName && (outcome === 'victory' || outcome === 'defeat')) this.terminalState = outcome;
    return result;
  }

  resetPresentation(): void {
    this.terminalState = undefined;
    this.previousHealth = undefined;
    this.previousDashTime = 0;
    this.animationController.reset();
    this.contactEvents.length = 0;
    this.pendingContacts.length = 0;
    this.animationController.play('idle');
  }

  playFootballAnimation(state: FootballAnimationState): FootballAnimationResolution | undefined {
    if (this.disposed) return undefined;
    const previousState = this.animationController.activeState;
    const played = this.animationController.play(state as VoxelAnimationState);
    const resolution = voxelResolution(state);
    if (!played) return resolution;
    if (previousState !== state) this.pendingContacts.length = 0;
    const presentation = getFootballAnimationPresentation(state);
    if (presentation.contactAt !== undefined && presentation.contactSocket !== undefined) {
      if (this.pendingContacts.some((pending) => pending.state === state)) return resolution;
      const duration = VOXEL_STATE_DURATION[state] ?? 0.7;
      this.pendingContacts.push({
        state,
        clipName: resolution.clipName!,
        socket: presentation.contactSocket,
        remaining: duration * presentation.contactAt,
      });
    }
    return resolution;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.animationController.dispose();
    this.customAppearance.dispose();
    this.variants.dispose();
    for (const helper of this.diagnosticHelpers) {
      helper.removeFromParent();
      helper.geometry.dispose();
      const surfaces = Array.isArray(helper.material) ? helper.material : [helper.material];
      for (const surface of surfaces) surface.dispose();
    }
    this.diagnosticHelpers.length = 0;
    this.pendingContacts.length = 0;
    this.contactEvents.length = 0;
    this.rig.dispose();
  }

  private updateContactEvents(dt: number): void {
    for (let index = this.pendingContacts.length - 1; index >= 0; index -= 1) {
      const pending = this.pendingContacts[index]!;
      if (this.animationController.activeState !== pending.state) {
        this.pendingContacts.splice(index, 1);
        continue;
      }
      pending.remaining -= Math.max(0, dt);
      if (pending.remaining > 0) continue;
      this.pendingContacts.splice(index, 1);
      this.emitContact(pending);
    }
  }

  private emitContact(pending: PendingContact): void {
    const socket =
      pending.socket === 'head'
        ? this.rig.sockets.head
        : pending.socket === 'foot_l'
          ? this.rig.sockets.leftFoot
          : pending.socket === 'foot_r'
            ? this.rig.sockets.rightFoot
            : pending.socket === 'hand_l'
              ? this.rig.sockets.leftHand
              : pending.socket === 'hand_r'
                ? this.rig.sockets.rightHand
                : this.rig.root;
    const position = socket.getWorldPosition(new THREE.Vector3());
    this.contactEvents.push({
      state: pending.state,
      clipName: pending.clipName,
      socket: pending.socket,
      position: { x: position.x, y: position.y, z: position.z },
    });
  }

  private applyVisualIdentity(): void {
    const appearance = this.customization;
    const visualCharacter =
      appearance?.enabled === true ? appearance.baseCharacterId : this.selectedCharacter;
    this.variants.apply(visualCharacter);
    if (appearance) this.customAppearance.apply(appearance);
    if (!appearance?.enabled) return;
    this.rig.setPalette({
      skin: appearance.skin,
      primary: appearance.primary,
      secondary: appearance.secondary,
      accent: appearance.secondary,
      shorts: appearance.shorts,
      socks: appearance.socks,
      boots: appearance.boots,
      hair: appearance.hair,
      eyes: appearance.eyes,
    });
    this.rig.root.userData.customCharacterName = appearance.displayName;
  }
}

function voxelResolution(state: FootballAnimationState): FootballAnimationResolution {
  return {
    state,
    clipName: `Voxel_${state}`,
    source: 'dedicated',
    playback: FOOTBALL_ANIMATION_CONTRACT[state].playback,
  };
}
