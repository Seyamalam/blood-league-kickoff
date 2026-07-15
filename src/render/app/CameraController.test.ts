import { describe, expect, it } from 'vitest';
import { CameraController } from './CameraController';

describe('CameraController vertical look', () => {
  it('uses conventional non-inverted vertical look by default', () => {
    const controller = new CameraController();
    const initialPitch = controller.pitch;

    controller.applyMouseDelta(0, 20);

    expect(controller.pitch).toBeGreaterThan(initialPitch);
  });

  it('reverses vertical look when inversion is enabled', () => {
    const controller = new CameraController();
    const initialPitch = controller.pitch;
    controller.setInvertVerticalLook(true);

    controller.applyMouseDelta(0, 20);

    expect(controller.pitch).toBeLessThan(initialPitch);
  });

  it('keeps vertical look within the camera pitch limits in both modes', () => {
    const controller = new CameraController();

    controller.applyMouseDelta(0, 100_000);
    expect(controller.pitch).toBe(0.82);

    controller.setInvertVerticalLook(true);
    controller.applyMouseDelta(0, 100_000);
    expect(controller.pitch).toBe(-0.08);
  });
});

describe('CameraController live aiming', () => {
  it('rotates aim immediately with horizontal mouse movement', () => {
    const controller = new CameraController();
    const before = controller.aimDirection();

    controller.applyMouseDelta(-Math.PI / (2 * 0.0022), 0);
    const after = controller.aimDirection();

    expect(before.z).toBeLessThan(-0.9);
    expect(after.x).toBeLessThan(-0.9);
    expect(Math.abs(after.z)).toBeLessThan(0.01);
  });

  it('keeps authoritative aim independent from chase smoothing and arena clamping', () => {
    const controller = new CameraController();
    controller.applyMouseDelta(-240, 40);
    const beforeUpdate = controller.aimDirection();

    controller.update({ x: 43, y: 0.9, z: 67 }, 1 / 60);
    controller.addImpulse(0.4);
    controller.update({ x: 43, y: 0.9, z: 67 }, 1 / 60);

    expect(controller.aimDirection()).toEqual(beforeUpdate);
  });
});
