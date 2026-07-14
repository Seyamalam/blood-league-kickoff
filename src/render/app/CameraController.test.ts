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
