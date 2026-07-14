import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/gameState';
import { createPitchEventDirectorState, updatePitchEventDirector } from './pitchEvents';

describe('pitch event director', () => {
  it('fires an authored event once when its time and stage are eligible', () => {
    const game = createGameState();
    game.phase = 'playing';
    game.elapsed = 60;
    const director = createPitchEventDirectorState();

    const event = updatePitchEventDirector(director, game, 'firstHalf');

    expect(event).toMatchObject({
      type: 'pitchEventTriggered',
      eventId: 'firstPress',
      announcement: 'THE BACK LINE ADVANCES',
    });
    expect(event?.formation.enemies).toHaveLength(5);
    expect(updatePitchEventDirector(director, game, 'firstHalf')).toBeUndefined();
  });

  it('keeps an event pending while the pitch is over its population budget', () => {
    const game = createGameState();
    game.phase = 'playing';
    game.elapsed = 60;
    game.enemies = Array.from({ length: 53 }, (_, id) => ({ id })) as never;
    const director = createPitchEventDirectorState();

    expect(updatePitchEventDirector(director, game, 'firstHalf')).toBeUndefined();
    expect(director.triggered.size).toBe(0);
  });
});
