import { spawnEnemyAt } from '../game/simulation/gameState';
import type { SecondaryWeaponRenderState } from '../game/combat';
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
  readonly secondaryPools: 'empty' | 'full';
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
  readonly secondaryPools: 'empty' | 'full';
}

interface HookTarget {
  [DENSE_WAVE_PERF_HOOK]?: () => Readonly<DenseWavePerformanceSnapshot>;
}

/** The profiling mode is deliberately impossible to activate in a production build. */
export function readDenseWaveStressMode(search: string, development: boolean): DenseWaveStressMode | null {
  if (!development) return null;
  const params = new URLSearchParams(search);
  if (params.get('stress') !== String(DENSE_WAVE_STRESS_COUNT)) return null;
  const secondary = params.get('secondary');
  if (secondary !== null && secondary !== 'full') return null;
  return {
    enemyCount: DENSE_WAVE_STRESS_COUNT,
    frozenSimulation: true,
    secondaryPools: secondary === 'full' ? 'full' : 'empty',
  };
}

/** Stable full-pool state for comparing real WebGL draw cost against the empty control scene. */
export function createDenseSecondaryStressState(): SecondaryWeaponRenderState {
  return {
    garlicZones: Array.from({ length: 24 }, (_, index) => ({
      active: true,
      position: {
        x: -10 + (index % 6) * 4,
        y: 0.04,
        z: -6 + Math.floor(index / 6) * 4,
      },
      radius: 0.82,
      age: 0.6,
      lifetime: 1.35,
    })),
    orbitingBalls: Array.from({ length: 3 }, (_, index) => {
      const angle = (index / 3) * Math.PI * 2;
      return {
        active: true,
        position: { x: Math.cos(angle) * 1.72, y: 1.08, z: Math.sin(angle) * 1.72 },
        radius: 0.36,
      };
    }),
    ghostPasses: Array.from({ length: 8 }, (_, index) => ({
      active: true,
      position: { x: -7 + index * 2, y: 1.1, z: 4.5 + (index % 2) * 0.7 },
      velocity: { x: 0, y: 0, z: 0 },
      radius: 0.34,
      age: 0.4,
      lifetime: 1.45,
    })),
    multiBallShots: Array.from({ length: 6 }, (_, index) => ({
      active: true,
      position: { x: -5 + index * 2, y: 1.35, z: -3.8 - (index % 2) * 0.7 },
      velocity: { x: 0, y: 0, z: 0 },
      radius: 0.3,
      age: 0.2,
      lifetime: 1.2,
    })),
    blackHoleZones: Array.from({ length: 4 }, (_, index) => ({
      active: true,
      position: {
        x: index % 2 === 0 ? -8 : 8,
        y: 0.08,
        z: index < 2 ? -7 : 7,
      },
      radius: 2,
      age: 0.4 + index * 0.12,
      lifetime: 1.6,
    })),
  };
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
