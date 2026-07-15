import * as THREE from 'three';

export interface GpuIdentity {
  readonly name: string;
  readonly vendor: string;
  readonly memoryLabel: 'UNIFIED' | 'VRAM NOT EXPOSED';
}

interface DebugRendererInfoExtension {
  readonly UNMASKED_VENDOR_WEBGL: number;
  readonly UNMASKED_RENDERER_WEBGL: number;
}

/** Reads the most specific renderer string that WebGL privacy policy permits. */
export function readGpuIdentity(renderer: THREE.WebGLRenderer): GpuIdentity {
  const gl = renderer.getContext();
  let vendor = 'WebGL';
  let rawRenderer = 'GPU renderer unavailable';
  try {
    const extension = gl.getExtension('WEBGL_debug_renderer_info') as DebugRendererInfoExtension | null;
    if (extension) {
      vendor = String(gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) || vendor);
      rawRenderer = String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) || rawRenderer);
    } else {
      vendor = String(gl.getParameter(gl.VENDOR) || vendor);
      rawRenderer = String(gl.getParameter(gl.RENDERER) || rawRenderer);
    }
  } catch {
    // Privacy-hardened browsers may reject the debug extension or parameter read.
  }
  return normalizeGpuIdentity(rawRenderer, vendor);
}

export function normalizeGpuIdentity(rawRenderer: string, rawVendor = ''): GpuIdentity {
  const renderer = rawRenderer.replace(/\s+/g, ' ').trim() || 'GPU renderer unavailable';
  const vendor = normalizeVendor(rawVendor || renderer);
  let name = renderer;

  const metal = renderer.match(/ANGLE Metal Renderer:\s*([^,)]+)/i);
  if (metal?.[1]) name = metal[1].trim();
  else if (/^ANGLE\s*\(/i.test(renderer)) {
    const body = renderer.replace(/^ANGLE\s*\(/i, '').replace(/\)$/, '');
    const candidates = body.split(',').map((part) => part.trim());
    name = candidates.find((part) => /NVIDIA|GeForce|AMD|Radeon|Intel|Apple|Arc\b/i.test(part)) ?? body;
    if (name === candidates[0] && candidates[1]) name = candidates[1];
    name = name
      .replace(/\s+(Direct3D\S*|D3D\S*|OpenGL|Vulkan|Metal).*$/i, '')
      .replace(/\s+vs_\S+.*$/i, '')
      .trim();
  }

  name = name.replace(/^ANGLE Metal Renderer:\s*/i, '').slice(0, 72);
  const unified = /Apple|M\d(?:\s|$|\s*(?:Pro|Max|Ultra))/i.test(`${vendor} ${name}`);
  return Object.freeze({
    name,
    vendor,
    memoryLabel: unified ? 'UNIFIED' : 'VRAM NOT EXPOSED',
  });
}

/**
 * Conservative estimate of buffers and textures directly reachable from the
 * Three scene. Driver allocations, render targets, mip padding, and shared GPU
 * resources are intentionally not presented as physical VRAM usage.
 */
export function estimateSceneGpuBytes(scene: THREE.Object3D): number {
  const buffers = new Set<ArrayBufferLike>();
  const textures = new Set<THREE.Texture>();
  let bytes = 0;

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) collectGeometryBuffers(mesh.geometry, buffers);
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) collectMaterialTextures(material, textures);
  });

  for (const buffer of buffers) bytes += buffer.byteLength;
  for (const texture of textures) bytes += estimateTextureBytes(texture);
  return bytes;
}

export function formatGpuBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function collectGeometryBuffers(geometry: THREE.BufferGeometry, buffers: Set<ArrayBufferLike>): void {
  const attributes = [geometry.index, ...Object.values(geometry.attributes)].filter(
    (attribute): attribute is THREE.BufferAttribute | THREE.InterleavedBufferAttribute => Boolean(attribute),
  );
  for (const morphAttributes of Object.values(geometry.morphAttributes)) attributes.push(...morphAttributes);
  for (const attribute of attributes) {
    const array =
      attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.array : attribute.array;
    buffers.add(array.buffer);
  }
}

function collectMaterialTextures(material: THREE.Material, textures: Set<THREE.Texture>): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) textures.add(value);
  }
}

function estimateTextureBytes(texture: THREE.Texture): number {
  if (texture.mipmaps.length > 0) {
    return texture.mipmaps.reduce((total, mip) => total + imageByteLength(mip), 0);
  }
  const source = texture.image as unknown;
  if (Array.isArray(source)) return source.reduce((total, image) => total + imageByteLength(image), 0);
  const base = imageByteLength(source);
  return texture.generateMipmaps ? Math.ceil((base * 4) / 3) : base;
}

function imageByteLength(image: unknown): number {
  if (!image || typeof image !== 'object') return 0;
  const record = image as { data?: ArrayBufferView; width?: number; height?: number };
  if (ArrayBuffer.isView(record.data)) return record.data.byteLength;
  const width = Number(record.width);
  const height = Number(record.height);
  return Number.isFinite(width) && Number.isFinite(height) ? Math.max(0, width * height * 4) : 0;
}

function normalizeVendor(value: string): string {
  if (/NVIDIA/i.test(value)) return 'NVIDIA';
  if (/AMD|ATI|Radeon/i.test(value)) return 'AMD';
  if (/Apple/i.test(value)) return 'Apple';
  if (/Intel/i.test(value)) return 'Intel';
  if (/Qualcomm|Adreno/i.test(value)) return 'Qualcomm';
  if (/ARM|Mali/i.test(value)) return 'ARM';
  return (
    value
      .replace(/\s+(Corporation|Inc\.?|Technologies).*$/i, '')
      .trim()
      .slice(0, 32) || 'WebGL'
  );
}
