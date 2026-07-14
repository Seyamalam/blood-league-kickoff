import { describe, expect, it } from 'vitest';
import { CombatFeedbackSystem } from './CombatFeedbackSystem';

describe('CombatFeedbackSystem', () => {
  it('creates stronger but bounded feedback for major impacts', () => {
    const feedback = new CombatFeedbackSystem();
    feedback.addImpact({ kind: 'boss-hit', damage: 200, direction: { x: 1, y: 0, z: 0 }, perfect: true });
    expect(feedback.state.hitStopRemaining).toBeGreaterThan(0);
    expect(feedback.state.hitStopRemaining).toBeLessThanOrEqual(0.075);
    expect(Math.abs(feedback.state.cameraOffset.x)).toBeLessThanOrEqual(0.65);
    expect(feedback.state.fovKick).toBeLessThanOrEqual(3.2);
  });

  it('alternates lateral impulse to avoid one-direction camera drift', () => {
    const feedback = new CombatFeedbackSystem();
    feedback.addImpact({ kind: 'kick', damage: 1 });
    const first = feedback.state.cameraOffset.x;
    feedback.reset();
    feedback.addImpact({ kind: 'kick', damage: 1 });
    const repeated = feedback.state.cameraOffset.x;
    expect(repeated).toBe(first);
  });

  it('decays impulses smoothly back toward neutral', () => {
    const feedback = new CombatFeedbackSystem();
    feedback.addImpact({ kind: 'goal', damage: 50 });
    const initial = feedback.state.fovKick;
    for (let index = 0; index < 120; index += 1) feedback.step(1 / 60);
    expect(feedback.state.fovKick).toBeLessThan(initial * 0.01);
    expect(feedback.state.chromaticPulse).toBeLessThan(0.001);
  });

  it('offers explicit, finite hit-stop consumption', () => {
    const feedback = new CombatFeedbackSystem();
    feedback.addImpact({ kind: 'elite-hit', damage: 20 });
    expect(feedback.consumeHitStop(1 / 60)).toBe(true);
    for (let index = 0; index < 10; index += 1) feedback.consumeHitStop(1 / 60);
    expect(feedback.consumeHitStop(1 / 60)).toBe(false);
  });
});
