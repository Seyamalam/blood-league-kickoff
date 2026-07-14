export type RivalTeamId = 'nightwings' | 'iron-coven' | 'velvet-fangs' | 'graveyard-united';

export interface RivalTeamDefinition {
  readonly id: RivalTeamId;
  readonly name: string;
  readonly identity: string;
  readonly enemyHealthMultiplier: number;
  readonly enemySpeedMultiplier: number;
  readonly enemyDamageMultiplier: number;
  readonly pressureMultiplier: number;
  readonly multiball: Readonly<{
    interval: number;
    duration: number;
    count: number;
    damageMultiplier: number;
  }>;
  readonly possession: Readonly<{
    targetSeconds: number;
    cooldown: number;
    scoreReward: number;
    ultimateCharge: number;
  }>;
}

export const RIVAL_TEAM_IDS = [
  'nightwings',
  'iron-coven',
  'velvet-fangs',
  'graveyard-united',
] as const satisfies readonly RivalTeamId[];

/** Original rival clubs with deliberately bounded tactical differences. */
export const RIVAL_TEAM_DEFINITIONS: Readonly<Record<RivalTeamId, RivalTeamDefinition>> = Object.freeze({
  nightwings: rival({
    id: 'nightwings',
    name: 'Nightwing Athletic',
    identity: 'Relentless wing pressure and frequent multiball phases.',
    enemyHealthMultiplier: 0.92,
    enemySpeedMultiplier: 1.12,
    enemyDamageMultiplier: 0.96,
    pressureMultiplier: 1.12,
    multiball: { interval: 34, duration: 10, count: 3, damageMultiplier: 0.55 },
    possession: { targetSeconds: 9, cooldown: 25, scoreReward: 320, ultimateCharge: 10 },
  }),
  'iron-coven': rival({
    id: 'iron-coven',
    name: 'Iron Coven FC',
    identity: 'Slow, bruising defenders who punish careless possession.',
    enemyHealthMultiplier: 1.15,
    enemySpeedMultiplier: 0.92,
    enemyDamageMultiplier: 1.12,
    pressureMultiplier: 0.94,
    multiball: { interval: 46, duration: 8, count: 2, damageMultiplier: 0.72 },
    possession: { targetSeconds: 12, cooldown: 30, scoreReward: 480, ultimateCharge: 14 },
  }),
  'velvet-fangs': rival({
    id: 'velvet-fangs',
    name: 'Velvet Fangs',
    identity: 'Technical counterattackers with rewarding possession duels.',
    enemyHealthMultiplier: 1,
    enemySpeedMultiplier: 1.06,
    enemyDamageMultiplier: 1.04,
    pressureMultiplier: 1,
    multiball: { interval: 40, duration: 9, count: 2, damageMultiplier: 0.64 },
    possession: { targetSeconds: 8, cooldown: 24, scoreReward: 400, ultimateCharge: 16 },
  }),
  'graveyard-united': rival({
    id: 'graveyard-united',
    name: 'Graveyard United',
    identity: 'Deep ranks, heavy pressure, and longer supernatural ball storms.',
    enemyHealthMultiplier: 1.08,
    enemySpeedMultiplier: 0.98,
    enemyDamageMultiplier: 1.08,
    pressureMultiplier: 1.08,
    multiball: { interval: 42, duration: 12, count: 3, damageMultiplier: 0.5 },
    possession: { targetSeconds: 11, cooldown: 28, scoreReward: 440, ultimateCharge: 12 },
  }),
});

/** Stable selection keeps custom/daily runs shareable. */
export function selectRivalTeam(seed: number): RivalTeamDefinition {
  const normalized = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
  return RIVAL_TEAM_DEFINITIONS[RIVAL_TEAM_IDS[normalized % RIVAL_TEAM_IDS.length]!];
}

function rival(definition: RivalTeamDefinition): RivalTeamDefinition {
  return Object.freeze({
    ...definition,
    multiball: Object.freeze({ ...definition.multiball }),
    possession: Object.freeze({ ...definition.possession }),
  });
}
