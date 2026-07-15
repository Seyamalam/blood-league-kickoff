import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CharacterAnimationController, isExplicitAdditiveClipName } from './CharacterAnimationController';

function createController(...clips: THREE.AnimationClip[]): CharacterAnimationController {
  return new CharacterAnimationController(new THREE.AnimationMixer(new THREE.Object3D()), clips);
}

function clip(name: string, duration = 1): THREE.AnimationClip {
  return new THREE.AnimationClip(name, duration, []);
}

describe('CharacterAnimationController', () => {
  it('protects one-shots from lower-priority locomotion but permits a stronger reaction', () => {
    const controller = createController(clip('Idle'), clip('Shoot'), clip('Damage'));
    expect(controller.playBase({ name: 'Idle', priority: 10 })).toBe(true);
    expect(
      controller.playBase({
        name: 'Shoot',
        priority: 50,
        loop: THREE.LoopOnce,
        releaseAfter: 0.8,
      }),
    ).toBe(true);
    expect(controller.isBaseLocked).toBe(true);
    expect(controller.playBase({ name: 'Idle', priority: 10 })).toBe(false);
    expect(
      controller.playBase({
        name: 'Damage',
        priority: 70,
        loop: THREE.LoopOnce,
        releaseAfter: 0.4,
      }),
    ).toBe(true);
    expect(controller.activeBaseName).toBe('Damage');
  });

  it('releases a one-shot from the deterministic recovery-time fallback', () => {
    const controller = createController(clip('Shoot', 5));
    controller.playBase({
      name: 'Shoot',
      priority: 50,
      loop: THREE.LoopOnce,
      releaseAfter: 0.2,
    });
    expect(controller.update(0.1)).toBe(false);
    expect(controller.update(0.11)).toBe(true);
    expect(controller.isBaseLocked).toBe(false);
  });

  it('also releases when AnimationMixer reports natural completion', () => {
    const controller = createController(clip('Shoot', 0.1));
    controller.playBase({
      name: 'Shoot',
      priority: 50,
      loop: THREE.LoopOnce,
      releaseAfter: 2,
    });
    expect(controller.update(0.11)).toBe(true);
    expect(controller.activeBaseName).toBeUndefined();
  });

  it('holds terminal poses until an explicit presentation reset', () => {
    const controller = createController(clip('Defeat', 0.1), clip('Idle'));
    controller.playBase({
      name: 'Defeat',
      priority: 100,
      loop: THREE.LoopOnce,
      terminal: true,
    });
    controller.update(2);
    expect(controller.isBaseLocked).toBe(true);
    expect(controller.playBase({ name: 'Idle', priority: 10 })).toBe(false);
    controller.reset();
    expect(controller.playBase({ name: 'Idle', priority: 10 })).toBe(true);
  });

  it('accepts only explicit additive naming and rejects arbitrary full-body clips', () => {
    const controller = createController(clip('Hit_Chest'), clip('UpperBodyHit_Additive'));
    expect(controller.playAdditiveOverlay({ name: 'Hit_Chest' })).toBe(false);
    expect(controller.playAdditiveOverlay({ name: 'UpperBodyHit_Additive', weight: 0.5 })).toBe(true);
    expect(isExplicitAdditiveClipName('Additive_Look')).toBe(true);
    expect(isExplicitAdditiveClipName('Celebration')).toBe(false);
  });
});
