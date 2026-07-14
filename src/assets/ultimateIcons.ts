import cleanSheetIcon from './ultimates/clean-sheet.svg';
import fullPitchPressIcon from './ultimates/full-pitch-press.svg';
import lastTouchIcon from './ultimates/last-touch.svg';
import meteorHeaderIcon from './ultimates/meteor-header.svg';
import midnightOrchestraIcon from './ultimates/midnight-orchestra.svg';
import redlineCounterIcon from './ultimates/redline-counter.svg';
import type { CharacterUltimateId } from '../game/combat/characterUltimateTypes';

/** Build-verified artwork for every character ultimate. */
export const CHARACTER_ULTIMATE_ICON_URLS = Object.freeze({
  midnightOrchestra: midnightOrchestraIcon,
  redlineCounter: redlineCounterIcon,
  meteorHeader: meteorHeaderIcon,
  lastTouch: lastTouchIcon,
  fullPitchPress: fullPitchPressIcon,
  cleanSheet: cleanSheetIcon,
} satisfies Record<CharacterUltimateId, string>);
