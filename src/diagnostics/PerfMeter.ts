export interface PerformanceCounters {
  readonly rendererCalls: number;
  readonly rendererTriangles: number;
  readonly enemyCount: number;
  /** Fixed simulation steps executed during this rendered frame. */
  readonly fixedSteps: number;
  readonly bloodShardPoolActive: number;
  readonly bloodShardPoolCapacity: number;
  readonly garlicPoolActive: number;
  readonly garlicPoolCapacity: number;
  readonly orbitPoolActive: number;
  readonly orbitPoolCapacity: number;
  readonly ghostPassPoolActive: number;
  readonly ghostPassPoolCapacity: number;
  readonly multiBallPoolActive: number;
  readonly multiBallPoolCapacity: number;
  readonly blackHolePoolActive: number;
  readonly blackHolePoolCapacity: number;
}

export interface PerformanceSnapshot extends PerformanceCounters {
  /** Latest render cadence, including browser scheduling, in milliseconds. */
  readonly currentFrameMs: number;
  /** Exponentially smoothed render cadence in milliseconds. */
  readonly smoothedFrameMs: number;
  readonly currentFps: number;
  readonly smoothedFps: number;
  readonly fixedStepsTotal: number;
  readonly pooledObjectsActive: number;
  readonly pooledObjectsCapacity: number;
}

export type MutablePerformanceCounters = {
  -readonly [Key in keyof PerformanceCounters]: PerformanceCounters[Key];
};
type WritablePerformanceSnapshot = { -readonly [Key in keyof PerformanceSnapshot]: PerformanceSnapshot[Key] };

const EMPTY_COUNTERS: PerformanceCounters = {
  rendererCalls: 0,
  rendererTriangles: 0,
  enemyCount: 0,
  fixedSteps: 0,
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
};

/**
 * Allocation-conscious frame diagnostics. `snapshot` is one stable object whose
 * numeric fields are updated in place; consumers should read it, not retain copies.
 */
export class PerfMeter {
  private readonly value: WritablePerformanceSnapshot = createSnapshot();
  private initialized = false;

  get snapshot(): Readonly<PerformanceSnapshot> {
    return this.value;
  }

  /**
   * Records one presented frame and returns smoothed FPS for the existing HUD API.
   * Supplying counters is optional, preserving the original `update(dt)` caller.
   */
  update(dt: number, counters?: Readonly<PerformanceCounters>): number {
    const safeDt = finiteClamp(dt, 0, 1);
    if (safeDt > 0) {
      const frameMs = safeDt * 1_000;
      this.value.currentFrameMs = frameMs;
      this.value.currentFps = 1 / safeDt;
      if (!this.initialized) {
        this.value.smoothedFrameMs = frameMs;
        this.initialized = true;
      } else {
        // Time-aware EMA behaves consistently at 30, 60, 120, and 144 Hz.
        const smoothing = 1 - Math.exp(-safeDt / 0.45);
        this.value.smoothedFrameMs += (frameMs - this.value.smoothedFrameMs) * smoothing;
      }
      this.value.smoothedFps = this.value.smoothedFrameMs > 0 ? 1_000 / this.value.smoothedFrameMs : 0;
    }
    if (counters) this.recordCounters(counters);
    return Math.round(this.value.smoothedFps);
  }

  /** Copies caller-owned counters into the stable snapshot without retaining input. */
  recordCounters(counters: Readonly<PerformanceCounters>): void {
    const value = this.value;
    value.rendererCalls = nonNegativeInteger(counters.rendererCalls);
    value.rendererTriangles = nonNegativeInteger(counters.rendererTriangles);
    value.enemyCount = nonNegativeInteger(counters.enemyCount);
    value.fixedSteps = nonNegativeInteger(counters.fixedSteps);
    value.fixedStepsTotal += value.fixedSteps;
    value.bloodShardPoolActive = nonNegativeInteger(counters.bloodShardPoolActive);
    value.bloodShardPoolCapacity = nonNegativeInteger(counters.bloodShardPoolCapacity);
    value.garlicPoolActive = nonNegativeInteger(counters.garlicPoolActive);
    value.garlicPoolCapacity = nonNegativeInteger(counters.garlicPoolCapacity);
    value.orbitPoolActive = nonNegativeInteger(counters.orbitPoolActive);
    value.orbitPoolCapacity = nonNegativeInteger(counters.orbitPoolCapacity);
    value.ghostPassPoolActive = nonNegativeInteger(counters.ghostPassPoolActive);
    value.ghostPassPoolCapacity = nonNegativeInteger(counters.ghostPassPoolCapacity);
    value.multiBallPoolActive = nonNegativeInteger(counters.multiBallPoolActive);
    value.multiBallPoolCapacity = nonNegativeInteger(counters.multiBallPoolCapacity);
    value.blackHolePoolActive = nonNegativeInteger(counters.blackHolePoolActive);
    value.blackHolePoolCapacity = nonNegativeInteger(counters.blackHolePoolCapacity);
    value.pooledObjectsActive =
      value.bloodShardPoolActive +
      value.garlicPoolActive +
      value.orbitPoolActive +
      value.ghostPassPoolActive +
      value.multiBallPoolActive +
      value.blackHolePoolActive;
    value.pooledObjectsCapacity =
      value.bloodShardPoolCapacity +
      value.garlicPoolCapacity +
      value.orbitPoolCapacity +
      value.ghostPassPoolCapacity +
      value.multiBallPoolCapacity +
      value.blackHolePoolCapacity;
  }

  reset(): void {
    this.initialized = false;
    Object.assign(this.value, createSnapshot());
  }
}

/** Counts active records in a bounded pool without creating an intermediate array. */
export function countActivePoolItems(items: readonly { readonly active: boolean }[]): number {
  let active = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.active) active += 1;
  }
  return active;
}

/** Convenient complete zero value for a caller-owned, reusable counters object. */
export function createPerformanceCounters(): MutablePerformanceCounters {
  return { ...EMPTY_COUNTERS };
}

function createSnapshot(): WritablePerformanceSnapshot {
  return {
    ...EMPTY_COUNTERS,
    currentFrameMs: 0,
    smoothedFrameMs: 0,
    currentFps: 0,
    smoothedFps: 0,
    fixedStepsTotal: 0,
    pooledObjectsActive: 0,
    pooledObjectsCapacity: 0,
  };
}

function finiteClamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function nonNegativeInteger(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}
