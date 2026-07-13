import type {
  BloodShardSystemOptions,
  PickupCollectionEvent,
  PickupCollectionListener,
  PickupState,
  PickupSystemState,
  PickupVector3,
} from './types';

const DEFAULT_CAPACITY = 160;
const MIN_CAPACITY = 1;
const MAX_CAPACITY = 512;
const GRAVITY = 18;

/**
 * Lightweight fixed-step blood-shard simulation.
 *
 * All pickup and collection-event records are allocated once. Call `update()`
 * from the authoritative fixed step, then read `state.pickups` for rendering.
 * When the pool is full, new XP is merged into an active shard so rewards are
 * never lost merely because the visual pickup cap was reached.
 */
export class BloodShardSystem {
  public readonly state: PickupSystemState;

  private readonly pickups: PickupState[];
  private readonly collectionEvents: PickupCollectionEvent[];
  private readonly freeIndices: number[];
  private readonly initialSeed: number;
  private randomState: number;
  private readonly magnetRadiusSquared: number;
  private readonly collectionRadiusSquared: number;
  private readonly magnetAcceleration: number;
  private readonly maxMagnetSpeed: number;
  private readonly magnetDelay: number;
  private readonly groundHeight: number;

  public constructor(options: BloodShardSystemOptions = {}) {
    const capacity = clampInteger(options.capacity ?? DEFAULT_CAPACITY, MIN_CAPACITY, MAX_CAPACITY);
    this.initialSeed = normalizeSeed(options.seed ?? 0xb100d5ed);
    this.randomState = this.initialSeed;
    const magnetRadius = positiveOr(options.magnetRadius, 5.4);
    const collectionRadius = positiveOr(options.collectionRadius, 0.72);
    this.magnetRadiusSquared = magnetRadius * magnetRadius;
    this.collectionRadiusSquared = collectionRadius * collectionRadius;
    this.magnetAcceleration = positiveOr(options.magnetAcceleration, 46);
    this.maxMagnetSpeed = positiveOr(options.maxMagnetSpeed, 16);
    this.magnetDelay = nonNegativeOr(options.magnetDelay, 0.18);
    this.groundHeight = nonNegativeOr(options.groundHeight, 0.16);

    this.pickups = new Array<PickupState>(capacity);
    this.collectionEvents = new Array<PickupCollectionEvent>(capacity);
    this.freeIndices = new Array<number>(capacity);
    for (let index = 0; index < capacity; index += 1) {
      this.pickups[index] = createPickup(index, this.groundHeight);
      this.collectionEvents[index] = { pickupId: index, xpValue: 0 };
      // Reverse ordering makes pop() activate slots 0, 1, 2... for render locality.
      this.freeIndices[index] = capacity - index - 1;
    }
    this.state = {
      capacity,
      pickups: this.pickups,
      activeCount: 0,
      spawnedXpTotal: 0,
      collectedXpTotal: 0,
      collectedXpThisStep: 0,
      collectionEventCount: 0,
    };
  }

  /**
   * Spawns a small physical burst for a kill and returns its visual shard count.
   * `totalXp` is divided between `shardCount` records and preserved at pool cap.
   */
  public spawnOnKill(position: Readonly<PickupVector3>, totalXp = 1, shardCount = 1): number {
    if (!Number.isFinite(totalXp) || totalXp <= 0) return 0;
    const count = clampInteger(shardCount, 1, 12);
    const xpPerShard = totalXp / count;
    let spawned = 0;
    this.state.spawnedXpTotal += totalXp;

    for (let index = 0; index < count; index += 1) {
      const slotIndex = this.freeIndices.pop();
      if (slotIndex === undefined) {
        this.mergeIntoActiveShard(position, xpPerShard);
        continue;
      }
      const pickup = this.pickups[slotIndex];
      if (!pickup) continue;
      this.activate(pickup, position, xpPerShard);
      spawned += 1;
    }
    return spawned;
  }

  /**
   * Advances burst, bounce, magnet, and collection behavior without per-step
   * allocations. Returns XP collected during this step for convenient integration.
   */
  public update(
    playerPosition: Readonly<PickupVector3>,
    deltaSeconds: number,
    onCollect?: PickupCollectionListener,
  ): number {
    const delta = Math.min(0.05, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.state.collectedXpThisStep = 0;
    this.state.collectionEventCount = 0;
    if (delta === 0 || this.state.activeCount === 0) return 0;

    const drag = Math.max(0, 1 - delta * 2.8);
    for (let index = 0; index < this.pickups.length; index += 1) {
      const pickup = this.pickups[index];
      if (!pickup?.active) continue;
      copyVector(pickup.previousPosition, pickup.position);
      pickup.age += delta;
      pickup.spin += (2.4 + Math.min(8, lengthSquared(pickup.velocity))) * delta;

      const dx = playerPosition.x - pickup.position.x;
      const dy = playerPosition.y + 0.55 - pickup.position.y;
      const dz = playerPosition.z - pickup.position.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;

      if (distanceSquared <= this.collectionRadiusSquared) {
        this.collect(pickup, onCollect);
        continue;
      }

      if (pickup.age >= this.magnetDelay && distanceSquared <= this.magnetRadiusSquared) {
        const inverseDistance = 1 / Math.sqrt(Math.max(0.0001, distanceSquared));
        // Attraction strengthens near the player so a shard cannot orbit forever.
        const proximity = 1 - Math.sqrt(distanceSquared / this.magnetRadiusSquared);
        const acceleration = this.magnetAcceleration * (0.45 + proximity * 0.9) * delta;
        pickup.velocity.x += dx * inverseDistance * acceleration;
        pickup.velocity.y += dy * inverseDistance * acceleration;
        pickup.velocity.z += dz * inverseDistance * acceleration;
        limitVelocity(pickup.velocity, this.maxMagnetSpeed);
      } else {
        pickup.velocity.y -= GRAVITY * delta;
        pickup.velocity.x *= drag;
        pickup.velocity.z *= drag;
      }

      pickup.position.x += pickup.velocity.x * delta;
      pickup.position.y += pickup.velocity.y * delta;
      pickup.position.z += pickup.velocity.z * delta;

      if (pickup.position.y < this.groundHeight) {
        pickup.position.y = this.groundHeight;
        if (pickup.velocity.y < -0.45) pickup.velocity.y *= -0.38;
        else pickup.velocity.y = 0;
        pickup.velocity.x *= 0.82;
        pickup.velocity.z *= 0.82;
      }
    }
    return this.state.collectedXpThisStep;
  }

  /** Reads a preallocated collection event produced by the latest update. */
  public getCollectionEvent(index: number): Readonly<PickupCollectionEvent> | undefined {
    if (index < 0 || index >= this.state.collectionEventCount) return undefined;
    return this.collectionEvents[index];
  }

  /** Copies an interpolated render position into a caller-owned object. */
  public getInterpolatedPosition(pickupId: number, alpha: number, output: PickupVector3): boolean {
    const pickup = this.pickups[pickupId];
    if (!pickup?.active) return false;
    const amount = Math.min(1, Math.max(0, alpha));
    output.x = pickup.previousPosition.x + (pickup.position.x - pickup.previousPosition.x) * amount;
    output.y = pickup.previousPosition.y + (pickup.position.y - pickup.previousPosition.y) * amount;
    output.z = pickup.previousPosition.z + (pickup.position.z - pickup.previousPosition.z) * amount;
    return true;
  }

  /** Deactivates every shard and optionally starts a new deterministic RNG stream. */
  public reset(seed = this.initialSeed): void {
    this.randomState = normalizeSeed(seed);
    this.freeIndices.length = 0;
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      if (!pickup) continue;
      resetPickup(pickup, this.groundHeight);
      this.freeIndices.push(index);
    }
    this.state.activeCount = 0;
    this.state.spawnedXpTotal = 0;
    this.state.collectedXpTotal = 0;
    this.state.collectedXpThisStep = 0;
    this.state.collectionEventCount = 0;
  }

  private activate(pickup: PickupState, position: Readonly<PickupVector3>, xpValue: number): void {
    pickup.active = true;
    pickup.xpValue = xpValue;
    pickup.age = 0;
    pickup.spin = this.random() * Math.PI * 2;
    pickup.position.x = position.x;
    pickup.position.y = Math.max(this.groundHeight, position.y + 0.22);
    pickup.position.z = position.z;
    copyVector(pickup.previousPosition, pickup.position);

    const angle = this.random() * Math.PI * 2;
    const horizontalSpeed = 1.2 + this.random() * 2.7;
    pickup.velocity.x = Math.cos(angle) * horizontalSpeed;
    pickup.velocity.y = 2.8 + this.random() * 3.8;
    pickup.velocity.z = Math.sin(angle) * horizontalSpeed;
    this.state.activeCount += 1;
  }

  private collect(pickup: PickupState, onCollect?: PickupCollectionListener): void {
    const xpValue = pickup.xpValue;
    const eventIndex = this.state.collectionEventCount;
    const event = this.collectionEvents[eventIndex];
    if (event) {
      event.pickupId = pickup.id;
      event.xpValue = xpValue;
      this.state.collectionEventCount += 1;
    }
    this.state.collectedXpThisStep += xpValue;
    this.state.collectedXpTotal += xpValue;
    onCollect?.(xpValue, pickup.id);
    pickup.active = false;
    pickup.xpValue = 0;
    this.freeIndices.push(pickup.id);
    this.state.activeCount -= 1;
  }

  private mergeIntoActiveShard(position: Readonly<PickupVector3>, xpValue: number): void {
    let nearest: PickupState | undefined;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;
    for (let index = 0; index < this.pickups.length; index += 1) {
      const pickup = this.pickups[index];
      if (!pickup?.active) continue;
      const dx = pickup.position.x - position.x;
      const dy = pickup.position.y - position.y;
      const dz = pickup.position.z - position.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < nearestDistanceSquared) {
        nearest = pickup;
        nearestDistanceSquared = distanceSquared;
      }
    }
    if (nearest) nearest.xpValue += xpValue;
  }

  /** Mulberry32: compact and stable across browser/desktop JavaScript engines. */
  private random(): number {
    this.randomState = (this.randomState + 0x6d2b79f5) >>> 0;
    let value = this.randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }
}

function createPickup(id: number, groundHeight: number): PickupState {
  return {
    id,
    active: false,
    position: { x: 0, y: groundHeight, z: 0 },
    previousPosition: { x: 0, y: groundHeight, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    xpValue: 0,
    age: 0,
    spin: 0,
  };
}

function resetPickup(pickup: PickupState, groundHeight: number): void {
  pickup.active = false;
  pickup.xpValue = 0;
  pickup.age = 0;
  pickup.spin = 0;
  pickup.position.x = 0;
  pickup.position.y = groundHeight;
  pickup.position.z = 0;
  copyVector(pickup.previousPosition, pickup.position);
  pickup.velocity.x = 0;
  pickup.velocity.y = 0;
  pickup.velocity.z = 0;
}

function copyVector(target: PickupVector3, source: Readonly<PickupVector3>): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}

function limitVelocity(velocity: PickupVector3, maximum: number): void {
  const speedSquared = lengthSquared(velocity);
  const maximumSquared = maximum * maximum;
  if (speedSquared <= maximumSquared) return;
  const scale = maximum / Math.sqrt(speedSquared);
  velocity.x *= scale;
  velocity.y *= scale;
  velocity.z *= scale;
}

function lengthSquared(vector: Readonly<PickupVector3>): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  const safe = Number.isFinite(value) ? Math.floor(value) : minimum;
  return Math.min(maximum, Math.max(minimum, safe));
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}
