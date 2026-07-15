import type { CharacterId } from '../game/characters';
import breakaway from './portraits/breakaway.png';
import engine from './portraits/engine.png';
import finisher from './portraits/finisher.png';
import guardian from './portraits/guardian.png';
import maestro from './portraits/maestro.png';
import tower from './portraits/tower.png';

/** Original no-likeness character portraits generated for the Huntrix roster. */
export const CHARACTER_PORTRAIT_URLS = Object.freeze({
  maestro,
  breakaway,
  tower,
  finisher,
  engine,
  guardian,
} satisfies Record<CharacterId, string>);
