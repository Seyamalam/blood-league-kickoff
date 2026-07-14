import { describe, expect, it } from 'vitest';
import { RunTelemetry } from './RunTelemetry';

describe('RunTelemetry', () => {
  it('records an immutable combat breakdown and rejects invalid negative values', () => {
    const telemetry = new RunTelemetry();
    telemetry.recordDamage('primary-ball', 24);
    telemetry.recordDamage('secondary-weapons', 11);
    telemetry.recordDamage('dash', -4);
    telemetry.recordHealing(7);
    telemetry.recordBlocked(12);
    telemetry.recordDamageTaken(8);
    telemetry.recordKick();
    telemetry.recordDash();
    telemetry.recordPerfectVolley();
    telemetry.recordGoal();

    expect(telemetry.snapshot()).toEqual({
      damageByCategory: {
        'primary-ball': 24,
        'secondary-weapons': 11,
        dash: 0,
        'holy-zone': 0,
        ultimate: 0,
      },
      totalDamage: 35,
      healing: 7,
      damageBlocked: 12,
      damageTaken: 8,
      kicks: 1,
      dashes: 1,
      perfectVolleys: 1,
      goals: 1,
    });
  });

  it('resets every metric between runs', () => {
    const telemetry = new RunTelemetry();
    telemetry.recordDamage('ultimate', 99);
    telemetry.recordKick();
    telemetry.reset();
    expect(telemetry.snapshot().totalDamage).toBe(0);
    expect(telemetry.snapshot().kicks).toBe(0);
  });
});
