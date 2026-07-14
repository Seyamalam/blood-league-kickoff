import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PHOTO_MODE_STATE, PhotoModeController, sanitizePhotoModeState } from './PhotoModeController';

describe('PhotoModeController', () => {
  it('clamps camera controls and validates filters', () => {
    expect(
      sanitizePhotoModeState({ pitch: 9, distance: -4, fov: 200, exposure: Number.NaN, filter: 'cold' }),
    ).toMatchObject({
      pitch: 1.25,
      distance: 2,
      fov: 90,
      exposure: 0.55,
      filter: 'cold',
    });
  });

  it('broadcasts orbit and zoom changes and resets cleanly', () => {
    const controller = new PhotoModeController();
    const listener = vi.fn();
    controller.subscribe(listener, true);
    controller.orbit(0.5, -0.1);
    controller.zoom(-2);
    expect(controller.value.yaw).toBeCloseTo(0.5);
    expect(controller.value.pitch).toBeCloseTo(0.14);
    expect(controller.value.distance).toBeCloseTo(5.5);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(controller.reset()).toEqual(DEFAULT_PHOTO_MODE_STATE);
  });
});
