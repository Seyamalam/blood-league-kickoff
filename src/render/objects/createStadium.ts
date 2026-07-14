import * as THREE from 'three';
import {
  ARENA_WALL_HALF_LENGTH,
  ARENA_WALL_HALF_WIDTH,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  PITCH_HALF_LENGTH,
  PITCH_HALF_WIDTH,
  PITCH_LENGTH,
  PITCH_WIDTH,
} from '../../game/field';
import { resolveStadiumVariant, type StadiumSelection, type StadiumVariant } from './stadiumVariants';

export function createStadium(scene: THREE.Scene, selection: StadiumSelection = 'blood-court'): THREE.Group {
  const existing = scene.getObjectByName('stadium-environment');
  if (existing) {
    scene.remove(existing);
    disposeObject(existing);
  }
  const variant = resolveStadiumVariant(selection);
  const stadium = new THREE.Group();
  stadium.name = 'stadium-environment';
  stadium.userData.variantId = variant.id;
  stadium.userData.architecture = variant.architecture;
  scene.add(stadium);

  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_WIDTH, PITCH_LENGTH),
    createPitchMaterial(variant),
  );
  field.name = 'stadium-pitch';
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  stadium.add(field);

  const stripeMaterial = new THREE.MeshBasicMaterial({
    color: variant.stripe,
    transparent: true,
    opacity: 0.38,
  });
  for (let z = -PITCH_HALF_LENGTH + 3.75; z < PITCH_HALF_LENGTH; z += 7.5) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_WIDTH - 0.2, 7.5), stripeMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.006, z);
    stadium.add(stripe);
  }

  const lineMaterial = new THREE.LineBasicMaterial({ color: variant.line, transparent: true, opacity: 0.92 });
  const boundaryPoints = [
    new THREE.Vector3(-PITCH_HALF_WIDTH, 0.025, -PITCH_HALF_LENGTH),
    new THREE.Vector3(PITCH_HALF_WIDTH, 0.025, -PITCH_HALF_LENGTH),
    new THREE.Vector3(PITCH_HALF_WIDTH, 0.025, PITCH_HALF_LENGTH),
    new THREE.Vector3(-PITCH_HALF_WIDTH, 0.025, PITCH_HALF_LENGTH),
    new THREE.Vector3(-PITCH_HALF_WIDTH, 0.025, -PITCH_HALF_LENGTH),
  ];
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints), lineMaterial);
  boundary.name = 'pitch-boundary';
  stadium.add(boundary);
  const centerCircle = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 9.15, 0.026, Math.sin(angle) * 9.15);
      }),
    ),
    lineMaterial,
  );
  centerCircle.name = 'pitch-center-circle';
  stadium.add(centerCircle);
  addPitchGuides(stadium, lineMaterial);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    roughness: 0.7,
    metalness: 0.28,
  });
  const wallGeometryX = new THREE.BoxGeometry(ARENA_WALL_HALF_WIDTH * 2 + 0.4, 1.35, 0.4);
  const wallGeometryZ = new THREE.BoxGeometry(0.4, 1.35, ARENA_WALL_HALF_LENGTH * 2);
  for (const z of [-ARENA_WALL_HALF_LENGTH, ARENA_WALL_HALF_LENGTH]) {
    const wall = new THREE.Mesh(wallGeometryX, wallMaterial);
    wall.name = 'arena-board';
    wall.position.set(0, 0.675, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    stadium.add(wall);
  }
  for (const x of [-ARENA_WALL_HALF_WIDTH, ARENA_WALL_HALF_WIDTH]) {
    const wall = new THREE.Mesh(wallGeometryZ, wallMaterial);
    wall.name = 'arena-board';
    wall.position.set(x, 0.675, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    stadium.add(wall);
  }

  addGoal(stadium, -1, variant);
  addGoal(stadium, 1, variant);
  addArenaRails(stadium, variant);
  addUpperFence(stadium, variant);
  addStands(stadium, variant);
  addArchitecture(stadium, variant);
  addCrowdSilhouettes(stadium, variant);
  addPresentationDressing(stadium, variant);
  addReactiveProps(stadium, variant);
  return stadium;
}

function createPitchMaterial(variant: StadiumVariant): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: variant.pitch,
    roughness: 0.92,
    metalness: 0.02,
    normalScale: new THREE.Vector2(0.22, 0.22),
  });
  if (typeof document === 'undefined') return material;
  const loader = new THREE.TextureLoader();
  const configure = (texture: THREE.Texture): THREE.Texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14, 20);
    texture.anisotropy = 4;
    return texture;
  };
  material.map = configure(loader.load('/assets/vendor/ambientcg/grass007/color.jpg'));
  material.map.colorSpace = THREE.SRGBColorSpace;
  material.normalMap = configure(loader.load('/assets/vendor/ambientcg/grass007/normal-gl.jpg'));
  material.roughnessMap = configure(loader.load('/assets/vendor/ambientcg/grass007/roughness.jpg'));
  return material;
}

function addPitchGuides(scene: THREE.Object3D, material: THREE.LineBasicMaterial): void {
  const points: THREE.Vector3[] = [];
  const segment = (x1: number, z1: number, x2: number, z2: number): void => {
    points.push(new THREE.Vector3(x1, 0.028, z1), new THREE.Vector3(x2, 0.028, z2));
  };
  segment(-PITCH_HALF_WIDTH, 0, PITCH_HALF_WIDTH, 0);
  for (const side of [-1, 1] as const) {
    const goalLine = side * PITCH_HALF_LENGTH;
    const penaltyEdge = side * (PITCH_HALF_LENGTH - 16.5);
    const goalBoxEdge = side * (PITCH_HALF_LENGTH - 5.5);
    const penaltyHalfWidth = 20.16;
    const goalBoxHalfWidth = 9.16;
    segment(-penaltyHalfWidth, goalLine, -penaltyHalfWidth, penaltyEdge);
    segment(-penaltyHalfWidth, penaltyEdge, penaltyHalfWidth, penaltyEdge);
    segment(penaltyHalfWidth, penaltyEdge, penaltyHalfWidth, goalLine);
    segment(-goalBoxHalfWidth, goalLine, -goalBoxHalfWidth, goalBoxEdge);
    segment(-goalBoxHalfWidth, goalBoxEdge, goalBoxHalfWidth, goalBoxEdge);
    segment(goalBoxHalfWidth, goalBoxEdge, goalBoxHalfWidth, goalLine);
  }
  const guides = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
  guides.name = 'pitch-guide-lines';
  scene.add(guides);
}

function addGoal(scene: THREE.Object3D, side: -1 | 1, variant: StadiumVariant): void {
  const group = new THREE.Group();
  group.name = side === -1 ? 'opponent-goal' : 'home-goal';
  const frameColor = side === -1 ? variant.line : variant.accent;
  const material = new THREE.MeshStandardMaterial({
    color: frameColor,
    emissive: side === -1 ? 0x6e5d34 : 0x4c0718,
    emissiveIntensity: side === -1 ? 0.42 : 0.3,
    metalness: 0.62,
    roughness: 0.3,
  });
  const postGeometry = new THREE.CylinderGeometry(0.16, 0.16, GOAL_HEIGHT, 8);
  const crossbarGeometry = new THREE.CylinderGeometry(0.16, 0.16, GOAL_WIDTH + 0.32, 8);
  const depthGeometry = new THREE.CylinderGeometry(0.1, 0.1, GOAL_DEPTH, 7);
  const backZ = side * GOAL_DEPTH;
  for (const x of [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH]) {
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(x, GOAL_HEIGHT / 2, 0);
    post.castShadow = true;
    group.add(post);
    const backPost = new THREE.Mesh(postGeometry, material);
    backPost.position.set(x, GOAL_HEIGHT / 2, backZ);
    group.add(backPost);
    const depthBar = new THREE.Mesh(depthGeometry, material);
    depthBar.position.set(x, GOAL_HEIGHT, backZ * 0.5);
    depthBar.rotation.x = Math.PI / 2;
    group.add(depthBar);
  }
  const bar = new THREE.Mesh(crossbarGeometry, material);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = GOAL_HEIGHT;
  const backBar = bar.clone();
  backBar.position.z = backZ;
  group.add(bar, backBar);

  const netPoints: THREE.Vector3[] = [];
  for (let row = 0; row <= 4; row += 1) {
    const y = (row / 4) * GOAL_HEIGHT;
    netPoints.push(
      new THREE.Vector3(-GOAL_HALF_WIDTH, y, backZ),
      new THREE.Vector3(GOAL_HALF_WIDTH, y, backZ),
    );
  }
  for (let column = 0; column <= 5; column += 1) {
    const x = -GOAL_HALF_WIDTH + (column / 5) * GOAL_WIDTH;
    netPoints.push(new THREE.Vector3(x, 0, backZ), new THREE.Vector3(x, GOAL_HEIGHT, backZ));
  }
  const net = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(netPoints),
    new THREE.LineBasicMaterial({ color: frameColor, transparent: true, opacity: 0.34 }),
  );
  net.name = 'goal-net';
  group.add(net);

  const mouth = new THREE.Mesh(
    new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH),
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

  group.position.z = side * PITCH_HALF_LENGTH;
  scene.add(group);
}

function addArenaRails(scene: THREE.Object3D, variant: StadiumVariant): void {
  const material = new THREE.MeshStandardMaterial({
    color: variant.accent,
    emissive: variant.accent,
    emissiveIntensity: 0.68,
    roughness: 0.42,
  });
  const endGeometry = new THREE.BoxGeometry(ARENA_WALL_HALF_WIDTH * 2, 0.12, 0.12);
  for (const z of [-ARENA_WALL_HALF_LENGTH + 0.24, ARENA_WALL_HALF_LENGTH - 0.24]) {
    const rail = new THREE.Mesh(endGeometry, material);
    rail.position.set(0, 1.42, z);
    rail.name = 'arena-light-rail';
    scene.add(rail);
  }
  const sideGeometry = new THREE.BoxGeometry(0.12, 0.12, ARENA_WALL_HALF_LENGTH * 2 - 0.5);
  for (const x of [-ARENA_WALL_HALF_WIDTH + 0.24, ARENA_WALL_HALF_WIDTH - 0.24]) {
    const rail = new THREE.Mesh(sideGeometry, material);
    rail.position.set(x, 1.42, 0);
    rail.name = 'arena-light-rail';
    scene.add(rail);
  }
}

function addUpperFence(scene: THREE.Object3D, variant: StadiumVariant): void {
  const points: THREE.Vector3[] = [];
  const segment = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void => {
    points.push(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
  };
  for (const y of [2.2, 3]) {
    segment(
      -ARENA_WALL_HALF_WIDTH,
      y,
      -ARENA_WALL_HALF_LENGTH,
      ARENA_WALL_HALF_WIDTH,
      y,
      -ARENA_WALL_HALF_LENGTH,
    );
    segment(
      -ARENA_WALL_HALF_WIDTH,
      y,
      ARENA_WALL_HALF_LENGTH,
      ARENA_WALL_HALF_WIDTH,
      y,
      ARENA_WALL_HALF_LENGTH,
    );
    segment(
      -ARENA_WALL_HALF_WIDTH,
      y,
      -ARENA_WALL_HALF_LENGTH,
      -ARENA_WALL_HALF_WIDTH,
      y,
      ARENA_WALL_HALF_LENGTH,
    );
    segment(
      ARENA_WALL_HALF_WIDTH,
      y,
      -ARENA_WALL_HALF_LENGTH,
      ARENA_WALL_HALF_WIDTH,
      y,
      ARENA_WALL_HALF_LENGTH,
    );
  }
  for (let x = -PITCH_HALF_WIDTH; x <= PITCH_HALF_WIDTH; x += 4) {
    segment(x, 1.35, -ARENA_WALL_HALF_LENGTH, x, 3, -ARENA_WALL_HALF_LENGTH);
    segment(x, 1.35, ARENA_WALL_HALF_LENGTH, x, 3, ARENA_WALL_HALF_LENGTH);
  }
  for (let z = -PITCH_HALF_LENGTH; z <= PITCH_HALF_LENGTH; z += 5) {
    segment(-ARENA_WALL_HALF_WIDTH, 1.35, z, -ARENA_WALL_HALF_WIDTH, 3, z);
    segment(ARENA_WALL_HALF_WIDTH, 1.35, z, ARENA_WALL_HALF_WIDTH, 3, z);
  }
  const fence = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: variant.accent, transparent: true, opacity: 0.38 }),
  );
  fence.name = 'arena-upper-fence';
  scene.add(fence);
}

function addStands(scene: THREE.Object3D, variant: StadiumVariant): void {
  const concrete = [
    new THREE.MeshStandardMaterial({ color: variant.stand[0], roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: variant.stand[1], roughness: 0.88 }),
  ];
  for (const zSide of [-1, 1]) {
    for (let row = 0; row < 4; row += 1) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(PITCH_WIDTH + 7 - row * 1.5, 0.75, 2),
        concrete[row % 2]!,
      );
      stand.position.set(0, 1.8 + row * 0.72, zSide * (ARENA_WALL_HALF_LENGTH + 1.8 + row * 1.2));
      scene.add(stand);
    }
  }
  for (const xSide of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, PITCH_LENGTH + 5), concrete[row % 2]!);
      stand.position.set(xSide * (ARENA_WALL_HALF_WIDTH + 1.8 + row * 1.2), 1.8 + row * 0.72, 0);
      scene.add(stand);
    }
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({ color: variant.accent });
  for (let x = -PITCH_HALF_WIDTH + 5; x <= PITCH_HALF_WIDTH - 5; x += 8) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), bannerMaterial);
    banner.name = 'stadium-reactive-banner';
    banner.position.set(x, 0.72, -ARENA_WALL_HALF_LENGTH + 0.24);
    scene.add(banner);
  }
}

function addPresentationDressing(scene: THREE.Object3D, variant: StadiumVariant): void {
  const mastMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    metalness: 0.72,
    roughness: 0.32,
  });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: variant.keyLight });
  const mastGeometry = new THREE.CylinderGeometry(0.14, 0.2, 11, 7);
  const lampGeometry = new THREE.BoxGeometry(3.4, 1.05, 0.28);
  for (const x of [-PITCH_HALF_WIDTH - 6, PITCH_HALF_WIDTH + 6]) {
    for (const z of [-PITCH_HALF_LENGTH * 0.58, PITCH_HALF_LENGTH * 0.58]) {
      const rig = new THREE.Group();
      rig.name = 'stadium-floodlight-rig';
      const mast = new THREE.Mesh(mastGeometry, mastMaterial);
      mast.position.y = 5.5;
      const lamps = new THREE.Mesh(lampGeometry, lampMaterial);
      lamps.position.y = 10.7;
      lamps.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      rig.position.set(x, 0, z);
      rig.add(mast, lamps);
      scene.add(rig);
    }
  }

  const flagMaterial = new THREE.MeshBasicMaterial({
    color: variant.accent,
    side: THREE.DoubleSide,
  });
  const poleGeometry = new THREE.CylinderGeometry(0.035, 0.045, 2.2, 6);
  for (const x of [-PITCH_HALF_WIDTH, PITCH_HALF_WIDTH]) {
    for (const z of [-PITCH_HALF_LENGTH, PITCH_HALF_LENGTH]) {
      const pole = new THREE.Mesh(poleGeometry, mastMaterial);
      pole.position.set(x, 1.1, z);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48), flagMaterial);
      flag.name = 'stadium-corner-flag';
      flag.position.set(x + (x < 0 ? 0.38 : -0.38), 1.86, z);
      flag.rotation.y = x < 0 ? 0 : Math.PI;
      scene.add(pole, flag);
    }
  }
}

function addReactiveProps(scene: THREE.Object3D, variant: StadiumVariant): void {
  const structure = new THREE.MeshStandardMaterial({
    color: variant.stand[1],
    roughness: 0.58,
    metalness: 0.24,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: variant.accent,
    emissive: variant.accent,
    emissiveIntensity: 0.34,
    transparent: true,
    opacity: 0.92,
    roughness: 0.34,
  });
  const placements: readonly (readonly [number, number])[] = [
    [-PITCH_HALF_WIDTH - 2.4, -PITCH_HALF_LENGTH * 0.38],
    [-PITCH_HALF_WIDTH - 2.4, PITCH_HALF_LENGTH * 0.38],
    [PITCH_HALF_WIDTH + 2.4, -PITCH_HALF_LENGTH * 0.38],
    [PITCH_HALF_WIDTH + 2.4, PITCH_HALF_LENGTH * 0.38],
  ];
  for (let index = 0; index < placements.length; index += 1) {
    const [x, z] = placements[index]!;
    const prop = new THREE.Group();
    prop.name = 'stadium-reactive-prop';
    prop.userData.propKind = variant.architecture;
    prop.userData.propIndex = index;
    prop.position.set(x, 0, z);
    prop.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;

    if (variant.architecture === 'gothic') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), structure);
      base.position.y = 0.55;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.5, 5), accent);
      crown.position.y = 2.15;
      prop.add(base, crown);
    } else if (variant.architecture === 'bowl') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.15, 12), accent);
      drum.rotation.z = Math.PI / 2;
      drum.position.y = 1.25;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.22), structure);
      stand.position.y = 0.9;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.7), structure);
      foot.position.y = 0.11;
      prop.add(drum, stand, foot);
    } else if (variant.architecture === 'cathedral') {
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.34), structure);
      const right = left.clone();
      left.position.set(-0.82, 1.6, 0);
      right.position.set(0.82, 1.6, 0);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.35), accent);
      pane.position.set(0, 1.75, -0.2);
      const arch = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 0.34), structure);
      arch.position.y = 3.1;
      prop.add(left, right, pane, arch);
    } else if (variant.architecture === 'colosseum') {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.55, 1.45), structure);
      plinth.position.y = 0.28;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 1.5, 9), structure);
      stem.position.y = 1.25;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.38, 1.15, 10), accent);
      cup.position.y = 2.45;
      prop.add(plinth, stem, cup);
    } else {
      for (let shard = 0; shard < 3; shard += 1) {
        const crystal = new THREE.Mesh(
          new THREE.ConeGeometry(0.55 - shard * 0.08, 2.5 - shard * 0.35, 5),
          shard === 1 ? structure : accent,
        );
        crystal.position.set((shard - 1) * 0.58, 1.05 + (2 - shard) * 0.2, (shard % 2) * 0.24);
        crystal.rotation.z = (shard - 1) * 0.2;
        prop.add(crystal);
      }
    }
    scene.add(prop);
  }
}

function addCrowdSilhouettes(scene: THREE.Object3D, variant: StadiumVariant): void {
  const columns = 38;
  const rows = 3;
  const count = columns * rows * 2;
  const bodyGeometry = new THREE.CylinderGeometry(0.16, 0.22, 0.42, 5);
  const headGeometry = new THREE.DodecahedronGeometry(0.15, 0);
  const material = new THREE.MeshStandardMaterial({
    color: variant.crowd[0],
    emissive: variant.wall,
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
        const x = -38.85 + column * 2.1;
        const z = zSide * (ARENA_WALL_HALF_LENGTH + 0.98 + row * 1.2);
        const baseY = 2.28 + row * 0.72 + (column % 2) * 0.04;
        matrix.makeTranslation(x, baseY, z);
        bodies.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, baseY + 0.36, z);
        heads.setMatrixAt(index, matrix);
        color.setHex(variant.crowd[column % 3]!);
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

function addArchitecture(scene: THREE.Object3D, variant: StadiumVariant): void {
  const group = new THREE.Group();
  group.name = `stadium-architecture-${variant.architecture}`;
  const stone = new THREE.MeshStandardMaterial({ color: variant.stand[1], roughness: 0.78, metalness: 0.08 });
  const glow = new THREE.MeshBasicMaterial({ color: variant.accent, transparent: true, opacity: 0.72 });

  if (variant.architecture === 'gothic' || variant.architecture === 'cathedral') {
    const towerGeometry = new THREE.BoxGeometry(2.8, variant.architecture === 'cathedral' ? 10 : 8, 2.8);
    const spireGeometry = new THREE.ConeGeometry(2.3, 5, 4);
    for (const x of [-PITCH_HALF_WIDTH - 7, PITCH_HALF_WIDTH + 7]) {
      for (const z of [-PITCH_HALF_LENGTH - 7, PITCH_HALF_LENGTH + 7]) {
        const tower = new THREE.Mesh(towerGeometry, stone);
        tower.position.set(x, towerGeometry.parameters.height / 2, z);
        tower.castShadow = true;
        const spire = new THREE.Mesh(spireGeometry, glow);
        spire.position.set(x, towerGeometry.parameters.height + 2.5, z);
        group.add(tower, spire);
      }
    }
  } else if (variant.architecture === 'bowl') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PITCH_HALF_WIDTH + 10, 0.55, 8, 96), glow);
    ring.name = 'stadium-bowl-halo';
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = PITCH_LENGTH / PITCH_WIDTH;
    ring.position.y = 8;
    group.add(ring);
  } else if (variant.architecture === 'colosseum') {
    const columnGeometry = new THREE.CylinderGeometry(0.65, 0.8, 7, 8);
    for (let z = -PITCH_HALF_LENGTH + 7; z <= PITCH_HALF_LENGTH - 7; z += 10) {
      for (const x of [-PITCH_HALF_WIDTH - 8, PITCH_HALF_WIDTH + 8]) {
        const column = new THREE.Mesh(columnGeometry, stone);
        column.position.set(x, 4.2, z);
        group.add(column);
      }
    }
  } else {
    const battlementGeometry = new THREE.BoxGeometry(3, 2.8, 3);
    for (let z = -PITCH_HALF_LENGTH; z <= PITCH_HALF_LENGTH; z += 9) {
      for (const x of [-PITCH_HALF_WIDTH - 7, PITCH_HALF_WIDTH + 7]) {
        const battlement = new THREE.Mesh(battlementGeometry, stone);
        battlement.position.set(x, 5.2 + (Math.abs(z) % 18 === 0 ? 1.2 : 0), z);
        group.add(battlement);
      }
    }
  }
  scene.add(group);
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments
    ))
      return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
