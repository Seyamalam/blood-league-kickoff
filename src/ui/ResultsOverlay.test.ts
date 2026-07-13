import { describe, expect, it } from 'vitest';
import { calculateRunGrade, type GameResultStats } from './ResultsOverlay';

const EMPTY_RESULT: GameResultStats = {
  outcome: 'defeat',
  score: 0,
  kills: 0,
  goals: 0,
  timeSeconds: 0,
  level: 1,
  upgrades: [],
};

describe('calculateRunGrade', () => {
  it('awards a capped S grade to a complete dominant victory', () => {
    const grade = calculateRunGrade({
      ...EMPTY_RESULT,
      outcome: 'victory',
      score: 80_000,
      kills: 500,
      goals: 4,
      timeSeconds: 900,
      level: 30,
      upgrades: [{ upgradeId: 'silverBall', stacks: 40 }],
    });

    expect(grade).toEqual({ letter: 'S', label: 'LEGENDARY', score: 100 });
  });

  it('keeps a strong defeat below victory grades while recognizing the run', () => {
    const grade = calculateRunGrade({
      ...EMPTY_RESULT,
      score: 20_000,
      kills: 150,
      goals: 2,
      timeSeconds: 540,
      level: 12,
      upgrades: [{ upgradeId: 'powerKick', stacks: 15 }],
    });

    expect(grade).toEqual({ letter: 'B', label: 'RESOLUTE', score: 70 });
  });

  it('sanitizes invalid and negative values into a stable D grade', () => {
    const grade = calculateRunGrade({
      ...EMPTY_RESULT,
      score: Number.NaN,
      kills: -20,
      goals: Number.POSITIVE_INFINITY,
      timeSeconds: -1,
      level: -4,
      upgrades: [{ upgradeId: 'ghostPass', stacks: -2 }],
    });

    expect(grade).toEqual({ letter: 'D', label: 'FALLEN', score: 0 });
  });
});
