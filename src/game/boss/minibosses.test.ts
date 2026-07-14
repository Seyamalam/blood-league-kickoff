import { describe, expect, it } from 'vitest';
import { damageMiniboss, MINIBOSS_ENCOUNTER_SCHEDULE, spawnMiniboss, updateMiniboss } from './minibosses';

function stepFor(
  initial: ReturnType<typeof spawnMiniboss>,
  seconds: number,
): { state: ReturnType<typeof spawnMiniboss>; events: unknown[] } {
  let state = initial;
  const events: unknown[] = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) {
    const update = updateMiniboss(state, { x: 0, y: 0.9, z: 0 }, 0.1);
    state = update.state;
    events.push(...update.events);
  }
  return { state, events };
}

describe('miniboss encounters', () => {
  it('schedules both encounters before the final wave', () => {
    expect(MINIBOSS_ENCOUNTER_SCHEDULE.map(({ kind, stage }) => ({ kind, stage }))).toEqual([
      { kind: 'crimsonCaptain', stage: 'escalation' },
      { kind: 'graveyardPlaymaker', stage: 'bloodMoon' },
    ]);
  });

  it('telegraphs and charges as the Crimson Captain', () => {
    const boss = spawnMiniboss('crimsonCaptain', 41, { x: 0, y: 1, z: -8 });
    const result = stepFor(boss, 4.5);

    expect(result.events).toContainEqual(expect.objectContaining({ type: 'phaseChanged', to: 'combat' }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'attackTelegraphed' }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'chargeStarted' }));
  });

  it('fires a spread volley as the Graveyard Playmaker', () => {
    const boss = spawnMiniboss('graveyardPlaymaker', 42, { x: 0, y: 1, z: -8 });
    const result = stepFor(boss, 4.2);

    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'bloodVolley', projectileCount: 5 }),
    );
  });

  it('summons reinforcements at health thresholds and enrages below forty percent', () => {
    let boss = spawnMiniboss('crimsonCaptain', 43);
    boss = stepFor(boss, 1).state;
    boss = damageMiniboss(boss, { amount: 27, source: 'other' }).state;
    const update = updateMiniboss(boss, { x: 0, y: 0.9, z: 0 }, 0.1);

    expect(update.events).toContainEqual(
      expect.objectContaining({ type: 'summonFormation', formationId: 'lineBreakers' }),
    );

    boss = { ...update.state, action: 'idle', actionTimer: 0, hitInvulnerability: 0 };
    boss = damageMiniboss(boss, { amount: 10, source: 'other' }).state;
    const enraged = updateMiniboss(boss, { x: 0, y: 0.9, z: 0 }, 0.1);
    expect(enraged.events).toContainEqual(expect.objectContaining({ type: 'phaseChanged', to: 'enraged' }));
  });

  it('takes bonus ball damage and emits defeat once', () => {
    const boss = spawnMiniboss('graveyardPlaymaker', 44);
    const result = damageMiniboss(boss, { amount: 100, source: 'ball' });

    expect(result.state.phase).toBe('defeated');
    expect(result.events.at(-1)).toEqual({ type: 'defeated' });
    expect(damageMiniboss(result.state, { amount: 1, source: 'ball' }).events).toHaveLength(0);
  });
});
