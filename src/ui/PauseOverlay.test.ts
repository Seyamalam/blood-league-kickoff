import { describe, expect, it } from 'vitest';
import type { RunTelemetrySnapshot } from '../game/stats';
import { createPauseTelemetryView } from './PauseOverlay';

const SNAPSHOT: RunTelemetrySnapshot = {
  damageByCategory: {
    'primary-ball': 600,
    'secondary-weapons': 250,
    dash: 50,
    'holy-zone': 25,
    ultimate: 75,
  },
  totalDamage: 1_000,
  healing: 123.6,
  damageBlocked: 90,
  damageTaken: 400,
  kicks: 42,
  dashes: 17,
  perfectVolleys: 8,
  goals: 3,
};

describe('pause telemetry view', () => {
  it('builds summary, complete damage categories, and match actions', () => {
    const view = createPauseTelemetryView(SNAPSHOT);

    expect(view.summary.map((item) => item.id)).toEqual([
      'total-damage',
      'damage-taken',
      'healing',
      'damage-blocked',
    ]);
    expect(view.damage.map((item) => item.id)).toEqual([
      'primary-ball',
      'secondary-weapons',
      'dash',
      'holy-zone',
      'ultimate',
    ]);
    expect(view.actions.map((item) => item.id)).toEqual(['kicks', 'dashes', 'perfect-volleys', 'goals']);
    expect(view.summary[0]).toMatchObject({ value: 1_000, formattedValue: '1,000', icon: 'stats' });
    expect(view.actions[3]).toMatchObject({ value: 3, formattedValue: '3', icon: 'trophy' });
  });

  it('calculates stable damage-bar shares against total output', () => {
    const view = createPauseTelemetryView(SNAPSHOT);

    expect(view.damage.map((item) => item.share)).toEqual([0.6, 0.25, 0.05, 0.025, 0.075]);
  });

  it('sanitizes invalid and negative telemetry for safe DOM presentation', () => {
    const view = createPauseTelemetryView({
      ...SNAPSHOT,
      totalDamage: Number.NaN,
      healing: -10,
      kicks: Number.POSITIVE_INFINITY,
      damageByCategory: { ...SNAPSHOT.damageByCategory, 'primary-ball': -200 },
    });

    expect(view.summary[0]?.value).toBe(0);
    expect(view.summary[2]?.formattedValue).toBe('0');
    expect(view.actions[0]?.value).toBe(0);
    expect(view.damage[0]).toMatchObject({ value: 0, share: 0 });
    expect(view.damage.every((item) => item.share === 0)).toBe(true);
  });
});
