import { describe, expect, it } from 'vitest';
import { ReplayHighlightBuffer } from './ReplayHighlightBuffer';

describe('ReplayHighlightBuffer', () => {
  it('keeps a bounded immutable history', () => {
    const buffer = new ReplayHighlightBuffer(2, () => 42);
    buffer.record({ kind: 'kickoff', matchTime: 0, label: 'Kickoff' });
    const goal = buffer.record({
      kind: 'goal',
      matchTime: 31,
      label: '  Moonshot  ',
      focus: { x: 1, y: 2, z: 3 },
    });
    buffer.record({ kind: 'elite-kill', matchTime: 36, label: 'Captain down' });

    expect(buffer.size).toBe(2);
    expect(buffer.all().map((item) => item.kind)).toEqual(['goal', 'elite-kill']);
    expect(goal).toMatchObject({ label: 'Moonshot', importance: 1, recordedAt: 42 });
    expect(Object.isFrozen(goal.focus)).toBe(true);
  });

  it('ranks importance before recency and returns newest first for recent', () => {
    const buffer = new ReplayHighlightBuffer();
    buffer.record({ kind: 'goal', matchTime: 10, label: 'First goal' });
    buffer.record({ kind: 'elite-kill', matchTime: 20, label: 'Elite', importance: 0.6 });
    buffer.record({ kind: 'boss-defeated', matchTime: 30, label: 'Final save' });

    expect(buffer.recent(2).map((item) => item.label)).toEqual(['Final save', 'Elite']);
    expect(buffer.best(2).map((item) => item.label)).toEqual(['Final save', 'First goal']);
  });

  it('sanitizes unsafe numbers and can reset between runs', () => {
    const buffer = new ReplayHighlightBuffer();
    const item = buffer.record({
      kind: 'perfect-volley',
      matchTime: Number.NaN,
      label: 'Volley',
      importance: 7,
      focus: { x: Number.POSITIVE_INFINITY, y: 1, z: 2 },
    });
    expect(item).toMatchObject({ matchTime: 0, importance: 1, focus: { x: 0, y: 1, z: 2 } });
    buffer.clear();
    expect(buffer.all()).toEqual([]);
  });
});
