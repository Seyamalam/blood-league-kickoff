export type DamageCategory = 'primary-ball' | 'secondary-weapons' | 'dash' | 'holy-zone' | 'ultimate';

export interface RunTelemetrySnapshot {
  readonly damageByCategory: Readonly<Record<DamageCategory, number>>;
  readonly totalDamage: number;
  readonly healing: number;
  readonly damageBlocked: number;
  readonly damageTaken: number;
  readonly kicks: number;
  readonly dashes: number;
  readonly perfectVolleys: number;
  readonly goals: number;
}

const DAMAGE_CATEGORIES: readonly DamageCategory[] = [
  'primary-ball',
  'secondary-weapons',
  'dash',
  'holy-zone',
  'ultimate',
];

/** Mutable per-run metrics with bounded, sanitized recording methods. */
export class RunTelemetry {
  private readonly damage = emptyDamage();
  private healed = 0;
  private blocked = 0;
  private taken = 0;
  private kickCount = 0;
  private dashCount = 0;
  private volleyCount = 0;
  private goalCount = 0;

  public recordDamage(category: DamageCategory, amount: number): void {
    this.damage[category] += positive(amount);
  }

  public recordHealing(amount: number): void {
    this.healed += positive(amount);
  }

  public recordBlocked(amount: number): void {
    this.blocked += positive(amount);
  }

  public recordDamageTaken(amount: number): void {
    this.taken += positive(amount);
  }

  public recordKick(): void {
    this.kickCount += 1;
  }

  public recordDash(): void {
    this.dashCount += 1;
  }

  public recordPerfectVolley(): void {
    this.volleyCount += 1;
  }

  public recordGoal(): void {
    this.goalCount += 1;
  }

  public reset(): void {
    for (const category of DAMAGE_CATEGORIES) this.damage[category] = 0;
    this.healed = 0;
    this.blocked = 0;
    this.taken = 0;
    this.kickCount = 0;
    this.dashCount = 0;
    this.volleyCount = 0;
    this.goalCount = 0;
  }

  public snapshot(): RunTelemetrySnapshot {
    const damageByCategory = Object.freeze({ ...this.damage });
    return Object.freeze({
      damageByCategory,
      totalDamage: DAMAGE_CATEGORIES.reduce((total, category) => total + damageByCategory[category], 0),
      healing: this.healed,
      damageBlocked: this.blocked,
      damageTaken: this.taken,
      kicks: this.kickCount,
      dashes: this.dashCount,
      perfectVolleys: this.volleyCount,
      goals: this.goalCount,
    });
  }
}

function emptyDamage(): Record<DamageCategory, number> {
  return {
    'primary-ball': 0,
    'secondary-weapons': 0,
    dash: 0,
    'holy-zone': 0,
    ultimate: 0,
  };
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
