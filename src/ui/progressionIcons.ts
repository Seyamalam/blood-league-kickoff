import crimsonMeteorIcon from '../assets/progression/evolutions/crimson-meteor.svg';
import graveFrostWakeIcon from '../assets/progression/evolutions/grave-frost-wake.svg';
import moonBreakerIcon from '../assets/progression/evolutions/moon-breaker.svg';
import phantomSingularityIcon from '../assets/progression/evolutions/phantom-singularity.svg';
import stormHaloIcon from '../assets/progression/evolutions/storm-halo.svg';
import bloodBombIcon from '../assets/progression/upgrades/blood-bomb.svg';
import bloodDrinkerIcon from '../assets/progression/upgrades/blood-drinker.svg';
import bloodMagnetIcon from '../assets/progression/upgrades/blood-magnet.svg';
import frostCleatsIcon from '../assets/progression/upgrades/frost-cleats.svg';
import garlicTrailIcon from '../assets/progression/upgrades/garlic-trail.svg';
import ghostPassIcon from '../assets/progression/upgrades/ghost-pass.svg';
import ironHeartIcon from '../assets/progression/upgrades/iron-heart.svg';
import killerInstinctIcon from '../assets/progression/upgrades/killer-instinct.svg';
import orbitingSpectralBallIcon from '../assets/progression/upgrades/orbiting-spectral-ball.svg';
import piercingStudsIcon from '../assets/progression/upgrades/piercing-studs.svg';
import powerKickIcon from '../assets/progression/upgrades/power-kick.svg';
import rapidRecallIcon from '../assets/progression/upgrades/rapid-recall.svg';
import silverBallIcon from '../assets/progression/upgrades/silver-ball.svg';
import spectralVolleyIcon from '../assets/progression/upgrades/spectral-volley.svg';
import stormStudsIcon from '../assets/progression/upgrades/storm-studs.svg';
import voidGoalIcon from '../assets/progression/upgrades/void-goal.svg';
import type { EvolutionId, UpgradeId } from '../game/progression';

/** Build-verified presentation assets for every selectable upgrade. */
export const UPGRADE_ICON_URLS = Object.freeze({
  silverBall: silverBallIcon,
  powerKick: powerKickIcon,
  rapidRecall: rapidRecallIcon,
  piercingStuds: piercingStudsIcon,
  garlicTrail: garlicTrailIcon,
  orbitingSpectralBall: orbitingSpectralBallIcon,
  bloodBomb: bloodBombIcon,
  ghostPass: ghostPassIcon,
  stormStuds: stormStudsIcon,
  frostCleats: frostCleatsIcon,
  spectralVolley: spectralVolleyIcon,
  voidGoal: voidGoalIcon,
  ironHeart: ironHeartIcon,
  bloodMagnet: bloodMagnetIcon,
  killerInstinct: killerInstinctIcon,
  bloodDrinker: bloodDrinkerIcon,
} satisfies Record<UpgradeId, string>);

/** Build-verified presentation assets for every automatic evolution. */
export const EVOLUTION_ICON_URLS = Object.freeze({
  moonBreaker: moonBreakerIcon,
  crimsonMeteor: crimsonMeteorIcon,
  graveFrostWake: graveFrostWakeIcon,
  stormHalo: stormHaloIcon,
  phantomSingularity: phantomSingularityIcon,
} satisfies Record<EvolutionId, string>);
