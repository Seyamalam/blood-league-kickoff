import { describe, expect, it } from 'vitest';
import { BloodShardSystem } from './index';

describe('BloodShardSystem', () => {
  it('preserves and collects spawned XP', () => {
    const system = new BloodShardSystem({ capacity: 4, seed: 9 });
    system.spawnOnKill({ x: 0, y: 0.9, z: 0 }, 12, 3);
    expect(system.state.activeCount).toBe(3);
    const collected = system.update({ x: 0, y: 0.9, z: 0 }, 1 / 60);
    expect(collected).toBe(12);
    expect(system.state.collectedXpTotal).toBe(12);
    expect(system.state.activeCount).toBe(0);
  });

  it('merges overflow XP instead of losing it', () => {
    const system = new BloodShardSystem({ capacity: 1, seed: 4, collectionRadius: 0.01 });
    system.spawnOnKill({ x: 0, y: 0.9, z: 0 }, 20, 4);
    expect(system.state.activeCount).toBe(1);
    expect(system.state.pickups[0]?.xpValue).toBe(20);
  });
});
