import * as THREE from 'three';

export interface FootballVisualOptions {
  readonly radius?: number;
  readonly primary?: number;
  readonly darkPanel?: number;
  readonly accentPanel?: number;
}

/**
 * Creates one draw-call football with deterministic face-level panel colors.
 * The triangular low-poly seams read clearly at gameplay distance without a
 * downloaded texture or per-panel mesh allocation.
 */
export function createFootballVisual(options: FootballVisualOptions = {}): THREE.Mesh {
  const radius = options.radius ?? 0.42;
  const geometry = createPanelledFootballGeometry(
    radius,
    options.primary ?? 0xeee9da,
    options.darkPanel ?? 0x18151c,
    options.accentPanel ?? 0x9f173a,
  );
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.06,
    flatShading: false,
  });
  const ball = new THREE.Mesh(geometry, material);
  ball.name = 'panelled-blood-league-football';
  ball.castShadow = true;
  ball.userData.visualRole = 'primary-football';
  ball.userData.panelStyle = 'ivory-charcoal-crimson';
  return ball;
}

export function createPanelledFootballGeometry(
  radius = 0.42,
  primary = 0xeee9da,
  darkPanel = 0x18151c,
  accentPanel = 0x9f173a,
): THREE.BufferGeometry {
  const source = new THREE.IcosahedronGeometry(radius, 2);
  const geometry = source.index ? source.toNonIndexed() : source;
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const palette = [new THREE.Color(primary), new THREE.Color(darkPanel), new THREE.Color(accentPanel)];

  for (let face = 0; face < position.count / 3; face += 1) {
    const offset = face * 3;
    const x = position.getX(offset) + position.getX(offset + 1) + position.getX(offset + 2);
    const y = position.getY(offset) + position.getY(offset + 1) + position.getY(offset + 2);
    const z = position.getZ(offset) + position.getZ(offset + 1) + position.getZ(offset + 2);
    const signature = Math.abs(Math.round(x * 97 + y * 193 + z * 389));
    const paletteIndex = signature % 19 === 0 ? 2 : signature % 5 === 0 ? 1 : 0;
    const color = palette[paletteIndex]!;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const colorOffset = (offset + vertex) * 3;
      colors[colorOffset] = color.r;
      colors[colorOffset + 1] = color.g;
      colors[colorOffset + 2] = color.b;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
