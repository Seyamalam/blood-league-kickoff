import { describe, expect, it } from 'vitest';
import {
  FrameTimeSampler,
  RUNTIME_DIAGNOSTICS_HOOK,
  installRuntimeDiagnosticsHook,
  readRuntimeDiagnosticsMode,
  type RuntimeDiagnosticsSnapshot,
} from './RuntimeDiagnostics';

describe('runtime diagnostics', () => {
  it('can only be enabled explicitly in development', () => {
    expect(readRuntimeDiagnosticsMode('?diagnostics=1', true)).toBe(true);
    expect(readRuntimeDiagnosticsMode('?diagnostics=0', true)).toBe(false);
    expect(readRuntimeDiagnosticsMode('?diagnostics=1', false)).toBe(false);
  });

  it('reports frame percentiles and target misses from a bounded sample', () => {
    const sampler = new FrameTimeSampler(4);
    sampler.record(4);
    sampler.record(8);
    sampler.record(10);
    sampler.record(20);
    sampler.record(6); // overwrites the oldest sample
    const result = sampler.snapshot();

    expect(result.samples).toBe(4);
    expect(result.p50Ms).toBe(8);
    expect(result.p95Ms).toBe(20);
    expect(result.p99Ms).toBe(20);
    expect(result.meanMs).toBe(11);
    expect(result.missed60FpsPercent).toBe(25);
    expect(result.missed120FpsPercent).toBe(50);
  });

  it('ignores invalid samples and can reset', () => {
    const sampler = new FrameTimeSampler(2);
    sampler.record(Number.NaN);
    sampler.record(0);
    expect(sampler.snapshot().samples).toBe(0);
    sampler.record(8);
    sampler.reset();
    expect(sampler.snapshot().samples).toBe(0);
  });

  it('installs an immutable, removable browser hook', () => {
    const target: Record<string, unknown> = {};
    const snapshot = createSnapshot();
    const uninstall = installRuntimeDiagnosticsHook(target, () => snapshot);
    const read = target[RUNTIME_DIAGNOSTICS_HOOK] as () => RuntimeDiagnosticsSnapshot;
    const value = read();

    expect(value.renderer.calls).toBe(12);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.renderer)).toBe(true);
    uninstall();
    expect(target[RUNTIME_DIAGNOSTICS_HOOK]).toBeUndefined();
  });
});

function createSnapshot(): RuntimeDiagnosticsSnapshot {
  return {
    frameTime: {
      samples: 1,
      p50Ms: 8,
      p95Ms: 8,
      p99Ms: 8,
      meanMs: 8,
      missed60FpsPercent: 0,
      missed120FpsPercent: 0,
    },
    performance: {
      currentFrameMs: 8,
      smoothedFrameMs: 8,
      currentFps: 125,
      smoothedFps: 125,
      rendererCalls: 12,
      rendererTriangles: 100,
      enemyCount: 2,
      fixedSteps: 1,
      fixedStepsTotal: 1,
      pooledObjectsActive: 0,
      pooledObjectsCapacity: 0,
      bloodShardPoolActive: 0,
      bloodShardPoolCapacity: 0,
      garlicPoolActive: 0,
      garlicPoolCapacity: 0,
      orbitPoolActive: 0,
      orbitPoolCapacity: 0,
      ghostPassPoolActive: 0,
      ghostPassPoolCapacity: 0,
      multiBallPoolActive: 0,
      multiBallPoolCapacity: 0,
      blackHolePoolActive: 0,
      blackHolePoolCapacity: 0,
    },
    renderer: {
      calls: 12,
      triangles: 100,
      geometries: 4,
      textures: 3,
      programs: 2,
      pixelRatio: 1,
      maxTextureSize: 8_192,
      maxSamples: 4,
      precision: 'highp',
      webgl2: true,
    },
    viewport: { width: 1280, height: 720, devicePixelRatio: 1 },
  };
}
