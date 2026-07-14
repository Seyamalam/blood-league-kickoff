import type { Vec3 } from '../simulation/types';
import type { SecondaryDamageHit, SecondaryDamageSource } from './types';
import type {
  FootballArmoryEvent,
  FootballArmoryModifiers,
  FootballArmoryStepInput,
  FootballArmoryStepResult,
  FootballArmoryTarget,
  PenaltyMineRenderState,
} from './footballArmoryTypes';

const MINE_POOL_SIZE = 6;
const HEADER_POOL_SIZE = 3;
const HIT_CAP = 96;
const EVENT_CAP = 96;
const MINE_ARM_SECONDS = 0.45;
const MINE_LIFETIME = 9;

interface MineInternal extends PenaltyMineRenderState {
  age: number;
  damage: number;
}

interface HeaderInternal {
  active: boolean;
  position: Vec3;
  direction: Vec3;
  damage: number;
  radius: number;
  knockback: number;
}

/** Fixed-pool simulation for six football-themed automatic and triggered weapon paths. */
export class FootballArmorySystem {
  private readonly mines: MineInternal[] = Array.from({ length: MINE_POOL_SIZE }, () => ({
    active: false,
    armed: false,
    position: { x: 0, y: 0, z: 0 },
    radius: 0,
    age: 0,
    damage: 0,
  }));
  private readonly headers: HeaderInternal[] = Array.from({ length: HEADER_POOL_SIZE }, () => ({
    active: false,
    position: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    damage: 0,
    radius: 0,
    knockback: 0,
  }));
  private readonly hits: SecondaryDamageHit[] = [];
  private readonly events: FootballArmoryEvent[] = [];
  private readonly result: FootballArmoryStepResult = {
    hits: this.hits,
    events: this.events,
    penaltyMines: this.mines,
  };
  private mineCursor = 0;
  private headerCursor = 0;
  private cornerCooldown = 0;
  private redCardCooldown = 0;
  private teammateCooldown = 0;
  private mineCooldown = 0;
  private cycloneCooldown = 0;
  private placementSequence = 0;

  reset(): void {
    this.hits.length = 0;
    this.events.length = 0;
    this.mineCursor = 0;
    this.headerCursor = 0;
    this.cornerCooldown = 0;
    this.redCardCooldown = 0;
    this.teammateCooldown = 0;
    this.mineCooldown = 0;
    this.cycloneCooldown = 0;
    this.placementSequence = 0;
    for (const mine of this.mines) mine.active = false;
    for (const header of this.headers) header.active = false;
  }

  /** Queue a straight spectral header, normally from a charged-kick release. */
  triggerHeader(
    position: Readonly<Vec3>,
    direction: Readonly<Vec3>,
    modifiers: FootballArmoryModifiers,
  ): boolean {
    const damage = bounded(modifiers.headerCannonDamage, 0, 120);
    const directionLength = Math.hypot(direction.x, direction.z);
    if (damage <= 0 || directionLength < 0.001) return false;
    const header = this.headers[this.headerCursor]!;
    this.headerCursor = (this.headerCursor + 1) % this.headers.length;
    header.active = true;
    copy(header.position, position);
    header.direction.x = direction.x / directionLength;
    header.direction.y = 0;
    header.direction.z = direction.z / directionLength;
    header.damage = damage;
    header.radius = 0.8 + bounded(modifiers.headerCannonRadius, 0, 4);
    header.knockback = bounded(modifiers.headerCannonKnockback, 0, 20);
    return true;
  }

  step(input: Readonly<FootballArmoryStepInput>): FootballArmoryStepResult {
    this.hits.length = 0;
    this.events.length = 0;
    const dt = bounded(input.dt, 0, 0.1);
    this.stepHeaders(input.targets);
    this.stepCornerStorm(dt, input);
    this.stepRedCard(dt, input);
    this.stepTeammates(dt, input);
    this.stepMines(dt, input);
    this.stepCyclone(dt, input);
    return this.result;
  }

  private stepHeaders(targets: readonly FootballArmoryTarget[]): void {
    for (const header of this.headers) {
      if (!header.active) continue;
      header.active = false;
      push(this.events, {
        type: 'header-fired',
        position: header.position,
        direction: header.direction,
        radius: header.radius,
      });
      for (const target of targets) {
        const dx = target.position.x - header.position.x;
        const dz = target.position.z - header.position.z;
        const forward = dx * header.direction.x + dz * header.direction.z;
        if (forward < 0 || forward > 12) continue;
        const lateral = Math.abs(dx * header.direction.z - dz * header.direction.x);
        if (lateral > header.radius + target.radius) continue;
        this.hit(target, header.damage, 'header-cannon', target.position);
        push(this.events, {
          type: 'header-knockback',
          targetId: target.id,
          force: {
            x: header.direction.x * header.knockback,
            y: 0,
            z: header.direction.z * header.knockback,
          },
        });
      }
    }
  }

  private stepCornerStorm(dt: number, input: Readonly<FootballArmoryStepInput>): void {
    const strikes = Math.floor(bounded(input.modifiers.cornerStormStrikes, 0, 8));
    if (strikes <= 0 || input.modifiers.cornerStormDamage <= 0) return;
    this.cornerCooldown -= dt;
    if (this.cornerCooldown > 0) return;
    this.cornerCooldown += 4.8 * bounded(input.modifiers.cornerStormInterval, 0.2, 2);
    for (const [strikeIndex, target] of nearestTargets(
      input.playerPosition,
      input.targets,
      strikes,
    ).entries()) {
      this.hit(target, input.modifiers.cornerStormDamage, 'corner-storm', target.position);
      push(this.events, {
        type: 'corner-strike',
        targetId: target.id,
        position: target.position,
        strikeIndex,
      });
    }
  }

  private stepRedCard(dt: number, input: Readonly<FootballArmoryStepInput>): void {
    if (input.modifiers.redCardDamage <= 0 || input.targets.length === 0) return;
    this.redCardCooldown -= dt;
    if (this.redCardCooldown > 0) return;
    this.redCardCooldown += 5;
    const target = [...input.targets].sort(
      (a, b) => (a.healthRatio ?? 1) - (b.healthRatio ?? 1) || a.id - b.id,
    )[0]!;
    const executed =
      target.healthRatio !== undefined &&
      target.healthRatio <= bounded(input.modifiers.redCardExecuteThreshold, 0, 0.35);
    this.hit(target, executed ? 10_000 : input.modifiers.redCardDamage, 'red-card', target.position);
    push(this.events, {
      type: 'red-card',
      targetId: target.id,
      position: target.position,
      executed,
      stunDuration: bounded(input.modifiers.redCardStunDuration, 0, 3),
    });
  }

  private stepTeammates(dt: number, input: Readonly<FootballArmoryStepInput>): void {
    const count = Math.floor(bounded(input.modifiers.spectralTeammateCount, 0, 5));
    if (count <= 0 || input.modifiers.spectralTeammateDamage <= 0) return;
    this.teammateCooldown -= dt;
    if (this.teammateCooldown > 0) return;
    this.teammateCooldown += 1.7 * bounded(input.modifiers.spectralTeammateInterval, 0.2, 2);
    for (const [teammateIndex, target] of nearestTargets(
      input.playerPosition,
      input.targets,
      count,
    ).entries()) {
      this.hit(target, input.modifiers.spectralTeammateDamage, 'spectral-teammate', target.position);
      push(this.events, {
        type: 'teammate-volley',
        targetId: target.id,
        position: target.position,
        teammateIndex,
      });
    }
  }

  private stepMines(dt: number, input: Readonly<FootballArmoryStepInput>): void {
    const count = Math.floor(bounded(input.modifiers.penaltyMineCount, 0, MINE_POOL_SIZE));
    if (count > 0 && input.modifiers.penaltyMineDamage > 0) {
      this.mineCooldown -= dt;
      if (this.mineCooldown <= 0) {
        this.mineCooldown += 3.6;
        const minesToPlant = Math.min(2, count);
        for (let index = 0; index < minesToPlant; index += 1) this.plantMine(input, index);
      }
    }
    for (let mineIndex = 0; mineIndex < this.mines.length; mineIndex += 1) {
      const mine = this.mines[mineIndex]!;
      if (!mine.active) continue;
      mine.age += dt;
      mine.armed = mine.age >= MINE_ARM_SECONDS;
      if (mine.age >= MINE_LIFETIME) {
        mine.active = false;
        continue;
      }
      if (!mine.armed) continue;
      const triggered = input.targets.some((target) => overlaps(mine.position, mine.radius, target));
      if (!triggered) continue;
      mine.active = false;
      push(this.events, {
        type: 'penalty-mine-detonated',
        mineIndex,
        position: mine.position,
        radius: mine.radius,
      });
      for (const target of input.targets) {
        if (overlaps(mine.position, mine.radius, target)) {
          this.hit(target, mine.damage, 'penalty-mine', mine.position);
        }
      }
    }
  }

  private plantMine(input: Readonly<FootballArmoryStepInput>, offset: number): void {
    const mineIndex = this.mineCursor;
    const mine = this.mines[mineIndex]!;
    this.mineCursor = (this.mineCursor + 1) % this.mines.length;
    const angle = (this.placementSequence++ * 2.399963 + offset * Math.PI) % (Math.PI * 2);
    mine.active = true;
    mine.armed = false;
    mine.age = 0;
    mine.damage = bounded(input.modifiers.penaltyMineDamage, 0, 140);
    mine.radius = 1 + bounded(input.modifiers.penaltyMineRadius, 0, 3);
    mine.position.x = input.playerPosition.x + Math.cos(angle) * 2.4;
    mine.position.y = input.playerPosition.y;
    mine.position.z = input.playerPosition.z + Math.sin(angle) * 2.4;
    push(this.events, {
      type: 'penalty-mine-planted',
      mineIndex,
      position: mine.position,
      radius: mine.radius,
    });
  }

  private stepCyclone(dt: number, input: Readonly<FootballArmoryStepInput>): void {
    if (input.modifiers.bootCycloneDamage <= 0) return;
    this.cycloneCooldown -= dt;
    if (this.cycloneCooldown > 0) return;
    this.cycloneCooldown += 1.25 * bounded(input.modifiers.bootCycloneInterval, 0.2, 2);
    const radius = 1.6 + bounded(input.modifiers.bootCycloneRadius, 0, 3);
    push(this.events, { type: 'boot-cyclone', position: input.playerPosition, radius });
    for (const target of input.targets) {
      if (overlaps(input.playerPosition, radius, target)) {
        this.hit(target, input.modifiers.bootCycloneDamage, 'boot-cyclone', input.playerPosition);
      }
    }
  }

  private hit(
    target: FootballArmoryTarget,
    damage: number,
    source: SecondaryDamageSource,
    position: Readonly<Vec3>,
  ): void {
    if (this.hits.length >= HIT_CAP) return;
    this.hits.push({ targetId: target.id, damage: bounded(damage, 0, 10_000), source, position });
  }
}

function nearestTargets(
  origin: Readonly<Vec3>,
  targets: readonly FootballArmoryTarget[],
  count: number,
): FootballArmoryTarget[] {
  return [...targets]
    .sort((a, b) => distanceSquared(origin, a.position) - distanceSquared(origin, b.position) || a.id - b.id)
    .slice(0, count);
}

function overlaps(position: Readonly<Vec3>, radius: number, target: FootballArmoryTarget): boolean {
  return distanceSquared(position, target.position) <= (radius + target.radius) ** 2;
}

function distanceSquared(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function copy(target: Vec3, source: Readonly<Vec3>): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}

function bounded(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function push(events: FootballArmoryEvent[], event: FootballArmoryEvent): void {
  if (events.length < EVENT_CAP) events.push(event);
}
