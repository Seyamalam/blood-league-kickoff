import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../characters';
import { ELITE_MODIFIER_DEFINITIONS } from '../encounters';
import { CURSE_IDS } from '../progression';
import {
  BALANCE_RUN_DURATION,
  RECOMMENDED_CHARACTER_BUILDS,
  auditBuildContentCoverage,
  auditCharacterBalance,
  auditEncounterBalance,
  simulateBalanceRun,
} from './runBalanceSimulator';

describe('deterministic full-run balance simulator', () => {
  it('covers all six characters with complete authored build routes', () => {
    expect(Object.keys(RECOMMENDED_CHARACTER_BUILDS)).toEqual(CHARACTER_IDS);
    for (const path of Object.values(RECOMMENDED_CHARACTER_BUILDS)) {
      expect(path).toHaveLength(12);
      expect(new Set(path).size).toBe(12);
    }
  });

  it('collectively exercises every weapon, passive, and evolution', () => {
    expect(auditBuildContentCoverage()).toMatchObject({
      missingUpgrades: [],
      missingEvolutions: [],
    });
  });

  it('is deterministic for a replay seed', () => {
    const options = { characterId: 'maestro' as const, seed: 42417 };
    expect(simulateBalanceRun(options)).toEqual(simulateBalanceRun(options));
  });

  it('models a complete nine-minute run with both minibosses and final boss pressure', () => {
    for (const characterId of CHARACTER_IDS) {
      const report = simulateBalanceRun({ characterId, seed: 42417 });
      expect(report.duration).toBe(BALANCE_RUN_DURATION);
      expect(report.crimsonCaptainDefeated).toBe(true);
      expect(report.graveyardPlaymakerDefeated).toBe(true);
      expect(report.goalkeeperDamage).toBeGreaterThan(0);
      expect(report.estimatedGoals).toBeGreaterThanOrEqual(5);
    }
  });

  it('keeps standard character power inside the regression budget', () => {
    const audit = auditCharacterBalance();
    expect(audit.reports).toHaveLength(18);
    expect(audit.spreadRatio).toBeLessThanOrEqual(0.35);
  });

  it('exercises every curse as a measurable risk/reward contract', () => {
    const standard = simulateBalanceRun({ characterId: 'finisher', seed: 7 });
    for (const curseId of CURSE_IDS) {
      const cursed = simulateBalanceRun({ characterId: 'finisher', seed: 7, curseIds: [curseId] });
      expect(cursed).not.toEqual(standard);
      expect(
        cursed.pressureRating > standard.pressureRating ||
          cursed.effectiveHealth !== standard.effectiveHealth,
      ).toBe(true);
      expect(cursed.estimatedScore).toBeGreaterThan(0);
    }
  });

  it('sanitizes invalid duration without destabilizing reports', () => {
    expect(simulateBalanceRun({ characterId: 'guardian', seed: 1, duration: Number.NaN }).duration).toBe(540);
    expect(simulateBalanceRun({ characterId: 'guardian', seed: 1, duration: 1 }).duration).toBe(60);
  });

  it('audits every elite, both minibosses, and all goalkeeper phases', () => {
    const reports = auditEncounterBalance();
    for (const eliteId of Object.keys(ELITE_MODIFIER_DEFINITIONS)) {
      expect(reports.some((report) => report.id === eliteId)).toBe(true);
    }
    expect(reports.map((report) => report.id)).toEqual(
      expect.arrayContaining([
        'crimsonCaptain',
        'graveyardPlaymaker',
        'goalkeeper-guarding',
        'goalkeeper-bloodRush',
        'goalkeeper-desperation',
      ]),
    );
    expect(reports.every((report) => report.targetTimeToDefeat > 0 && report.pressure > 0)).toBe(true);
  });
});
