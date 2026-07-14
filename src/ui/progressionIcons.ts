import crimsonMeteorIcon from '../assets/progression/evolutions/crimson-meteor.svg';
import graveFrostWakeIcon from '../assets/progression/evolutions/grave-frost-wake.svg';
import moonBreakerIcon from '../assets/progression/evolutions/moon-breaker.svg';
import phantomSingularityIcon from '../assets/progression/evolutions/phantom-singularity.svg';
import stormHaloIcon from '../assets/progression/evolutions/storm-halo.svg';
import sacredAegisIcon from '../assets/progression/evolutions/sacred-aegis.svg';
import thunderclapRushIcon from '../assets/progression/evolutions/thunderclap-rush.svg';
import phantomFormationIcon from '../assets/progression/evolutions/phantom-formation.svg';
import refereesReckoningIcon from '../assets/progression/evolutions/referees-reckoning.svg';
import royalHeaderIcon from '../assets/progression/evolutions/royal-header.svg';
import tempestSetPieceIcon from '../assets/progression/evolutions/tempest-set-piece.svg';
import bloodBarrierIcon from '../assets/progression/upgrades/blood-barrier.svg';
import bloodBombIcon from '../assets/progression/upgrades/blood-bomb.svg';
import bloodDrinkerIcon from '../assets/progression/upgrades/blood-drinker.svg';
import bloodMagnetIcon from '../assets/progression/upgrades/blood-magnet.svg';
import consecratedPitchIcon from '../assets/progression/upgrades/consecrated-pitch.svg';
import dashShockwaveIcon from '../assets/progression/upgrades/dash-shockwave.svg';
import frostCleatsIcon from '../assets/progression/upgrades/frost-cleats.svg';
import garlicTrailIcon from '../assets/progression/upgrades/garlic-trail.svg';
import ghostPassIcon from '../assets/progression/upgrades/ghost-pass.svg';
import ironHeartIcon from '../assets/progression/upgrades/iron-heart.svg';
import killerInstinctIcon from '../assets/progression/upgrades/killer-instinct.svg';
import orbitingSpectralBallIcon from '../assets/progression/upgrades/orbiting-spectral-ball.svg';
import piercingStudsIcon from '../assets/progression/upgrades/piercing-studs.svg';
import powerKickIcon from '../assets/progression/upgrades/power-kick.svg';
import rapidRecallIcon from '../assets/progression/upgrades/rapid-recall.svg';
import ricochetBallIcon from '../assets/progression/upgrades/ricochet-ball.svg';
import silverBallIcon from '../assets/progression/upgrades/silver-ball.svg';
import spectralVolleyIcon from '../assets/progression/upgrades/spectral-volley.svg';
import stormStudsIcon from '../assets/progression/upgrades/storm-studs.svg';
import voidGoalIcon from '../assets/progression/upgrades/void-goal.svg';
import bootCycloneIcon from '../assets/progression/upgrades/boot-cyclone.svg';
import cornerStormIcon from '../assets/progression/upgrades/corner-storm.svg';
import headerCannonIcon from '../assets/progression/upgrades/header-cannon.svg';
import penaltyMineIcon from '../assets/progression/upgrades/penalty-mine.svg';
import redCardIcon from '../assets/progression/upgrades/red-card.svg';
import spectralTeammateIcon from '../assets/progression/upgrades/spectral-teammate.svg';
import bloodMoonPactIcon from '../assets/progression/curses/blood-moon-pact.svg';
import cursedCrowdIcon from '../assets/progression/curses/cursed-crowd.svg';
import glassGoalIcon from '../assets/progression/curses/glass-goal.svg';
import hungryPitchIcon from '../assets/progression/curses/hungry-pitch.svg';
import offsideTrapIcon from '../assets/progression/curses/offside-trap.svg';
import suddenDeathIcon from '../assets/progression/curses/sudden-death.svg';
import type { CurseId, EvolutionId, UpgradeId } from '../game/progression';

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
  dashShockwave: dashShockwaveIcon,
  consecratedPitch: consecratedPitchIcon,
  ricochetBall: ricochetBallIcon,
  bloodBarrier: bloodBarrierIcon,
  headerCannon: headerCannonIcon,
  cornerStorm: cornerStormIcon,
  redCard: redCardIcon,
  spectralTeammate: spectralTeammateIcon,
  penaltyMine: penaltyMineIcon,
  bootCyclone: bootCycloneIcon,
} satisfies Record<UpgradeId, string>);

/** Build-verified presentation assets for every automatic evolution. */
export const EVOLUTION_ICON_URLS = Object.freeze({
  moonBreaker: moonBreakerIcon,
  crimsonMeteor: crimsonMeteorIcon,
  graveFrostWake: graveFrostWakeIcon,
  stormHalo: stormHaloIcon,
  phantomSingularity: phantomSingularityIcon,
  thunderclapRush: thunderclapRushIcon,
  sacredAegis: sacredAegisIcon,
  royalHeader: royalHeaderIcon,
  tempestSetPiece: tempestSetPieceIcon,
  phantomFormation: phantomFormationIcon,
  refereesReckoning: refereesReckoningIcon,
} satisfies Record<EvolutionId, string>);

/** Icons for optional high-risk pre-run contracts. */
export const CURSE_ICON_URLS = Object.freeze({
  bloodMoonPact: bloodMoonPactIcon,
  glassGoal: glassGoalIcon,
  hungryPitch: hungryPitchIcon,
  suddenDeath: suddenDeathIcon,
  offsideTrap: offsideTrapIcon,
  cursedCrowd: cursedCrowdIcon,
} satisfies Record<CurseId, string>);
