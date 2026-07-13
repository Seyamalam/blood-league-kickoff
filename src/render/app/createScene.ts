import * as THREE from 'three';
import { createStadium } from '../objects/createStadium';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080811);
  scene.fog = new THREE.FogExp2(0x080811, 0.018);
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
  moon.shadow.camera.left = -26;
  moon.shadow.camera.right = 26;
  moon.shadow.camera.top = 20;
  moon.shadow.camera.bottom = -20;
  scene.add(moon);

  // The moon is intentionally a dramatic backlight from the far goal. A
  // shadow-free camera-side fill prevents dark enemies from becoming black
  // silhouettes against the pitch without adding another shadow pass.
  const fill = new THREE.DirectionalLight(0xff91ad, 1.15);
  fill.name = 'arena-gameplay-fill-light';
  fill.position.set(9, 11, -14);
  scene.add(fill);

  const bloodLight = new THREE.PointLight(0xc51f4d, 22, 36, 2);
  bloodLight.name = 'arena-blood-goal-light';
  bloodLight.position.set(0, 5, -14);
  scene.add(bloodLight);
  return scene;
}
