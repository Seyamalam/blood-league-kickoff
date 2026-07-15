import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { estimateSceneGpuBytes, formatGpuBytes, normalizeGpuIdentity } from './GpuMetrics';

describe('GPU diagnostics', () => {
  it('extracts Apple silicon from an ANGLE Metal renderer', () => {
    expect(
      normalizeGpuIdentity('ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Pro, Unspecified Version)', 'Apple'),
    ).toEqual({ name: 'Apple M5 Pro', vendor: 'Apple', memoryLabel: 'UNIFIED' });
  });

  it('extracts common dedicated GPU names without claiming physical VRAM', () => {
    expect(
      normalizeGpuIdentity(
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        'NVIDIA Corporation',
      ),
    ).toEqual({ name: 'NVIDIA GeForce RTX 4070', vendor: 'NVIDIA', memoryLabel: 'VRAM NOT EXPOSED' });
  });

  it('deduplicates shared geometry buffers and estimates texture storage', () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    const texture = new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4);
    texture.generateMipmaps = false;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));

    expect(estimateSceneGpuBytes(scene)).toBe(9 * 4 + 4 * 4 * 4);
    expect(formatGpuBytes(10.25 * 1024 * 1024)).toBe('10.3 MB');
  });
});
