import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import { resolvePlayerAim } from '../../game/combat';
import { AimGuide, calculateAimGuideLength } from './AimGuide';

describe('aim guide projection', () => {
  it('reaches the first rectangular pitch boundary', () => {
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(PITCH_HALF_WIDTH);
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 0, y: 0, z: -1 })).toBe(PITCH_HALF_LENGTH);
  });

  it('returns no lane for a non-horizontal direction', () => {
    expect(calculateAimGuideLength({ x: 0, y: 0.9, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
  });

  it('renders along the same assisted direction used by gameplay', () => {
    const scene = new THREE.Scene();
    const guide = new AimGuide(scene);
    const aim = resolvePlayerAim(
      { x: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      [{ id: 4, position: { x: 8, z: 1.5 } }],
      'high',
    );

    guide.sync({ x: 0, y: 0.9, z: 0 }, aim.direction, true);
    const mesh = scene.getObjectByName('player-aim-guide');
    expect(mesh?.visible).toBe(true);
    const renderedDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh!.quaternion);
    const horizontalLength = Math.hypot(aim.direction.x, aim.direction.z);
    expect(renderedDirection.x).toBeCloseTo(aim.direction.x / horizontalLength);
    expect(renderedDirection.z).toBeCloseTo(aim.direction.z / horizontalLength);
    guide.dispose();
  });
});
