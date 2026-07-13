import { describe, expect, it } from 'vitest';
import { PerfMeter, countActivePoolItems, createPerformanceCounters } from './PerfMeter';

describe('PerfMeter', () => {
  it('preserves the update(dt) FPS API and keeps a stable snapshot object', () => {
    const meter = new PerfMeter();
    const snapshot = meter.snapshot;
    expect(meter.update(1 / 120)).toBe(120);
    expect(meter.snapshot).toBe(snapshot);
    expect(snapshot.currentFrameMs).toBeCloseTo(8.333, 2);
    expect(snapshot.smoothedFps).toBeCloseTo(120, 3);
  });

  it('copies renderer, world, pool, and fixed-step counters', () => {
    const meter = new PerfMeter();
    const counters = {
      ...createPerformanceCounters(),
      rendererCalls: 31,
      rendererTriangles: 42_000,
      enemyCount: 72,
      fixedSteps: 2,
      bloodShardPoolActive: 18,
      bloodShardPoolCapacity: 160,
      garlicPoolActive: 3,
      garlicPoolCapacity: 24,
      orbitPoolActive: 2,
      orbitPoolCapacity: 3,
      ghostPassPoolActive: 1,
      ghostPassPoolCapacity: 8,
    };
    meter.update(1 / 60, counters);
    expect(meter.snapshot.rendererTriangles).toBe(42_000);
    expect(meter.snapshot.fixedStepsTotal).toBe(2);
    expect(meter.snapshot.pooledObjectsActive).toBe(24);
    expect(meter.snapshot.pooledObjectsCapacity).toBe(195);
    meter.recordCounters({ ...counters, fixedSteps: 1 });
    expect(meter.snapshot.fixedStepsTotal).toBe(3);
  });

  it('counts active bounded pool entries without filtering', () => {
    expect(countActivePoolItems([{ active: true }, { active: false }, { active: true }])).toBe(2);
  });
});
