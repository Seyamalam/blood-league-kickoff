export type RandomSource = () => number;

export interface RandomSnapshot {
  readonly seed: number;
  readonly state: number;
  readonly draws: number;
}

/**
 * Small deterministic PRNG for saveable simulation streams.
 *
 * The implementation uses Mulberry32: it is fast, has stable unsigned 32-bit
 * semantics in JavaScript, and is intended for gameplay—not cryptography.
 */
export class SeededRandom {
  public readonly seed: number;
  private state: number;
  private drawCount = 0;

  public constructor(seed: number | string) {
    this.seed = normalizeSeed(typeof seed === 'string' ? hashSeed(seed) : seed);
    this.state = this.seed;
  }

  public next = (): number => {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.drawCount += 1;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  public range(min: number, max: number): number {
    const low = Math.min(finite(min), finite(max));
    const high = Math.max(finite(min), finite(max));
    return low + (high - low) * this.next();
  }

  public integer(min: number, maxInclusive: number): number {
    const low = Math.ceil(Math.min(finite(min), finite(maxInclusive)));
    const high = Math.floor(Math.max(finite(min), finite(maxInclusive)));
    return low + Math.floor(this.next() * (high - low + 1));
  }

  public chance(probability: number): boolean {
    return this.next() < Math.max(0, Math.min(1, finite(probability)));
  }

  public pick<T>(values: readonly T[]): T | undefined {
    return values.length === 0 ? undefined : values[this.integer(0, values.length - 1)];
  }

  /** A child stream depends only on the root seed and label, never draw order. */
  public fork(label: string): SeededRandom {
    return new SeededRandom(deriveSeed(this.seed, label));
  }

  public snapshot(): RandomSnapshot {
    return { seed: this.seed, state: this.state, draws: this.drawCount };
  }

  public restore(snapshot: Readonly<RandomSnapshot>): void {
    if (normalizeSeed(snapshot.seed) !== this.seed)
      throw new Error('Random snapshot belongs to another seed.');
    this.state = normalizeState(snapshot.state);
    this.drawCount = nonNegativeInteger(snapshot.draws);
  }
}

/** Stable FNV-1a hash followed by an avalanche mix. */
export function hashSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return mix32(hash);
}

export function deriveSeed(rootSeed: number, streamName: string): number {
  return normalizeSeed(mix32(normalizeSeed(rootSeed) ^ hashSeed(streamName)));
}

export function normalizeSeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.floor(value) >>> 0 || 1;
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function normalizeState(value: number): number {
  return Number.isFinite(value) ? Math.floor(value) >>> 0 : 0;
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
