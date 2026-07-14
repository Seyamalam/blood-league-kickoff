import { describe, expect, it } from 'vitest';
import { SeededRandom, deriveSeed, hashSeed } from './seededRandom';

describe('SeededRandom', () => {
  it('replays the same sequence for numeric and text seeds', () => {
    const first = new SeededRandom(42);
    const second = new SeededRandom(42);
    expect(Array.from({ length: 8 }, first.next)).toEqual(Array.from({ length: 8 }, second.next));

    const textA = new SeededRandom('daily:2026-07-14');
    const textB = new SeededRandom('daily:2026-07-14');
    expect(textA.next()).toBe(textB.next());
  });

  it('keeps named streams independent from unrelated draw order', () => {
    const root = new SeededRandom(99);
    const spawn = root.fork('spawn');
    root.fork('cosmetic').next();
    root.fork('cosmetic').next();
    expect(spawn.next()).toBe(new SeededRandom(99).fork('spawn').next());
    expect(deriveSeed(99, 'spawn')).not.toBe(deriveSeed(99, 'upgrades'));
  });

  it('restores snapshots and provides bounded helpers', () => {
    const random = new SeededRandom(7);
    random.next();
    const snapshot = random.snapshot();
    const expected = random.next();
    random.restore(snapshot);
    expect(random.next()).toBe(expected);
    expect(random.integer(3, 3)).toBe(3);
    expect(random.range(5, 2)).toBeGreaterThanOrEqual(2);
    expect(random.pick([])).toBeUndefined();
  });

  it('hashes labels stably and rejects a snapshot from another root', () => {
    expect(hashSeed('Blood League')).toBe(hashSeed('Blood League'));
    const random = new SeededRandom(1);
    expect(() => random.restore(new SeededRandom(2).snapshot())).toThrow(/another seed/i);
  });
});
