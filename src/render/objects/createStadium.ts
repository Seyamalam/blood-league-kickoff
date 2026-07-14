import * as THREE from 'three';

export function createStadium(scene: THREE.Scene): void {
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 30),
    new THREE.MeshStandardMaterial({ color: 0x284238, roughness: 0.92, metalness: 0.02 }),
  );
  field.name = 'stadium-pitch';
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  scene.add(field);

  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0x4a6254, transparent: true, opacity: 0.32 });
  for (let x = -20; x <= 20; x += 8) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(4, 29.8), stripeMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.006, 0);
    scene.add(stripe);
  }

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb7c9bd, transparent: true, opacity: 0.88 });
  const boundaryPoints = [
    new THREE.Vector3(-22, 0.025, -14),
    new THREE.Vector3(22, 0.025, -14),
    new THREE.Vector3(22, 0.025, 14),
    new THREE.Vector3(-22, 0.025, 14),
    new THREE.Vector3(-22, 0.025, -14),
  ];
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints), lineMaterial);
  boundary.name = 'pitch-boundary';
  scene.add(boundary);
  const centerCircle = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 3.2, 0.026, Math.sin(angle) * 3.2);
      }),
    ),
    lineMaterial,
  );
  centerCircle.name = 'pitch-center-circle';
  scene.add(centerCircle);
  addPitchGuides(scene, lineMaterial);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2c1d2a, roughness: 0.7, metalness: 0.28 });
  const wallGeometryX = new THREE.BoxGeometry(47, 1.35, 0.4);
  const wallGeometryZ = new THREE.BoxGeometry(0.4, 1.35, 30);
  for (const z of [-15.2, 15.2]) {
    const wall = new THREE.Mesh(wallGeometryX, wallMaterial);
    wall.name = 'arena-board';
    wall.position.set(0, 0.675, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  for (const x of [-23.2, 23.2]) {
    const wall = new THREE.Mesh(wallGeometryZ, wallMaterial);
    wall.name = 'arena-board';
    wall.position.set(x, 0.675, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  addGoal(scene, -1);
  addGoal(scene, 1);
  addArenaRails(scene);
  addUpperFence(scene);
  addStands(scene);
  addCrowdSilhouettes(scene);
}

function addPitchGuides(scene: THREE.Scene, material: THREE.LineBasicMaterial): void {
  const points: THREE.Vector3[] = [];
  const segment = (x1: number, z1: number, x2: number, z2: number): void => {
    points.push(new THREE.Vector3(x1, 0.028, z1), new THREE.Vector3(x2, 0.028, z2));
  };
  segment(-22, 0, 22, 0);
  for (const side of [-1, 1] as const) {
    const goalLine = side * 14;
    const penaltyEdge = side * 9.5;
    const goalBoxEdge = side * 12;
    segment(-6, goalLine, -6, penaltyEdge);
    segment(-6, penaltyEdge, 6, penaltyEdge);
    segment(6, penaltyEdge, 6, goalLine);
    segment(-3.5, goalLine, -3.5, goalBoxEdge);
    segment(-3.5, goalBoxEdge, 3.5, goalBoxEdge);
    segment(3.5, goalBoxEdge, 3.5, goalLine);
  }
  const guides = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
  guides.name = 'pitch-guide-lines';
  scene.add(guides);
}

function addGoal(scene: THREE.Scene, side: -1 | 1): void {
  const group = new THREE.Group();
  group.name = side === -1 ? 'opponent-goal' : 'home-goal';
  const frameColor = side === -1 ? 0xe4dcc3 : 0xb93855;
  const material = new THREE.MeshStandardMaterial({
    color: frameColor,
    emissive: side === -1 ? 0x6e5d34 : 0x4c0718,
    emissiveIntensity: side === -1 ? 0.42 : 0.3,
    metalness: 0.62,
    roughness: 0.3,
  });
  const postGeometry = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8);
  const crossbarGeometry = new THREE.CylinderGeometry(0.18, 0.18, 5.3, 8);
  const depthGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.15, 7);
  const backZ = side * 0.7;
  for (const x of [-2.5, 2.5]) {
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(x, 1.6, 0);
    post.castShadow = true;
    group.add(post);
    const backPost = new THREE.Mesh(postGeometry, material);
    backPost.position.set(x, 1.6, backZ);
    group.add(backPost);
    const depthBar = new THREE.Mesh(depthGeometry, material);
    depthBar.position.set(x, 3.2, backZ * 0.5);
    depthBar.rotation.x = Math.PI / 2;
    group.add(depthBar);
  }
  const bar = new THREE.Mesh(crossbarGeometry, material);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 3.2;
  const backBar = bar.clone();
  backBar.position.z = backZ;
  group.add(bar, backBar);

  const netPoints: THREE.Vector3[] = [];
  for (let row = 0; row <= 4; row += 1) {
    const y = (row / 4) * 3.15;
    netPoints.push(new THREE.Vector3(-2.5, y, backZ), new THREE.Vector3(2.5, y, backZ));
  }
  for (let column = 0; column <= 5; column += 1) {
    const x = -2.5 + column;
    netPoints.push(new THREE.Vector3(x, 0, backZ), new THREE.Vector3(x, 3.15, backZ));
  }
  const net = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(netPoints),
    new THREE.LineBasicMaterial({ color: frameColor, transparent: true, opacity: 0.34 }),
  );
  net.name = 'goal-net';
  group.add(net);

  const mouth = new THREE.Mesh(
    new THREE.PlaneGeometry(5.1, 1.25),
    new THREE.MeshBasicMaterial({
      color: side === -1 ? 0xffd66b : 0xb93855,
      transparent: true,
      opacity: side === -1 ? 0.12 : 0.08,
      depthWrite: false,
    }),
  );
  mouth.name = 'goal-mouth-marker';
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.set(0, 0.018, backZ * 0.5);
  group.add(mouth);

  group.position.z = side * 14.15;
  scene.add(group);
}

function addArenaRails(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({
    color: 0xa52843,
    emissive: 0x5e0b22,
    emissiveIntensity: 0.68,
    roughness: 0.42,
  });
  const endGeometry = new THREE.BoxGeometry(46.5, 0.12, 0.12);
  for (const z of [-14.96, 14.96]) {
    const rail = new THREE.Mesh(endGeometry, material);
    rail.position.set(0, 1.42, z);
    rail.name = 'arena-light-rail';
    scene.add(rail);
  }
  const sideGeometry = new THREE.BoxGeometry(0.12, 0.12, 29.5);
  for (const x of [-22.96, 22.96]) {
    const rail = new THREE.Mesh(sideGeometry, material);
    rail.position.set(x, 1.42, 0);
    rail.name = 'arena-light-rail';
    scene.add(rail);
  }
}

function addUpperFence(scene: THREE.Scene): void {
  const points: THREE.Vector3[] = [];
  const segment = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void => {
    points.push(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
  };
  for (const y of [2.2, 3]) {
    segment(-23, y, -15, 23, y, -15);
    segment(-23, y, 15, 23, y, 15);
    segment(-23, y, -15, -23, y, 15);
    segment(23, y, -15, 23, y, 15);
  }
  for (let x = -22; x <= 22; x += 4) {
    segment(x, 1.35, -15, x, 3, -15);
    segment(x, 1.35, 15, x, 3, 15);
  }
  for (let z = -14; z <= 14; z += 4) {
    segment(-23, 1.35, z, -23, 3, z);
    segment(23, 1.35, z, 23, 3, z);
  }
  const fence = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x9a536e, transparent: true, opacity: 0.38 }),
  );
  fence.name = 'arena-upper-fence';
  scene.add(fence);
}

function addStands(scene: THREE.Scene): void {
  const concrete = [
    new THREE.MeshStandardMaterial({ color: 0x1d1d29, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x272333, roughness: 0.88 }),
  ];
  for (const zSide of [-1, 1]) {
    for (let row = 0; row < 4; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(49 - row * 1.5, 0.75, 2), concrete[row % 2]!);
      stand.position.set(0, 1.8 + row * 0.72, zSide * (17 + row * 1.2));
      scene.add(stand);
    }
  }
  for (const xSide of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 30), concrete[row % 2]!);
      stand.position.set(xSide * (25 + row * 1.2), 1.8 + row * 0.72, 0);
      scene.add(stand);
    }
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({ color: 0x821733 });
  for (let x = -18; x <= 18; x += 6) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), bannerMaterial);
    banner.position.set(x, 0.72, -14.96);
    scene.add(banner);
  }
}

function addCrowdSilhouettes(scene: THREE.Scene): void {
  const columns = 18;
  const rows = 3;
  const count = columns * rows * 2;
  const bodyGeometry = new THREE.CylinderGeometry(0.16, 0.22, 0.42, 5);
  const headGeometry = new THREE.DodecahedronGeometry(0.15, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6b365b,
    emissive: 0x210a1c,
    emissiveIntensity: 0.42,
    roughness: 0.82,
  });
  const bodies = new THREE.InstancedMesh(bodyGeometry, material, count);
  const heads = new THREE.InstancedMesh(headGeometry, material, count);
  bodies.name = 'stadium-crowd-bodies';
  heads.name = 'stadium-crowd-heads';
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let index = 0;
  for (const zSide of [-1, 1]) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = -17.85 + column * 2.1;
        const z = zSide * (16.18 + row * 1.2);
        const baseY = 2.28 + row * 0.72 + (column % 2) * 0.04;
        matrix.makeTranslation(x, baseY, z);
        bodies.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, baseY + 0.36, z);
        heads.setMatrixAt(index, matrix);
        color.setHex(column % 3 === 0 ? 0x8b3b62 : column % 3 === 1 ? 0x53314f : 0x74506b);
        bodies.setColorAt(index, color);
        heads.setColorAt(index, color);
        index += 1;
      }
    }
  }
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  scene.add(bodies, heads);
}
