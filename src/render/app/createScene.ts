import * as THREE from 'three';
import { OPPONENT_GOAL_LINE_Z, PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../../game/field';
import { createStadium } from '../objects/createStadium';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080811);
  scene.fog = new THREE.FogExp2(0x080811, 0.0085);
  createStadium(scene);

  // Cool ambient light keeps the pitch readable while the wine-red ground
  // bounce preserves the nocturnal, gothic palette on downward-facing forms.
  const hemisphere = new THREE.HemisphereLight(0x8298dc, 0x310d1d, 1.45);
  hemisphere.name = 'arena-ambient-light';
  scene.add(hemisphere);

  const moon = new THREE.DirectionalLight(0xaabfff, 3.2);
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
  const fill = new THREE.DirectionalLight(0xff91ad, 1.15);
  fill.name = 'arena-gameplay-fill-light';
  fill.position.set(14, 18, OPPONENT_GOAL_LINE_Z);
  scene.add(fill);

  const bloodLight = new THREE.PointLight(0xc51f4d, 22, 42, 2);
  bloodLight.name = 'arena-blood-goal-light';
  bloodLight.position.set(0, 5, OPPONENT_GOAL_LINE_Z);
  scene.add(bloodLight);
  return scene;
}
