import { describe, expect, it } from 'vitest';
import { calculateRunAccountXp } from './runRewards';
import type { CompletedRun } from './types';

const RUN: CompletedRun = {
  id: 'run-1',
  completedAt: '2026-07-14T10:00:00.000Z',
  buildVersion: '0.9.0-alpha.1',
  characterId: 'maestro',
  outcome: 'defeat',
  score: 0,
  kills: 0,
  goals: 0,
  timeSeconds: 10,
  level: 1,
  upgradeIds: [],
  evolutionIds: [],
};

describe('run rewards', () => {
  it('calculates the documented participation, performance, and victory rewards', () => {
    expect(
      calculateRunAccountXp({
        ...RUN,
        outcome: 'victory',
        score: 10_000,
        kills: 30,
        goals: 2,
      }),
    ).toBe(445);
  });

  it('caps farming inputs and sanitizes invalid values', () => {
    expect(
      calculateRunAccountXp({
        ...RUN,
        score: Number.POSITIVE_INFINITY,
        kills: 5_000,
        goals: 500,
      }),
    ).toBe(25 + 200 + 20 * 60);
    expect(calculateRunAccountXp({ ...RUN, score: -1, kills: Number.NaN, goals: -5 })).toBe(25);
  });
});
