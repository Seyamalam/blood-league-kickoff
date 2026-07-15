import type { PerformanceSnapshot } from './PerfMeter';

export const RUNTIME_DIAGNOSTICS_HOOK = '__bloodLeagueDiagnostics';
const FRAME_BUDGET_TOLERANCE_MS = 0.25;

export interface FrameTimeDistribution {
  readonly samples: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly meanMs: number;
  readonly missed60FpsPercent: number;
  readonly missed120FpsPercent: number;
}

export interface RendererDiagnostics {
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
  readonly pixelRatio: number;
  readonly maxTextureSize: number;
  readonly maxSamples: number;
  readonly precision: string;
  readonly webgl2: boolean;
}

export interface RuntimeDiagnosticsSnapshot {
  readonly frameTime: FrameTimeDistribution;
  readonly performance: Readonly<PerformanceSnapshot>;
  readonly renderer: RendererDiagnostics;
  readonly viewport: Readonly<{ width: number; height: number; devicePixelRatio: number }>;
}

interface HookTarget {
  [RUNTIME_DIAGNOSTICS_HOOK]?: () => Readonly<RuntimeDiagnosticsSnapshot>;
}

/** Diagnostic hooks are deliberately unavailable in production builds. */
export function readRuntimeDiagnosticsMode(search: string, development: boolean): boolean {
  if (!development) return false;
  return new URLSearchParams(search).get('diagnostics') === '1';
}

/**
 * Fixed-capacity frame sampler. Recording is allocation-free; sorting only occurs
 * when a developer explicitly requests a snapshot from the browser console.
 */
export class FrameTimeSampler {
  private readonly values: Float64Array;
  private count = 0;
  private cursor = 0;

  constructor(capacity = 600) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error('Frame sample capacity must be positive');
    this.values = new Float64Array(capacity);
  }

  record(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return;
    this.values[this.cursor] = frameMs;
    this.cursor = (this.cursor + 1) % this.values.length;
    this.count = Math.min(this.count + 1, this.values.length);
  }

  reset(): void {
    this.values.fill(0);
    this.count = 0;
    this.cursor = 0;
  }

  snapshot(): FrameTimeDistribution {
    if (this.count === 0) return EMPTY_DISTRIBUTION;
    const sorted = Array.from(this.values.subarray(0, this.count)).sort((left, right) => left - right);
    let total = 0;
    let missed60 = 0;
    let missed120 = 0;
    for (const frameMs of sorted) {
      total += frameMs;
      // RAF timestamps commonly wobble by tenths of a millisecond around the
      // refresh deadline. Treat that scheduling noise as on-budget.
      if (frameMs > 1_000 / 60 + FRAME_BUDGET_TOLERANCE_MS) missed60 += 1;
      if (frameMs > 1_000 / 120 + FRAME_BUDGET_TOLERANCE_MS) missed120 += 1;
    }
    return Object.freeze({
      samples: this.count,
      p50Ms: percentile(sorted, 0.5),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
      meanMs: total / this.count,
      missed60FpsPercent: (missed60 / this.count) * 100,
      missed120FpsPercent: (missed120 / this.count) * 100,
    });
  }
}

export function installRuntimeDiagnosticsHook(
  target: object,
  readSnapshot: () => RuntimeDiagnosticsSnapshot,
): () => void {
  const hookTarget = target as HookTarget;
  Object.defineProperty(hookTarget, RUNTIME_DIAGNOSTICS_HOOK, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: () => deepFreezeSnapshot(readSnapshot()),
  });
  return () => {
    delete hookTarget[RUNTIME_DIAGNOSTICS_HOOK];
  };
}

const EMPTY_DISTRIBUTION: FrameTimeDistribution = Object.freeze({
  samples: 0,
  p50Ms: 0,
  p95Ms: 0,
  p99Ms: 0,
  meanMs: 0,
  missed60FpsPercent: 0,
  missed120FpsPercent: 0,
});

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

function deepFreezeSnapshot(snapshot: RuntimeDiagnosticsSnapshot): Readonly<RuntimeDiagnosticsSnapshot> {
  return Object.freeze({
    frameTime: Object.freeze({ ...snapshot.frameTime }),
    performance: Object.freeze({ ...snapshot.performance }),
    renderer: Object.freeze({ ...snapshot.renderer }),
    viewport: Object.freeze({ ...snapshot.viewport }),
  });
}
