import type { EnemyState } from './types';

/**
 * Reusable uniform grid specialized for the bounded arena enemy crowd.
 * Rebuild is O(items + cells); queries only inspect cells intersecting a radius.
 */
export class EnemySpatialGrid {
  private readonly columns: number;
  private readonly rows: number;
  private readonly heads: Int32Array;
  private readonly tails: Int32Array;
  private next: Int32Array;
  private maxRadius = 0;
  private separationResultX = 0;
  private separationResultZ = 0;

  constructor(
    private readonly minX = -22,
    private readonly minZ = -14,
    private readonly maxX = 22,
    private readonly maxZ = 14,
    private readonly cellSize = 2.5,
    initialCapacity = 128,
  ) {
    if (!(cellSize > 0) || !(maxX > minX) || !(maxZ > minZ)) throw new Error('Invalid spatial grid bounds.');
    this.columns = Math.ceil((maxX - minX) / cellSize);
    this.rows = Math.ceil((maxZ - minZ) / cellSize);
    this.heads = new Int32Array(this.columns * this.rows);
    this.tails = new Int32Array(this.columns * this.rows);
    this.next = new Int32Array(Math.max(1, Math.floor(initialCapacity)));
    this.heads.fill(-1);
    this.tails.fill(-1);
    this.next.fill(-1);
  }

  get capacity(): number {
    return this.next.length;
  }

  get separationX(): number {
    return this.separationResultX;
  }

  get separationZ(): number {
    return this.separationResultZ;
  }

  rebuild(enemies: readonly EnemyState[]): void {
    this.ensureCapacity(enemies.length);
    this.heads.fill(-1);
    this.tails.fill(-1);
    this.maxRadius = 0;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index]!;
      this.maxRadius = Math.max(this.maxRadius, enemy.radius);
      this.next[index] = -1;
      const cell = this.cellIndex(enemy.position.x, enemy.position.z);
      const tail = this.tails[cell]!;
      if (tail < 0) this.heads[cell] = index;
      else this.next[tail] = index;
      this.tails[cell] = index;
    }
  }

  hasNearbyCoach(enemies: readonly EnemyState[], enemyIndex: number, radius: number): boolean {
    const enemy = enemies[enemyIndex];
    if (!enemy || radius <= 0) return false;
    const radiusSquared = radius * radius;
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerColumn = this.column(enemy.position.x);
    const centerRow = this.row(enemy.position.z);
    const minColumn = Math.max(0, centerColumn - cellRadius);
    const maxColumn = Math.min(this.columns - 1, centerColumn + cellRadius);
    const minRow = Math.max(0, centerRow - cellRadius);
    const maxRow = Math.min(this.rows - 1, centerRow + cellRadius);
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        let candidateIndex = this.heads[row * this.columns + column]!;
        while (candidateIndex >= 0) {
          const candidate = enemies[candidateIndex]!;
          if (candidate.archetype === 'coach') {
            const dx = candidate.position.x - enemy.position.x;
            const dz = candidate.position.z - enemy.position.z;
            if (dx * dx + dz * dz < radiusSquared) return true;
          }
          candidateIndex = this.next[candidateIndex]!;
        }
      }
    }
    return false;
  }

  /** Stores the exact legacy separation sum in the stable separationX/Z fields. */
  accumulateSeparation(enemies: readonly EnemyState[], enemyIndex: number, padding: number): void {
    this.separationResultX = 0;
    this.separationResultZ = 0;
    const enemy = enemies[enemyIndex];
    if (!enemy) return;
    const searchRadius = enemy.radius + this.maxRadius + Math.max(0, padding);
    const cellRadius = Math.ceil(searchRadius / this.cellSize);
    const centerColumn = this.column(enemy.position.x);
    const centerRow = this.row(enemy.position.z);
    const minColumn = Math.max(0, centerColumn - cellRadius);
    const maxColumn = Math.min(this.columns - 1, centerColumn + cellRadius);
    const minRow = Math.max(0, centerRow - cellRadius);
    const maxRow = Math.min(this.rows - 1, centerRow + cellRadius);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        let candidateIndex = this.heads[row * this.columns + column]!;
        while (candidateIndex >= 0) {
          if (candidateIndex !== enemyIndex) {
            const other = enemies[candidateIndex]!;
            const awayX = enemy.position.x - other.position.x;
            const awayZ = enemy.position.z - other.position.z;
            const separationRadius = enemy.radius + other.radius + padding;
            const distanceSquared = awayX * awayX + awayZ * awayZ;
            if (distanceSquared > 0.0001 && distanceSquared < separationRadius * separationRadius) {
              const neighbourDistance = Math.sqrt(distanceSquared);
              const pressure = (separationRadius - neighbourDistance) / separationRadius;
              this.separationResultX += (awayX / neighbourDistance) * pressure;
              this.separationResultZ += (awayZ / neighbourDistance) * pressure;
            }
          }
          candidateIndex = this.next[candidateIndex]!;
        }
      }
    }
  }

  private ensureCapacity(required: number): void {
    if (required <= this.next.length) return;
    let capacity = this.next.length;
    while (capacity < required) capacity *= 2;
    this.next = new Int32Array(capacity);
    this.next.fill(-1);
  }

  private cellIndex(x: number, z: number): number {
    return this.row(z) * this.columns + this.column(x);
  }

  private column(x: number): number {
    return Math.max(
      0,
      Math.min(this.columns - 1, Math.floor((clamp(x, this.minX, this.maxX) - this.minX) / this.cellSize)),
    );
  }

  private row(z: number): number {
    return Math.max(
      0,
      Math.min(this.rows - 1, Math.floor((clamp(z, this.minZ, this.maxZ) - this.minZ) / this.cellSize)),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
