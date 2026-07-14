import { describe, expect, it } from 'vitest';
import { UPGRADE_IDS } from '../game/progression';
import { createDefaultProfile } from '../profile';
import { createCodexViewModel } from './CareerOverlay';

describe('career codex', () => {
  it('contains all major discovery categories and keeps unseen content mysterious', () => {
    const entries = createCodexViewModel(createDefaultProfile());
    expect(new Set(entries.map((entry) => entry.category))).toEqual(
      new Set(['character', 'weapon', 'evolution', 'enemy', 'curse']),
    );
    expect(entries.filter((entry) => entry.category === 'weapon')).toHaveLength(UPGRADE_IDS.length);
    expect(entries.find((entry) => entry.id === 'maestro')).toMatchObject({
      unlocked: true,
      discovered: true,
    });
    expect(entries.find((entry) => entry.id === 'redCard')).toMatchObject({
      unlocked: false,
      discovered: false,
    });
  });

  it('marks armory and evolution entries discovered from saved run history', () => {
    const profile = createDefaultProfile();
    profile.recentRuns = [
      {
        id: 'codex-run',
        completedAt: profile.createdAt,
        buildVersion: 'test',
        characterId: 'maestro',
        outcome: 'defeat',
        score: 1,
        kills: 1,
        goals: 0,
        timeSeconds: 60,
        level: 3,
        upgradeIds: ['silverBall'],
        evolutionIds: ['moonBreaker'],
        accountXpEarned: 1,
        masteryXpEarned: 1,
      },
    ];
    const entries = createCodexViewModel(profile);
    expect(entries.find((entry) => entry.id === 'silverBall')?.discovered).toBe(true);
    expect(entries.find((entry) => entry.id === 'moonBreaker')?.discovered).toBe(true);
  });
});
