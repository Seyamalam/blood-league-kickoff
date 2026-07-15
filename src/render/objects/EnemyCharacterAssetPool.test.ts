import { describe, expect, it } from 'vitest';
import type { EnemyArchetype } from '../../game/simulation/types';
import { ENEMY_VISUAL_IDENTITIES } from './EnemyCharacterVisual';
import { enemyImportedCharacterBudget, enemyImportedCharacterTint } from './EnemyCharacterAssetPool';

describe('enemy imported-character budget', () => {
  it('bounds real skinned models by quality', () => {
    expect(enemyImportedCharacterBudget('performance')).toBe(8);
    expect(enemyImportedCharacterBudget('balanced')).toBe(12);
    expect(enemyImportedCharacterBudget('quality')).toBe(16);
  });

  it('gives every imported archetype a stable identity tint', () => {
    const archetypes = Object.keys(ENEMY_VISUAL_IDENTITIES) as EnemyArchetype[];
    const colors = archetypes.map(enemyImportedCharacterTint);
    expect(colors.every((color) => Number.isInteger(color) && color > 0)).toBe(true);
    expect(new Set(colors).size).toBe(archetypes.length);
  });
});
