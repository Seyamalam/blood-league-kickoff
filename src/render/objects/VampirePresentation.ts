import * as THREE from 'three';

export interface PresentationPose {
  readonly visible: boolean;
  readonly progress: number;
  readonly height: number;
  readonly scale: number;
  readonly rotationY: number;
  readonly rotationZ: number;
  readonly opacity: number;
}

export function minibossEntrancePose(actionTimer: number, duration = 0.9): PresentationPose {
  const progress = easeOutCubic(1 - actionTimer / duration);
  return {
    visible: true,
    progress,
    height: THREE.MathUtils.lerp(-1.6, 0, progress),
    scale: THREE.MathUtils.lerp(0.58, 1, progress),
    rotationY: (1 - progress) * Math.PI * 0.8,
    rotationZ: 0,
    opacity: 1,
  };
}

export function defeatPose(elapsed: number, duration = 1.65, direction = 1): PresentationPose {
  const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
  const eased = easeInCubic(progress);
  return {
    visible: progress < 1,
    progress,
    height: -eased * 1.15 + Math.sin(progress * Math.PI) * 0.22,
    scale: 1 - progress * 0.38,
    rotationY: progress * direction * 0.55,
    rotationZ: progress * direction * 1.12,
    opacity: 1 - progress,
  };
}

export function enemyDeathPose(elapsed: number, seed: number, duration = 0.72): PresentationPose {
  const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
  const direction = seed % 2 === 0 ? 1 : -1;
  return {
    visible: progress < 1,
    progress,
    height: Math.sin(progress * Math.PI) * 0.42 - progress * 0.15,
    scale: 0.9 + progress * 0.7,
    rotationY: direction * progress * Math.PI,
    rotationZ: direction * progress * 0.7,
    opacity: (1 - progress) ** 1.5,
  };
}

export function goalkeeperEntrancePose(phaseElapsed: number, duration = 2.4): PresentationPose {
  const progress = easeOutCubic(phaseElapsed / duration);
  return {
    visible: true,
    progress,
    height: THREE.MathUtils.lerp(2.8, 0, progress),
    scale: THREE.MathUtils.lerp(0.28, 1, progress),
    rotationY: (1 - progress) * Math.PI * 1.5,
    rotationZ: 0,
    opacity: 1,
  };
}

function easeOutCubic(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function easeInCubic(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t ** 3;
}
