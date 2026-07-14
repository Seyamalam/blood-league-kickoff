import type { Vec3 } from '../simulation/types';

export type EnvironmentInteractionKind = 'bloodBarrel' | 'holyBeacon' | 'breakableBarrier';

export interface EnvironmentInteractionDefinition {
  readonly kind: EnvironmentInteractionKind;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly radius: number;
  readonly hitPoints: number;
}

export interface EnvironmentInteractionState {
  readonly id: number;
  readonly kind: EnvironmentInteractionKind;
  readonly position: Vec3;
  readonly radius: number;
  hitPoints: number;
  maxHitPoints: number;
  active: boolean;
  pulseTimer: number;
}

export type EnvironmentInteractionEvent =
  | {
      readonly type: 'barrelExploded';
      readonly interactionId: number;
      readonly position: Vec3;
      readonly radius: number;
      readonly damage: number;
    }
  | {
      readonly type: 'holyPulse';
      readonly interactionId: number;
      readonly position: Vec3;
      readonly radius: number;
      readonly damage: number;
    }
  | {
      readonly type: 'barrierBroken';
      readonly interactionId: number;
      readonly position: Vec3;
    };

export const ENVIRONMENT_INTERACTION_DEFINITIONS: Readonly<
  Record<EnvironmentInteractionKind, EnvironmentInteractionDefinition>
> = Object.freeze({
  bloodBarrel: Object.freeze({
    kind: 'bloodBarrel',
    name: 'Blood Barrel',
    description: 'Kick the ball through it to detonate nearby enemies.',
    icon: 'blood-barrel',
    radius: 0.75,
    hitPoints: 2,
  }),
  holyBeacon: Object.freeze({
    kind: 'holyBeacon',
    name: 'Holy Beacon',
    description: 'Periodically scorches vampires inside its consecrated circle.',
    icon: 'holy-beacon',
    radius: 0.65,
    hitPoints: 6,
  }),
  breakableBarrier: Object.freeze({
    kind: 'breakableBarrier',
    name: 'Breakable Barrier',
    description: 'Blocks movement and powerful shots until shattered.',
    icon: 'breakable-wall',
    radius: 1.25,
    hitPoints: 8,
  }),
});

export function createEnvironmentInteraction(
  id: number,
  kind: EnvironmentInteractionKind,
  position: Readonly<Vec3>,
): EnvironmentInteractionState {
  const definition = ENVIRONMENT_INTERACTION_DEFINITIONS[kind];
  return {
    id,
    kind,
    position: { ...position },
    radius: definition.radius,
    hitPoints: definition.hitPoints,
    maxHitPoints: definition.hitPoints,
    active: true,
    pulseTimer: kind === 'holyBeacon' ? 0.8 : 0,
  };
}

export function damageEnvironmentInteraction(
  interaction: EnvironmentInteractionState,
  damage: number,
): readonly EnvironmentInteractionEvent[] {
  if (!interaction.active || !Number.isFinite(damage) || damage <= 0) return [];
  interaction.hitPoints = Math.max(0, interaction.hitPoints - damage);
  if (interaction.hitPoints > 0) return [];
  interaction.active = false;
  if (interaction.kind === 'bloodBarrel') {
    return [
      {
        type: 'barrelExploded',
        interactionId: interaction.id,
        position: { ...interaction.position },
        radius: 4.2,
        damage: 8,
      },
    ];
  }
  if (interaction.kind === 'breakableBarrier') {
    return [
      {
        type: 'barrierBroken',
        interactionId: interaction.id,
        position: { ...interaction.position },
      },
    ];
  }
  return [];
}

export function updateEnvironmentInteractions(
  interactions: readonly EnvironmentInteractionState[],
  dt: number,
): readonly EnvironmentInteractionEvent[] {
  const events: EnvironmentInteractionEvent[] = [];
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(1, dt)) : 0;
  for (const interaction of interactions) {
    if (!interaction.active || interaction.kind !== 'holyBeacon') continue;
    interaction.pulseTimer -= safeDt;
    if (interaction.pulseTimer > 0) continue;
    events.push({
      type: 'holyPulse',
      interactionId: interaction.id,
      position: { ...interaction.position },
      radius: 3.6,
      damage: 2,
    });
    interaction.pulseTimer += 1.25;
  }
  return events;
}

export function findInteractionHit(
  interactions: readonly EnvironmentInteractionState[],
  point: Readonly<Vec3>,
  projectileRadius = 0,
): EnvironmentInteractionState | undefined {
  return interactions.find(
    (interaction) =>
      interaction.active &&
      Math.hypot(point.x - interaction.position.x, point.z - interaction.position.z) <=
        interaction.radius + Math.max(0, projectileRadius),
  );
}
