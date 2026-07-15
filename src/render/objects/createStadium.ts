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

  addAdvertisingBoards(stadium, variant);

  addGoal(stadium, -1, variant);
  addGoal(stadium, 1, variant);
  addArenaRails(stadium, variant);
  addUpperFence(stadium, variant);
  addStands(stadium, variant);
  addArchitecture(stadium, variant);
  addCrowdSilhouettes(stadium, variant);
  addPresentationDressing(stadium, variant);
  addTechnicalAreas(stadium, variant);
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

/**
 * The boards deliberately remain on the physical arena perimeter, but are presented as
 * recognizable pitch-side advertising runs rather than four monolithic concrete blocks.
 * The thin backplates preserve the old dimensions for visual/collider alignment while the
 * segmented faces, kick rails and stanchions provide scale and football vocabulary.
 */
function addAdvertisingBoards(scene: THREE.Object3D, variant: StadiumVariant): void {
  const backMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    roughness: 0.66,
    metalness: 0.34,
  });
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: variant.stand[0],
    emissive: variant.accent,
    emissiveIntensity: 0.16,
    roughness: 0.52,
    metalness: 0.18,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: variant.accent,
    emissive: variant.accent,
    emissiveIntensity: 0.42,
    roughness: 0.35,
    metalness: 0.58,
  });

  const addRun = (axis: 'x' | 'z', side: -1 | 1): void => {
    const run = new THREE.Group();
    run.name = 'stadium-advertising-board-run';
    run.userData.axis = axis;
    const length = axis === 'x' ? ARENA_WALL_HALF_WIDTH * 2 + 0.4 : ARENA_WALL_HALF_LENGTH * 2;
    const backplate = new THREE.Mesh(
      axis === 'x' ? new THREE.BoxGeometry(length, 1.12, 0.18) : new THREE.BoxGeometry(0.18, 1.12, length),
      backMaterial,
    );
    // Retain this compatibility name: it identifies the non-gameplay presentation aligned to the wall collider.
    backplate.name = 'arena-board';
    backplate.position.y = 0.56;
    backplate.castShadow = true;
    backplate.receiveShadow = true;
    run.add(backplate);

    const panelCount = axis === 'x' ? 12 : 18;
    const panelLength = length / panelCount - 0.16;
    for (let index = 0; index < panelCount; index += 1) {
      const along = -length / 2 + ((index + 0.5) * length) / panelCount;
      const panel = new THREE.Mesh(
        axis === 'x' ? new THREE.PlaneGeometry(panelLength, 0.7) : new THREE.PlaneGeometry(panelLength, 0.7),
        index % 3 === 0 ? trimMaterial : faceMaterial,
      );
      panel.name = 'stadium-advertising-panel';
      panel.position.y = 0.62;
      if (axis === 'x') {
        panel.position.set(along, 0.62, -side * 0.101);
        panel.rotation.y = side === -1 ? Math.PI : 0;
      } else {
        panel.position.set(-side * 0.101, 0.62, along);
        panel.rotation.y = side === -1 ? -Math.PI / 2 : Math.PI / 2;
      }
      run.add(panel);
    }

    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, length, 7), trimMaterial);
    rail.name = 'stadium-board-kick-rail';
    rail.position.y = 1.17;
    if (axis === 'x') rail.rotation.z = Math.PI / 2;
    else rail.rotation.x = Math.PI / 2;
    run.add(rail);

    if (axis === 'x') run.position.z = side * ARENA_WALL_HALF_LENGTH;
    else run.position.x = side * ARENA_WALL_HALF_WIDTH;
    scene.add(run);
  };

  addRun('x', -1);
  addRun('x', 1);
  addRun('z', -1);
  addRun('z', 1);
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
    post.name = 'goal-upright';
    post.position.set(x, GOAL_HEIGHT / 2, 0);
    post.castShadow = true;
    group.add(post);
    const backPost = new THREE.Mesh(postGeometry, material);
    backPost.name = 'goal-net-support';
    backPost.position.set(x, GOAL_HEIGHT / 2, backZ);
    group.add(backPost);
    const depthBar = new THREE.Mesh(depthGeometry, material);
    depthBar.name = 'goal-roof-support';
    depthBar.position.set(x, GOAL_HEIGHT, backZ * 0.5);
    depthBar.rotation.x = Math.PI / 2;
    group.add(depthBar);
  }
  const bar = new THREE.Mesh(crossbarGeometry, material);
  bar.name = 'goal-crossbar';
  bar.rotation.z = Math.PI / 2;
  bar.position.y = GOAL_HEIGHT;
  const backBar = bar.clone();
  backBar.name = 'goal-backbar';
  backBar.position.z = backZ;
  group.add(bar, backBar);

  const netPoints: THREE.Vector3[] = [];
  for (let row = 0; row <= 7; row += 1) {
    const y = (row / 7) * GOAL_HEIGHT;
    netPoints.push(
      new THREE.Vector3(-GOAL_HALF_WIDTH, y, backZ),
      new THREE.Vector3(GOAL_HALF_WIDTH, y, backZ),
    );
  }
  for (let column = 0; column <= 12; column += 1) {
    const x = -GOAL_HALF_WIDTH + (column / 12) * GOAL_WIDTH;
    netPoints.push(new THREE.Vector3(x, 0, backZ), new THREE.Vector3(x, GOAL_HEIGHT, backZ));
    // Roof and ground netting make the cage read in depth from the chase camera.
    netPoints.push(new THREE.Vector3(x, GOAL_HEIGHT, 0), new THREE.Vector3(x, GOAL_HEIGHT, backZ));
    netPoints.push(new THREE.Vector3(x, 0.025, 0), new THREE.Vector3(x, 0.025, backZ));
  }
  for (let depthIndex = 0; depthIndex <= 5; depthIndex += 1) {
    const z = (depthIndex / 5) * backZ;
    netPoints.push(
      new THREE.Vector3(-GOAL_HALF_WIDTH, GOAL_HEIGHT, z),
      new THREE.Vector3(GOAL_HALF_WIDTH, GOAL_HEIGHT, z),
    );
    for (const x of [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH]) {
      netPoints.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, GOAL_HEIGHT, z));
    }
  }
  const net = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(netPoints),
    new THREE.LineBasicMaterial({ color: frameColor, transparent: true, opacity: 0.34 }),
  );
  net.name = 'goal-net';
  group.add(net);

  const anchorMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    metalness: 0.74,
    roughness: 0.3,
  });
  const anchorGeometry = new THREE.CylinderGeometry(0.3, 0.38, 0.12, 8);
  for (const x of [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH]) {
    for (const z of [0, backZ]) {
      const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
      anchor.name = 'goal-ground-anchor';
      anchor.position.set(x, 0.06, z);
      group.add(anchor);
    }
  }

  const crest = new THREE.Group();
  crest.name = 'goal-gothic-crest';
  const crestRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.075, 6, 18), material);
  crestRing.rotation.x = Math.PI / 2;
  const crestSpike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 5), material);
  crestSpike.position.y = 0.72;
  crest.add(crestRing, crestSpike);
  crest.position.set(0, GOAL_HEIGHT + 0.52, backZ);
  group.add(crest);

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
  const stands = new THREE.Group();
  stands.name = 'stadium-terraced-stands';
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
      stand.name = 'stadium-seating-tier';
      stand.position.set(0, 1.8 + row * 0.72, zSide * (ARENA_WALL_HALF_LENGTH + 1.8 + row * 1.2));
      stand.castShadow = row === 3;
      stand.receiveShadow = true;
      stands.add(stand);
    }
  }
  for (const xSide of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, PITCH_LENGTH + 5), concrete[row % 2]!);
      stand.name = 'stadium-seating-tier';
      stand.position.set(xSide * (ARENA_WALL_HALF_WIDTH + 1.8 + row * 1.2), 1.8 + row * 0.72, 0);
      stand.castShadow = row === 2;
      stand.receiveShadow = true;
      stands.add(stand);
    }
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({ color: variant.accent });
  for (let x = -PITCH_HALF_WIDTH + 5; x <= PITCH_HALF_WIDTH - 5; x += 8) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), bannerMaterial);
    banner.name = 'stadium-reactive-banner';
    banner.position.set(x, 0.72, -ARENA_WALL_HALF_LENGTH + 0.24);
    stands.add(banner);
  }
  const aisleMaterial = new THREE.MeshBasicMaterial({
    color: variant.line,
    transparent: true,
    opacity: 0.42,
  });
  for (const x of [-PITCH_HALF_WIDTH * 0.66, 0, PITCH_HALF_WIDTH * 0.66]) {
    for (const zSide of [-1, 1]) {
      const aisle = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6.8), aisleMaterial);
      aisle.name = 'stadium-stand-aisle';
      aisle.rotation.x = -Math.PI / 2;
      aisle.position.set(x, 4.15, zSide * (ARENA_WALL_HALF_LENGTH + 4.9));
      aisle.rotation.z = zSide * 0.2;
      stands.add(aisle);
    }
  }
  scene.add(stands);
}

function addPresentationDressing(scene: THREE.Object3D, variant: StadiumVariant): void {
  const mastMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    metalness: 0.72,
    roughness: 0.32,
  });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: variant.keyLight });
  const mastGeometry = new THREE.CylinderGeometry(0.14, 0.2, 11, 7);
  const trussGeometry = new THREE.CylinderGeometry(0.075, 0.075, 3.6, 6);
  const lampGeometry = new THREE.CylinderGeometry(0.25, 0.34, 0.28, 8);
  for (const x of [-PITCH_HALF_WIDTH - 6, PITCH_HALF_WIDTH + 6]) {
    for (const z of [-PITCH_HALF_LENGTH * 0.58, PITCH_HALF_LENGTH * 0.58]) {
      const rig = new THREE.Group();
      rig.name = 'stadium-floodlight-rig';
      const mast = new THREE.Mesh(mastGeometry, mastMaterial);
      mast.position.y = 5.5;
      const truss = new THREE.Mesh(trussGeometry, mastMaterial);
      truss.name = 'stadium-floodlight-truss';
      truss.position.y = 10.7;
      truss.rotation.z = Math.PI / 2;
      rig.position.set(x, 0, z);
      rig.add(mast, truss);
      for (let lampIndex = 0; lampIndex < 6; lampIndex += 1) {
        const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
        lamp.name = 'stadium-floodlight-lamp';
        lamp.position.set(-1.45 + lampIndex * 0.58, 10.7, 0);
        lamp.rotation.x = Math.PI / 2;
        lamp.rotation.z = x < 0 ? -0.28 : 0.28;
        rig.add(lamp);
      }
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

function addTechnicalAreas(scene: THREE.Object3D, variant: StadiumVariant): void {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: variant.wall,
    metalness: 0.64,
    roughness: 0.36,
  });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: variant.accent,
    emissive: variant.accent,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.3,
    roughness: 0.18,
    metalness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const upholsteryMaterial = new THREE.MeshStandardMaterial({
    color: variant.stand[1],
    roughness: 0.82,
  });
  const coffinMaterial = new THREE.MeshStandardMaterial({
    color: 0x241315,
    metalness: 0.18,
    roughness: 0.72,
  });
  const canopyGeometry = new THREE.CylinderGeometry(1.65, 1.65, 7.8, 12, 1, true, 0, Math.PI);
  const frameGeometry = new THREE.CylinderGeometry(0.045, 0.045, 7.8, 6);

  for (const zSide of [-1, 1] as const) {
    const area = new THREE.Group();
    area.name = zSide === -1 ? 'opponent-technical-area' : 'home-technical-area';
    area.position.set(PITCH_HALF_WIDTH + 3.15, 0, zSide * PITCH_HALF_LENGTH * 0.23);
    area.rotation.y = Math.PI / 2;

    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.name = 'stadium-dugout-canopy';
    canopy.rotation.z = Math.PI / 2;
    canopy.position.y = 1.52;
    area.add(canopy);

    for (const z of [-1.5, 1.5]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.045, 5, 16, Math.PI), frameMaterial);
      rib.name = 'stadium-dugout-rib';
      rib.position.set(z, 1.52, 0);
      rib.rotation.y = Math.PI / 2;
      rib.rotation.z = Math.PI / 2;
      area.add(rib);
    }
    const crownRail = new THREE.Mesh(frameGeometry, frameMaterial);
    crownRail.name = 'stadium-dugout-crown-rail';
    crownRail.rotation.z = Math.PI / 2;
    crownRail.position.y = 3.17;
    area.add(crownRail);

    for (let seatIndex = 0; seatIndex < 5; seatIndex += 1) {
      const seat = new THREE.Group();
      seat.name = 'stadium-dugout-seat';
      const cushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.42, 3, 6), upholsteryMaterial);
      cushion.rotation.z = Math.PI / 2;
      cushion.scale.set(1, 0.6, 1);
      cushion.position.y = 0.66;
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.5, 3, 6), upholsteryMaterial);
      back.position.set(0, 1.07, 0.22);
      back.rotation.x = -0.12;
      seat.position.x = -2.7 + seatIndex * 1.35;
      seat.add(cushion, back);
      area.add(seat);
    }

    const coffin = new THREE.Group();
    coffin.name = 'stadium-equipment-coffin';
    const coffinShape = new THREE.Shape();
    coffinShape.moveTo(-0.5, -1.1);
    coffinShape.lineTo(0.5, -1.1);
    coffinShape.lineTo(0.68, 0.55);
    coffinShape.lineTo(0.36, 1.08);
    coffinShape.lineTo(-0.36, 1.08);
    coffinShape.lineTo(-0.68, 0.55);
    coffinShape.closePath();
    const coffinBody = new THREE.Mesh(
      new THREE.ExtrudeGeometry(coffinShape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.04,
      }),
      coffinMaterial,
    );
    coffinBody.scale.setScalar(0.55);
    coffinBody.rotation.x = -Math.PI / 2;
    coffinBody.position.set(3.9, 0.14, 0.55);
    coffin.add(coffinBody);
    area.add(coffin);
    scene.add(area);
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

  const supporterFlagGeometry = new THREE.PlaneGeometry(0.9, 0.58, 3, 2);
  const supporterFlagMaterial = new THREE.MeshBasicMaterial({
    color: variant.accent,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const supporterPoleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1.55, 5);
  const supporterPoleMaterial = new THREE.MeshStandardMaterial({
    color: variant.line,
    metalness: 0.45,
    roughness: 0.4,
  });
  for (let index = 0; index < 10; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const group = new THREE.Group();
    group.name = 'stadium-supporter-group';
    group.userData.reactionPhase = index * 0.73;
    group.position.set(-31.5 + Math.floor(index / 2) * 15.7, 3.45, side * (ARENA_WALL_HALF_LENGTH + 2.25));
    const pole = new THREE.Mesh(supporterPoleGeometry, supporterPoleMaterial);
    pole.name = 'stadium-supporter-flag-pole';
    pole.position.y = 0.65;
    const flag = new THREE.Mesh(supporterFlagGeometry, supporterFlagMaterial);
    flag.name = 'stadium-supporter-flag';
    flag.position.set(0.46, 1.14, 0);
    flag.rotation.y = side < 0 ? 0 : Math.PI;
    group.add(pole, flag);
    scene.add(group);
  }
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
        const towerAssembly = new THREE.Group();
        towerAssembly.name = 'stadium-gothic-tower';
        const tower = new THREE.Mesh(towerGeometry, stone);
        tower.name = 'stadium-gothic-tower-core';
        tower.position.y = towerGeometry.parameters.height / 2;
        tower.castShadow = true;
        const spire = new THREE.Mesh(spireGeometry, glow);
        spire.name = 'stadium-gothic-spire';
        spire.position.y = towerGeometry.parameters.height + 2.5;
        towerAssembly.add(tower, spire);
        for (const xOffset of [-1.5, 1.5]) {
          const buttress = new THREE.Mesh(new THREE.ConeGeometry(0.55, 5.4, 4), stone);
          buttress.name = 'stadium-flying-buttress';
          buttress.position.set(xOffset, 2.7, 0);
          towerAssembly.add(buttress);
        }
        for (const y of [2.2, 4.6, 6.8]) {
          const window = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 2, 6), glow);
          window.name = 'stadium-lancet-window';
          window.scale.z = 0.12;
          window.position.set(0, y, z < 0 ? 1.415 : -1.415);
          towerAssembly.add(window);
        }
        towerAssembly.position.set(x, 0, z);
        group.add(towerAssembly);
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
    const battlementGeometry = new THREE.CylinderGeometry(1.7, 1.95, 3.8, 8);
    for (let z = -PITCH_HALF_LENGTH; z <= PITCH_HALF_LENGTH; z += 9) {
      for (const x of [-PITCH_HALF_WIDTH - 7, PITCH_HALF_WIDTH + 7]) {
        const bastion = new THREE.Group();
        bastion.name = 'stadium-fortress-bastion';
        const battlement = new THREE.Mesh(battlementGeometry, stone);
        battlement.name = 'stadium-fortress-tower';
        battlement.position.y = 4.7 + (Math.abs(z) % 18 === 0 ? 1.2 : 0);
        bastion.add(battlement);
        for (let merlonIndex = 0; merlonIndex < 6; merlonIndex += 1) {
          const angle = (merlonIndex / 6) * Math.PI * 2;
          const merlon = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.34, 0.75, 5), stone);
          merlon.name = 'stadium-fortress-merlon';
          merlon.position.set(Math.cos(angle) * 1.38, battlement.position.y + 2.18, Math.sin(angle) * 1.38);
          bastion.add(merlon);
        }
        bastion.position.set(x, 0, z);
        group.add(bastion);
      }
    }
  }
  scene.add(group);
}

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments
    ))
      return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
