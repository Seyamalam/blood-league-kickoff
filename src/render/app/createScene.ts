import * as THREE from 'three';
import { createStadium } from '../objects/createStadium';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080811);
  scene.fog = new THREE.FogExp2(0x080811, 0.018);
  createStadium(scene);

  const hemisphere = new THREE.HemisphereLight(0x7084c7, 0x1d0811, 1.15);
  scene.add(hemisphere);

  const moon = new THREE.DirectionalLight(0xaabfff, 3.2);
  moon.position.set(-12, 24, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -26;
  moon.shadow.camera.right = 26;
  moon.shadow.camera.top = 20;
  moon.shadow.camera.bottom = -20;
  scene.add(moon);

  const bloodLight = new THREE.PointLight(0xc51f4d, 22, 36, 2);
  bloodLight.position.set(0, 5, -14);
  scene.add(bloodLight);
  return scene;
}
