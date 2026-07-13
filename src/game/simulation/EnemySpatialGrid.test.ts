import { describe, expect, it } from 'vitest';
import { EnemySpatialGrid } from './EnemySpatialGrid';
import type { EnemyArchetype, EnemyState } from './types';

describe('EnemySpatialGrid', () => {
  it('finds coaches across cell boundaries and rejects coaches outside the aura', () => {
    const grid = new EnemySpatialGrid(-22, -14, 22, 14, 2.5, 4);
    const target = enemy(1, 'bloodFan', 0, 0);
    const nearCoach = enemy(2, 'coach', 5.49, 0);
    const farCoach = enemy(3, 'coach', -8, 0);
    const crowd = [target, nearCoach, farCoach];
    grid.rebuild(crowd);
    expect(grid.hasNearbyCoach(crowd, 0, 5.5)).toBe(true);
    nearCoach.position.x = 5.51;
    grid.rebuild(crowd);
    expect(grid.hasNearbyCoach(crowd, 0, 5.5)).toBe(false);
  });

  it('matches the separation formula for neighbors and ignores distant enemies', () => {
    const grid = new EnemySpatialGrid();
    const crowd = [enemy(1, 'bloodFan', 0, 0), enemy(2, 'bloodFan', 0.5, 0), enemy(3, 'bloodFan', 12, 0)];
    grid.rebuild(crowd);
    grid.accumulateSeparation(crowd, 0, 0.18);
    const separationRadius = 0.52 + 0.52 + 0.18;
    expect(grid.separationX).toBeCloseTo(-(separationRadius - 0.5) / separationRadius, 8);
    expect(grid.separationZ).toBe(0);
  });

  it('grows capacity geometrically and handles a dense mixed 257-enemy crowd', () => {
    const grid = new EnemySpatialGrid(-22, -14, 22, 14, 2.5, 4);
    const archetypes: readonly EnemyArchetype[] = ['bloodFan', 'winger', 'defender', 'coach'];
    const crowd = Array.from({ length: 257 }, (_, index) =>
      enemy(index, archetypes[index % archetypes.length]!, (index % 17) * 0.06, (index % 11) * 0.06),
    );
    grid.rebuild(crowd);
    expect(grid.capacity).toBeGreaterThanOrEqual(257);
    expect(grid.hasNearbyCoach(crowd, 0, 5.5)).toBe(true);
    for (let index = 0; index < crowd.length; index += 1) {
      grid.accumulateSeparation(crowd, index, 0.18);
      expect(Number.isFinite(grid.separationX)).toBe(true);
      expect(Number.isFinite(grid.separationZ)).toBe(true);
    }
  });
});

function enemy(id: number, archetype: EnemyArchetype, x: number, z: number): EnemyState {
  const position = { x, y: 0.9, z };
  return {
    id,
    archetype,
    position,
    previousPosition: { ...position },
    radius: 0.52,
    speed: 2,
    attackDamage: 10,
    hitPoints: 1,
    maxHitPoints: 1,
    hitFlash: 0,
    lastBallHit: 0,
    buffed: false,
    knockbackVelocity: { x: 0, y: 0, z: 0 },
    attackState: 'chase',
    attackTimer: 0,
    attackCooldown: 0,
    attackDirection: { x: 0, y: 0, z: 1 },
    shieldFlash: 0,
    elite: false,
    eliteModifier: 1,
  };
}
