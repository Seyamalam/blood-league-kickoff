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

  it('paces overdue authored formations instead of spawning them in consecutive frames', () => {
    const game = createGameState();
    game.phase = 'playing';
    game.elapsed = 375;
    const director = createPitchEventDirectorState();

    expect(updatePitchEventDirector(director, game, 'bloodMoon')?.eventId).toBe('cornerCurse');
    expect(updatePitchEventDirector(director, game, 'bloodMoon')).toBeUndefined();
    game.elapsed += 10;
    expect(updatePitchEventDirector(director, game, 'bloodMoon')?.eventId).toBe('wideOverload');
  });

  it('uses the enlarged pitch width for a late-match two-wing overload', () => {
    const game = createGameState();
    game.phase = 'playing';
    game.elapsed = 375;
    const director = createPitchEventDirectorState();
    director.triggered.add('firstPress');
    director.triggered.add('boxAmbush');
    director.triggered.add('midfieldCollapse');
    director.triggered.add('cornerCurse');

    const event = updatePitchEventDirector(director, game, 'bloodMoon');

    expect(event).toMatchObject({
      eventId: 'wideOverload',
      announcement: 'THE WINGS ARE FLOODED',
      formation: { formationId: 'wideOverload' },
    });
    const lateralPositions = event?.formation.enemies.map((enemy) => enemy.position.x) ?? [];
    expect(Math.min(...lateralPositions)).toBeLessThanOrEqual(-20);
    expect(Math.max(...lateralPositions)).toBeGreaterThanOrEqual(20);
    expect(event?.eliteBindings).toHaveLength(2);
  });
});
