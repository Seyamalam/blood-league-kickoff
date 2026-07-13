import { describe, expect, it } from 'vitest';
import { createGameState } from '../game/simulation/gameState';
import {
  applyDenseWaveStressFormation,
  DENSE_WAVE_PERF_HOOK,
  installDenseWavePerformanceHook,
  readDenseWaveStressMode,
  type DenseWavePerformanceSnapshot,
} from './DenseWaveStress';

describe('dense-wave development profiling', () => {
  it('only accepts the exact development query', () => {
    expect(readDenseWaveStressMode('?stress=72', true)).toEqual({
      enemyCount: 72,
      frozenSimulation: true,
    });
    expect(readDenseWaveStressMode('?stress=71', true)).toBeNull();
    expect(readDenseWaveStressMode('?stress=72', false)).toBeNull();
  });

  it('builds the same bounded mixed formation every time', () => {
    const first = createGameState();
    const second = createGameState();
    applyDenseWaveStressFormation(first);
    applyDenseWaveStressFormation(second);

    expect(first.phase).toBe('playing');
    expect(first.enemies).toHaveLength(72);
    expect(first.enemies.map((enemy) => enemy.archetype)).toEqual(
      second.enemies.map((enemy) => enemy.archetype),
    );
    expect(first.enemies.map((enemy) => enemy.position)).toEqual(
      second.enemies.map((enemy) => enemy.position),
    );
    expect(new Set(first.enemies.map((enemy) => enemy.archetype))).toHaveLength(8);
    expect(first.enemies.every((enemy) => Math.abs(enemy.position.x) <= 22)).toBe(true);
    expect(first.enemies.every((enemy) => Math.abs(enemy.position.z) <= 14)).toBe(true);
    expect(first.player.invulnerability).toBe(Number.POSITIVE_INFINITY);
  });

  it('exposes fresh frozen snapshots through a removable non-writable hook', () => {
    const target = {} as Record<string, unknown>;
    let fps = 120;
    const uninstall = installDenseWavePerformanceHook(target, () => snapshot(fps));
    const descriptor = Object.getOwnPropertyDescriptor(target, DENSE_WAVE_PERF_HOOK);
    const read = target[DENSE_WAVE_PERF_HOOK] as () => DenseWavePerformanceSnapshot;
    const first = read();
    fps = 60;
    const second = read();

    expect(descriptor?.writable).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.smoothedFps).toBe(120);
    expect(second.smoothedFps).toBe(60);
    expect(second).not.toBe(first);
    uninstall();
    expect(target[DENSE_WAVE_PERF_HOOK]).toBeUndefined();
  });
});

function snapshot(smoothedFps: number): DenseWavePerformanceSnapshot {
  return {
    mode: 'dense-wave',
    frozenSimulation: true,
    renderQuality: 'performance',
    renderScale: 1,
    fpsLimit: 120,
    viewportWidth: 1600,
    viewportHeight: 900,
    pixelRatio: 1,
    rendererCalls: 300,
    rendererTriangles: 15_000,
    enemyCount: 72,
    fixedSteps: 1,
    bloodShardPoolActive: 0,
    bloodShardPoolCapacity: 160,
    garlicPoolActive: 0,
    garlicPoolCapacity: 24,
    orbitPoolActive: 0,
    orbitPoolCapacity: 3,
    ghostPassPoolActive: 0,
    ghostPassPoolCapacity: 8,
    currentFrameMs: 8.3,
    smoothedFrameMs: 8.3,
    currentFps: 120,
    smoothedFps,
    fixedStepsTotal: 60,
    pooledObjectsActive: 0,
    pooledObjectsCapacity: 195,
  };
}
