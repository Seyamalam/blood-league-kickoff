import { describe, expect, it } from 'vitest';
import { createRunDescriptor, createRunRandomStreams, dailyRunSeed, weeklyRunSeed } from './runDescriptor';

describe('run descriptors', () => {
  it('creates reproducible named streams from a shareable custom seed', () => {
    const descriptorA = createRunDescriptor({ seed: 'HUNTRIX', mode: 'custom', rulesetVersion: 'alpha.7' });
    const descriptorB = createRunDescriptor({ seed: 'HUNTRIX', mode: 'custom', rulesetVersion: 'alpha.7' });
    const streamsA = createRunRandomStreams(descriptorA);
    const streamsB = createRunRandomStreams(descriptorB);
    expect(descriptorA).toEqual(descriptorB);
    expect(streamsA.spawn.next()).toBe(streamsB.spawn.next());
    expect(streamsA.upgrades.next()).toBe(streamsB.upgrades.next());
    expect(streamsA.spawn.next()).not.toBe(streamsA.upgrades.next());
  });

  it('uses UTC calendar days for daily challenges', () => {
    const morning = dailyRunSeed(new Date('2026-07-14T00:01:00.000Z'));
    const evening = dailyRunSeed(new Date('2026-07-14T23:59:00.000Z'));
    expect(morning).toEqual(evening);
    expect(morning.challengeKey).toBe('daily:2026-07-14');
    expect(dailyRunSeed(new Date('2026-07-15T00:00:00.000Z')).seed).not.toBe(morning.seed);
  });

  it('handles ISO week-year boundaries', () => {
    expect(weeklyRunSeed(new Date('2026-12-31T12:00:00.000Z')).challengeKey).toBe('weekly:2026-W53');
    expect(weeklyRunSeed(new Date('2027-01-01T12:00:00.000Z')).challengeKey).toBe('weekly:2026-W53');
    expect(weeklyRunSeed(new Date('2027-01-04T00:00:00.000Z')).challengeKey).toBe('weekly:2027-W01');
  });

  it('lets scheduled modes override supplied seeds and versions alter streams', () => {
    const date = new Date('2026-07-14T00:00:00.000Z');
    const daily = createRunDescriptor({ mode: 'daily', now: date, seed: 7 });
    expect(daily.challengeKey).toBe('daily:2026-07-14');
    expect(daily.seed).toBe(dailyRunSeed(date).seed);
    const first = createRunRandomStreams({ ...daily, rulesetVersion: '1' }).spawn.next();
    const changed = createRunRandomStreams({ ...daily, rulesetVersion: '2' }).spawn.next();
    expect(first).not.toBe(changed);
  });

  it('supports deterministic entropy injection for normal runs', () => {
    expect(createRunDescriptor({ entropy: () => 0.25 }).seed).toBe(1_073_741_824);
  });
});
