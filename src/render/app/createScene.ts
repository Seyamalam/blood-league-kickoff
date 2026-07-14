import * as THREE from 'three';
import { OPPONENT_GOAL_LINE_Z, PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import { createStadium } from '../objects/createStadium';
import {
  resolveStadiumVariant,
  type StadiumSelection,
  type StadiumVariantId,
} from '../objects/stadiumVariants';

export function createScene(stadiumSelection: StadiumSelection = 'blood-court'): THREE.Scene {
  const scene = new THREE.Scene();
  const variant = resolveStadiumVariant(stadiumSelection);
  scene.background = new THREE.Color(variant.sky);
  scene.fog = new THREE.FogExp2(variant.fog, 0.0068);
  createStadium(scene, variant.id);

  // Cool ambient light keeps the pitch readable while the wine-red ground
  // bounce preserves the nocturnal, gothic palette on downward-facing forms.
  const hemisphere = new THREE.HemisphereLight(variant.ambientSky, variant.ambientGround, 1.45);
  hemisphere.name = 'arena-ambient-light';
  scene.add(hemisphere);

  const moon = new THREE.DirectionalLight(variant.keyLight, 3.2);
  moon.name = 'arena-moon-key-light';
  moon.position.set(-12, 24, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -PITCH_HALF_WIDTH - 4;
  moon.shadow.camera.right = PITCH_HALF_WIDTH + 4;
  moon.shadow.camera.top = PITCH_HALF_LENGTH + 6;
  moon.shadow.camera.bottom = -PITCH_HALF_LENGTH - 6;
  scene.add(moon);

  // The moon is intentionally a dramatic backlight from the far goal. A
  // shadow-free camera-side fill prevents dark enemies from becoming black
  // silhouettes against the pitch without adding another shadow pass.
  const fill = new THREE.DirectionalLight(variant.fillLight, 1.15);
  fill.name = 'arena-gameplay-fill-light';
  fill.position.set(14, 18, OPPONENT_GOAL_LINE_Z);
  scene.add(fill);

  const bloodLight = new THREE.PointLight(variant.accent, 22, 42, 2);
  bloodLight.name = 'arena-blood-goal-light';
  bloodLight.position.set(0, 5, OPPONENT_GOAL_LINE_Z);
  scene.add(bloodLight);
  return scene;
}

/** Rebuilds presentation geometry and palette without touching simulation or physics state. */
export function applyStadiumSelection(scene: THREE.Scene, selection: StadiumSelection): StadiumVariantId {
  const variant = resolveStadiumVariant(selection);
  createStadium(scene, variant.id);
  scene.background = new THREE.Color(variant.sky);
  if (scene.fog instanceof THREE.FogExp2) scene.fog.color.setHex(variant.fog);
  (scene.getObjectByName('arena-ambient-light') as THREE.HemisphereLight | undefined)?.color.setHex(
    variant.ambientSky,
  );
  (scene.getObjectByName('arena-ambient-light') as THREE.HemisphereLight | undefined)?.groundColor.setHex(
    variant.ambientGround,
  );
  (scene.getObjectByName('arena-moon-key-light') as THREE.DirectionalLight | undefined)?.color.setHex(
    variant.keyLight,
  );
  (scene.getObjectByName('arena-gameplay-fill-light') as THREE.DirectionalLight | undefined)?.color.setHex(
    variant.fillLight,
  );
  (scene.getObjectByName('arena-blood-goal-light') as THREE.PointLight | undefined)?.color.setHex(
    variant.accent,
  );
  return variant.id;
}
