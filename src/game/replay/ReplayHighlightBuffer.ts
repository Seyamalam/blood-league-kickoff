import type { Vec3 } from '../simulation/types';

export type ReplayHighlightKind =
  'kickoff' | 'goal' | 'perfect-volley' | 'elite-kill' | 'boss-phase' | 'boss-defeated' | 'player-down';

export interface ReplayActorSnapshot {
  readonly id: string;
  readonly position: Readonly<Vec3>;
  readonly facing?: number;
}

export interface ReplayHighlightInput {
  readonly kind: ReplayHighlightKind;
  readonly matchTime: number;
  readonly label: string;
  readonly importance?: number;
  readonly focus?: Readonly<Vec3>;
  readonly actors?: readonly ReplayActorSnapshot[];
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ReplayHighlight extends ReplayHighlightInput {
  readonly id: number;
  readonly importance: number;
  readonly recordedAt: number;
}

/**
 * Small, allocation-bounded event history for replays and automatic highlight cards.
 * It records authored moments rather than simulation frames, so it is safe to keep
 * enabled throughout a run and can later drive a deterministic replay sampler.
 */
export class ReplayHighlightBuffer {
  private readonly highlights: ReplayHighlight[] = [];
  private nextId = 1;

  public constructor(
    private readonly capacity = 48,
    private readonly now: () => number = () => performance.now(),
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('Replay highlight capacity must be a positive integer.');
    }
  }

  public get size(): number {
    return this.highlights.length;
  }

  public record(input: ReplayHighlightInput): ReplayHighlight {
    const highlight = freezeHighlight(this.nextId++, this.now(), input);
    this.highlights.push(highlight);
    if (this.highlights.length > this.capacity) this.highlights.shift();
    return highlight;
  }

  public all(): readonly ReplayHighlight[] {
    return [...this.highlights];
  }

  public recent(count = 5): readonly ReplayHighlight[] {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    return this.highlights.slice(-safeCount).reverse();
  }

  /** Returns the strongest moments, with recency breaking equal-importance ties. */
  public best(count = 3): readonly ReplayHighlight[] {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    return [...this.highlights]
      .sort((left, right) => right.importance - left.importance || right.matchTime - left.matchTime)
      .slice(0, safeCount);
  }

  public clear(): void {
    this.highlights.length = 0;
  }
}

function freezeHighlight(id: number, recordedAt: number, input: ReplayHighlightInput): ReplayHighlight {
  const position = (value: Readonly<Vec3> | undefined): Readonly<Vec3> | undefined =>
    value ? Object.freeze({ x: finite(value.x), y: finite(value.y), z: finite(value.z) }) : undefined;
  const actors = input.actors?.map((actor) =>
    Object.freeze({ id: actor.id, position: position(actor.position)!, facing: actor.facing }),
  );
  return Object.freeze({
    ...input,
    id,
    recordedAt: finite(recordedAt),
    matchTime: Math.max(0, finite(input.matchTime)),
    label: input.label.trim().slice(0, 80),
    importance: clamp(input.importance ?? defaultImportance(input.kind), 0, 1),
    focus: position(input.focus),
    actors: actors ? Object.freeze(actors) : undefined,
    metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
  });
}

function defaultImportance(kind: ReplayHighlightKind): number {
  if (kind === 'goal' || kind === 'boss-defeated') return 1;
  if (kind === 'perfect-volley' || kind === 'player-down') return 0.8;
  if (kind === 'boss-phase' || kind === 'elite-kill') return 0.65;
  return 0.35;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finite(value)));
}
