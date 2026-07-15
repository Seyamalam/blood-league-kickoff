import type { EnemyArchetype } from '../game/simulation/types';
import batSwarm from './portraits/enemies/bat-swarm.png';
import bloodArcher from './portraits/enemies/blood-archer.png';
import bloodFan from './portraits/enemies/blood-fan.png';
import coach from './portraits/enemies/coach.png';
import corpseBomber from './portraits/enemies/corpse-bomber.png';
import corruptReferee from './portraits/enemies/corrupt-referee.png';
import defender from './portraits/enemies/defender.png';
import goalkeeperBrute from './portraits/enemies/goalkeeper-brute.png';
import leechStriker from './portraits/enemies/leech-striker.png';
import shadowRunner from './portraits/enemies/shadow-runner.png';
import winger from './portraits/enemies/winger.png';

export const ENEMY_PORTRAIT_URLS = Object.freeze({
  bloodFan,
  winger,
  defender,
  coach,
  batSwarm,
  leechStriker,
  corruptReferee,
  bloodArcher,
  shadowRunner,
  corpseBomber,
  goalkeeperBrute,
} satisfies Record<EnemyArchetype, string>);
