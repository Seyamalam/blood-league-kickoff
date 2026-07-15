import type { EnemyState, PlayerState } from './types';

export type EnemySquadTactic = 'pressure' | 'screen' | 'flank' | 'encircle';

export interface EnemySquadIntent {
  readonly tactic: EnemySquadTactic;
  readonly targetX: number;
  readonly targetZ: number;
  readonly speedMultiplier: number;
}

export interface EnemySquadBlackboard {
  readonly player: PlayerState;
  readonly protectedSupport: EnemyState | null;
  readonly hasCommander: boolean;
  readonly activeEnemyCount: number;
}

type BehaviorStatus = 'success' | 'failure';
type BehaviorNode<Context> = (context: Context) => BehaviorStatus;

interface EliteDecisionContext {
  readonly blackboard: EnemySquadBlackboard;
  readonly enemy: EnemyState;
  readonly playerDistance: number;
  intent: EnemySquadIntent;
}

const SUPPORT_PRIORITY: Readonly<Partial<Record<EnemyState['archetype'], number>>> = Object.freeze({
  bloodArcher: 4,
  coach: 3,
  corruptReferee: 2,
  leechStriker: 1,
});

/**
 * Builds the shared, read-only facts used by a squad for this fixed step.
 * Selection uses explicit priorities and stable ids, never iteration-time randomness.
 */
export function buildEnemySquadBlackboard(
  enemies: readonly EnemyState[],
  player: PlayerState,
): EnemySquadBlackboard {
  let protectedSupport: EnemyState | null = null;
  let supportPriority = 0;
  let hasCommander = false;
  let activeEnemyCount = 0;

  for (const enemy of enemies) {
    if (enemy.hitPoints <= 0) continue;
    activeEnemyCount += 1;
    if (enemy.archetype === 'coach') hasCommander = true;
    const priority = SUPPORT_PRIORITY[enemy.archetype] ?? 0;
    if (
      priority > supportPriority ||
      (priority === supportPriority && priority > 0 && enemy.id < (protectedSupport?.id ?? Infinity))
    ) {
      protectedSupport = enemy;
      supportPriority = priority;
    }
  }

  return Object.freeze({
    player,
    protectedSupport,
    hasCommander,
    activeEnemyCount,
  });
}

/** Resolves a movement intention without mutating simulation state. */
export function resolveEnemySquadIntent(
  blackboard: EnemySquadBlackboard,
  enemy: EnemyState,
): EnemySquadIntent {
  const playerDistance = distanceBetween(enemy, blackboard.player);
  const pressure = pressureIntent(blackboard);

  if (enemy.goalkeeper || enemy.attackState !== 'chase' || playerDistance <= 2.4) return pressure;

  const context: EliteDecisionContext = {
    blackboard,
    enemy,
    playerDistance,
    intent: pressure,
  };
  if (enemy.elite && eliteDecisionTree(context) === 'success') return context.intent;

  if (enemy.archetype === 'defender' && blackboard.protectedSupport?.id !== enemy.id) {
    return screenIntent(blackboard, blackboard.protectedSupport);
  }
  if (
    blackboard.activeEnemyCount >= 3 &&
    (enemy.archetype === 'winger' || enemy.archetype === 'shadowRunner')
  ) {
    return flankIntent(blackboard, enemy, 1);
  }
  if (blackboard.hasCommander && enemy.archetype === 'bloodFan') {
    return encircleIntent(blackboard, enemy);
  }
  return pressure;
}

const eliteDecisionTree = selector<EliteDecisionContext>(
  sequence(
    condition(
      ({ enemy, blackboard }) =>
        enemy.archetype === 'defender' && blackboard.protectedSupport?.id !== enemy.id,
    ),
    action((context) => {
      context.intent = screenIntent(context.blackboard, context.blackboard.protectedSupport);
    }),
  ),
  sequence(
    condition(({ enemy, playerDistance }) => enemy.archetype === 'winger' && playerDistance > 4.5),
    action((context) => {
      context.intent = flankIntent(context.blackboard, context.enemy, 1.12);
    }),
  ),
);

function pressureIntent(blackboard: EnemySquadBlackboard): EnemySquadIntent {
  return {
    tactic: 'pressure',
    targetX: blackboard.player.position.x,
    targetZ: blackboard.player.position.z,
    speedMultiplier: 1,
  };
}

function screenIntent(blackboard: EnemySquadBlackboard, support: EnemyState | null): EnemySquadIntent {
  if (!support) return pressureIntent(blackboard);
  const dx = blackboard.player.position.x - support.position.x;
  const dz = blackboard.player.position.z - support.position.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  return {
    tactic: 'screen',
    targetX: support.position.x + (dx / length) * 2.2,
    targetZ: support.position.z + (dz / length) * 2.2,
    speedMultiplier: 0.96,
  };
}

function flankIntent(
  blackboard: EnemySquadBlackboard,
  enemy: EnemyState,
  speedMultiplier: number,
): EnemySquadIntent {
  const side = enemy.id % 2 === 0 ? 1 : -1;
  const lateralX = Math.cos(blackboard.player.facing) * side;
  const lateralZ = -Math.sin(blackboard.player.facing) * side;
  return {
    tactic: 'flank',
    targetX: blackboard.player.position.x + lateralX * 4.2,
    targetZ: blackboard.player.position.z + lateralZ * 4.2,
    speedMultiplier,
  };
}

function encircleIntent(blackboard: EnemySquadBlackboard, enemy: EnemyState): EnemySquadIntent {
  // A stable irrational step distributes ids around the ring without a mutable slot allocator.
  const angle = enemy.id * 2.399963229728653;
  return {
    tactic: 'encircle',
    targetX: blackboard.player.position.x + Math.cos(angle) * 1.7,
    targetZ: blackboard.player.position.z + Math.sin(angle) * 1.7,
    speedMultiplier: 1.04,
  };
}

function distanceBetween(enemy: EnemyState, player: PlayerState): number {
  return Math.hypot(player.position.x - enemy.position.x, player.position.z - enemy.position.z);
}

function selector<Context>(...children: readonly BehaviorNode<Context>[]): BehaviorNode<Context> {
  return (context) => {
    for (const child of children) if (child(context) === 'success') return 'success';
    return 'failure';
  };
}

function sequence<Context>(...children: readonly BehaviorNode<Context>[]): BehaviorNode<Context> {
  return (context) => {
    for (const child of children) if (child(context) === 'failure') return 'failure';
    return 'success';
  };
}

function condition<Context>(predicate: (context: Context) => boolean): BehaviorNode<Context> {
  return (context) => (predicate(context) ? 'success' : 'failure');
}

function action<Context>(run: (context: Context) => void): BehaviorNode<Context> {
  return (context) => {
    run(context);
    return 'success';
  };
}
