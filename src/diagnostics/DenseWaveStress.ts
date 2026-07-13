import { spawnEnemyAt } from '../game/simulation/gameState';
import type { EnemyArchetype, GameState } from '../game/simulation/types';
import type { PerformanceSnapshot } from './PerfMeter';

export const DENSE_WAVE_STRESS_COUNT = 72;
export const DENSE_WAVE_PERF_HOOK = '__bloodLeaguePerfSnapshot';

const ARCHETYPES: readonly EnemyArchetype[] = [
  'bloodFan',
  'winger',
  'defender',
  'coach',
  'batSwarm',
  'leechStriker',
  'corruptReferee',
  'goalkeeperBrute',
];

export interface DenseWaveStressMode {
  readonly enemyCount: typeof DENSE_WAVE_STRESS_COUNT;
  readonly frozenSimulation: true;
}

export interface DenseWavePerformanceSnapshot extends PerformanceSnapshot {
  readonly mode: 'dense-wave';
  readonly frozenSimulation: true;
  readonly renderQuality: string;
  readonly renderScale: number;
  readonly fpsLimit: number | 'unlimited';
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly pixelRatio: number;
}

interface HookTarget {
  [DENSE_WAVE_PERF_HOOK]?: () => Readonly<DenseWavePerformanceSnapshot>;
}

/** The profiling mode is deliberately impossible to activate in a production build. */
export function readDenseWaveStressMode(search: string, development: boolean): DenseWaveStressMode | null {
  if (!development) return null;
  const params = new URLSearchParams(search);
  if (params.get('stress') !== String(DENSE_WAVE_STRESS_COUNT)) return null;
  return { enemyCount: DENSE_WAVE_STRESS_COUNT, frozenSimulation: true };
}

/** Replaces the live formation with a stable, evenly mixed 72-enemy profiling scene. */
export function applyDenseWaveStressFormation(state: GameState): void {
  state.phase = 'playing';
  state.elapsed = 600;
  state.spawnTimer = Number.POSITIVE_INFINITY;
  state.enemies.length = 0;
  state.nextEnemyId = 1;
  state.player.position = { x: 0, y: 0.9, z: 0 };
  state.player.previousPosition = { ...state.player.position };
  state.player.velocity = { x: 0, y: 0, z: 0 };
  state.player.health = state.player.maxHealth;
  state.player.invulnerability = Number.POSITIVE_INFINITY;

  for (let index = 0; index < DENSE_WAVE_STRESS_COUNT; index += 1) {
    const archetype = ARCHETYPES[index % ARCHETYPES.length]!;
    const ringIndex = Math.floor(index / 24);
    const ringRadius = 7.5 + ringIndex * 2.75;
    const angle = (index / DENSE_WAVE_STRESS_COUNT) * Math.PI * 2 + ringIndex * 0.19;
    spawnEnemyAt(state, archetype, {
      x: Math.cos(angle) * ringRadius * 1.45,
      y: 0.9,
      z: Math.sin(angle) * ringRadius,
    });
  }
}

/** Installs a non-writable getter function that returns a fresh frozen snapshot. */
export function installDenseWavePerformanceHook(
  target: object,
  readSnapshot: () => DenseWavePerformanceSnapshot,
): () => void {
  const hookTarget = target as HookTarget;
  Object.defineProperty(hookTarget, DENSE_WAVE_PERF_HOOK, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: () => Object.freeze({ ...readSnapshot() }),
  });
  return () => {
    delete hookTarget[DENSE_WAVE_PERF_HOOK];
  };
}
