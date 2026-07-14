import { describe, expect, it } from 'vitest';
import {
  isStadiumSelection,
  resolveStadiumVariant,
  STADIUM_VARIANT_IDS,
  STADIUM_VARIANTS,
} from './stadiumVariants';

describe('stadium variants', () => {
  it('provides five visually and architecturally distinct arenas', () => {
    expect(STADIUM_VARIANT_IDS).toHaveLength(5);
    expect(new Set(STADIUM_VARIANT_IDS.map((id) => STADIUM_VARIANTS[id].pitch)).size).toBe(5);
    expect(new Set(STADIUM_VARIANT_IDS.map((id) => STADIUM_VARIANTS[id].architecture)).size).toBe(5);
  });

  it('resolves random selection deterministically from an injected sample', () => {
    expect(resolveStadiumVariant('random', 0).id).toBe(STADIUM_VARIANT_IDS[0]);
    expect(resolveStadiumVariant('random', 0.999).id).toBe(STADIUM_VARIANT_IDS.at(-1));
    expect(resolveStadiumVariant('random', Number.NaN).id).toBe(STADIUM_VARIANT_IDS[0]);
  });

  it('rejects unknown persisted selections', () => {
    expect(isStadiumSelection('emerald-cathedral')).toBe(true);
    expect(isStadiumSelection('random')).toBe(true);
    expect(isStadiumSelection('plain-green')).toBe(false);
  });
});
