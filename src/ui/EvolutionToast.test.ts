import { describe, expect, it } from 'vitest';
import { EVOLUTION_DEFINITIONS, EVOLUTION_IDS, type EvolutionUnlockEvent } from '../game/progression';
import { EVOLUTION_ICON_URLS } from './progressionIcons';
import { createEvolutionToastView } from './EvolutionToast';

describe('createEvolutionToastView', () => {
  it.each(EVOLUTION_IDS)('maps %s to its visible copy and unique icon', (evolutionId) => {
    const definition = EVOLUTION_DEFINITIONS[evolutionId];
    const event: EvolutionUnlockEvent = {
      type: 'evolution-unlocked',
      evolutionId,
      definition,
    };

    expect(createEvolutionToastView(event)).toEqual({
      iconUrl: EVOLUTION_ICON_URLS[evolutionId],
      name: definition.name,
      description: definition.description,
    });
  });
});
