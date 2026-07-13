export interface PickupVector3 {
  x: number;
  y: number;
  z: number;
}

/** Mutable preallocated shard record, suitable for direct renderer synchronization. */
export interface PickupState {
  readonly id: number;
  active: boolean;
  position: PickupVector3;
  previousPosition: PickupVector3;
  velocity: PickupVector3;
  xpValue: number;
  age: number;
  spin: number;
}

export interface PickupCollectionEvent {
  pickupId: number;
  xpValue: number;
}

export interface PickupSystemState {
  readonly capacity: number;
  readonly pickups: readonly PickupState[];
  activeCount: number;
  spawnedXpTotal: number;
  collectedXpTotal: number;
  collectedXpThisStep: number;
  collectionEventCount: number;
}

export interface BloodShardSystemOptions {
  capacity?: number;
  seed?: number;
  magnetRadius?: number;
  collectionRadius?: number;
  magnetAcceleration?: number;
  maxMagnetSpeed?: number;
  magnetDelay?: number;
  groundHeight?: number;
}

/** Callback arguments are primitives; the simulation allocates no event objects per step. */
export type PickupCollectionListener = (xpValue: number, pickupId: number) => void;
