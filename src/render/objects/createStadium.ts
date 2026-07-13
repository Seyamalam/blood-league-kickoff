import * as THREE from 'three';

export function createStadium(scene: THREE.Scene): void {
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 30),
    new THREE.MeshStandardMaterial({ color: 0x18261f, roughness: 0.92, metalness: 0.02 }),
  );
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  scene.add(field);

  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0x26372e, transparent: true, opacity: 0.55 });
  for (let x = -20; x <= 20; x += 8) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(4, 29.8), stripeMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.006, 0);
    scene.add(stripe);
  }

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8ca697, transparent: true, opacity: 0.72 });
  const boundaryPoints = [
    new THREE.Vector3(-22, 0.025, -14), new THREE.Vector3(22, 0.025, -14),
    new THREE.Vector3(22, 0.025, 14), new THREE.Vector3(-22, 0.025, 14),
    new THREE.Vector3(-22, 0.025, -14),
  ];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints), lineMaterial));
  const centerCircle = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 3.2, 0.026, Math.sin(angle) * 3.2);
      }),
    ),
    lineMaterial,
  );
  scene.add(centerCircle);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x221822, roughness: 0.7, metalness: 0.28 });
  const wallGeometryX = new THREE.BoxGeometry(47, 3, 0.4);
  const wallGeometryZ = new THREE.BoxGeometry(0.4, 3, 30);
  for (const z of [-15.2, 15.2]) {
    const wall = new THREE.Mesh(wallGeometryX, wallMaterial);
    wall.position.set(0, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  for (const x of [-23.2, 23.2]) {
    const wall = new THREE.Mesh(wallGeometryZ, wallMaterial);
    wall.position.set(x, 1.5, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  addGoal(scene, -1);
  addGoal(scene, 1);
  addStands(scene);
}

function addGoal(scene: THREE.Scene, side: -1 | 1): void {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: side === -1 ? 0xb7c6ce : 0xa52843, metalness: 0.75, roughness: 0.25 });
  const postGeometry = new THREE.CylinderGeometry(0.12, 0.12, 3, 10);
  for (const x of [-2.5, 2.5]) {
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(x, 1.5, 0);
    post.castShadow = true;
    group.add(post);
  }
  const bar = new THREE.Mesh(postGeometry, material);
  bar.rotation.z = Math.PI / 2;
  bar.scale.y = 1.7;
  bar.position.y = 3;
  group.add(bar);
  group.position.z = side * 14.75;
  scene.add(group);
}

function addStands(scene: THREE.Scene): void {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x111119, roughness: 0.88 });
  for (const zSide of [-1, 1]) {
    for (let row = 0; row < 4; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(49 - row * 1.5, 0.75, 2), concrete);
      stand.position.set(0, 1.8 + row * 0.72, zSide * (17 + row * 1.2));
      scene.add(stand);
    }
  }
  for (const xSide of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 30), concrete);
      stand.position.set(xSide * (25 + row * 1.2), 1.8 + row * 0.72, 0);
      scene.add(stand);
    }
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({ color: 0x821733 });
  for (let x = -18; x <= 18; x += 6) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), bannerMaterial);
    banner.position.set(x, 1.7, -15.42);
    scene.add(banner);
  }
}
