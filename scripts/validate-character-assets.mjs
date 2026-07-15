#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { formatGltfSpecIssue, validateGltfSpec } from './lib/gltf-spec-validation.mjs';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_MANIFEST = path.join(REPO_ROOT, 'src/render/assets/character-asset-manifest.json');

export async function validateCharacterAssets(manifestPath = DEFAULT_MANIFEST) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const character = await inspectGlb(path.resolve(REPO_ROOT, manifest.runtime.character));
  const animations = await inspectGlb(path.resolve(REPO_ROOT, manifest.runtime.animations));
  const errors = [];
  const warnings = [];

  validateDocument('character', character, errors, warnings);
  validateDocument('animation library', animations, errors, warnings);
  validateSkeleton(character, animations, manifest, errors);
  validateCharacter(character, manifest, errors, warnings);
  validateAnimations(animations, manifest, errors, warnings);
  validateVariants(manifest, errors);

  if (character.byteLength > manifest.productionTarget.characterMaxBytes) {
    warnings.push(
      `Character transfer size ${formatBytes(character.byteLength)} exceeds the production target ` +
        `${formatBytes(manifest.productionTarget.characterMaxBytes)}.`,
    );
  }
  if (character.gpuTextureBytes > manifest.productionTarget.maxGpuTextureBytes) {
    warnings.push(
      `Estimated texture memory ${formatBytes(character.gpuTextureBytes)} exceeds the production target ` +
        `${formatBytes(manifest.productionTarget.maxGpuTextureBytes)}; use KTX2 before cloning six texture sets.`,
    );
  }

  return {
    ok: errors.length === 0,
    manifest: path.relative(REPO_ROOT, manifestPath),
    errors,
    warnings,
    character: summarize(character),
    animations: summarize(animations),
    productionAnimationSlots: manifest.productionAnimationSlots,
    variants: manifest.variants.map(({ id, bodyProfile, headProfile, hairProfile, accessory }) => ({
      id,
      bodyProfile,
      headProfile,
      hairProfile,
      accessory,
    })),
  };
}

async function inspectGlb(filePath) {
  const bytes = await readFile(filePath);
  const spec = await validateGltfSpec(filePath);
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${filePath} is not a GLB.`);
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`${filePath} is not glTF 2.0.`);
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`${filePath} has an invalid declared length.`);

  let json;
  let binary = Buffer.alloc(0);
  let offset = 12;
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === JSON_CHUNK) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/u, '').trimEnd());
    if (chunkType === BIN_CHUNK) binary = chunk;
    offset += 8 + chunkLength;
  }
  if (!json) throw new Error(`${filePath} has no JSON chunk.`);

  const scene = json.scenes?.[json.scene ?? 0];
  const sceneRoots = (scene?.nodes ?? []).map((index) => json.nodes?.[index]).filter(Boolean);
  const skins = (json.skins ?? []).map((skin) => ({
    name: skin.name ?? '',
    joints: skin.joints.map((index) => json.nodes?.[index]?.name ?? `#${index}`),
  }));
  const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
  const triangles = primitives.reduce((total, primitive) => {
    if ((primitive.mode ?? 4) !== 4) return total;
    const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
    return total + Math.floor((json.accessors?.[accessorIndex]?.count ?? 0) / 3);
  }, 0);
  const positionBounds = unionPositionBounds(json, primitives);
  const images = (json.images ?? []).map((image) => inspectImage(json, binary, image));
  const gpuTextureBytes = images.reduce((total, image) => total + image.gpuBytes, 0);
  const clips = (json.animations ?? []).map((animation) => inspectAnimation(json, animation));

  return {
    filePath,
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    json,
    sceneRoots,
    skins,
    primitives,
    triangles,
    positionBounds,
    images,
    gpuTextureBytes,
    clips,
    spec,
  };
}

function inspectImage(json, binary, image) {
  const view = json.bufferViews?.[image.bufferView];
  if (!view)
    return { name: image.name ?? '', mimeType: image.mimeType ?? '', width: 0, height: 0, gpuBytes: 0 };
  const start = view.byteOffset ?? 0;
  const data = binary.subarray(start, start + view.byteLength);
  const { width, height } = imageDimensions(data, image.mimeType);
  return {
    name: image.name ?? '',
    mimeType: image.mimeType ?? '',
    width,
    height,
    gpuBytes: Math.ceil(width * height * 4 * (4 / 3)),
  };
}

function imageDimensions(data, mimeType = '') {
  if (mimeType === 'image/png' && data.length >= 24) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (mimeType === 'image/ktx2' && data.length >= 28) {
    return { width: data.readUInt32LE(20), height: data.readUInt32LE(24) };
  }
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 8 < data.length) {
      if (data[offset] !== 0xff) break;
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return { width: 0, height: 0 };
}

function inspectAnimation(json, animation) {
  let duration = 0;
  let keyframes = 0;
  for (const sampler of animation.samplers ?? []) {
    const input = json.accessors?.[sampler.input];
    duration = Math.max(duration, input?.max?.[0] ?? 0);
    keyframes += input?.count ?? 0;
  }
  return { name: animation.name ?? '', duration, channels: animation.channels?.length ?? 0, keyframes };
}

function unionPositionBounds(json, primitives) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of primitives) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min[axis]);
      max[axis] = Math.max(max[axis], accessor.max[axis]);
    }
  }
  return { min, max, height: max[1] - min[1] };
}

function validateDocument(label, asset, errors, warnings) {
  if (asset.json.asset?.version !== '2.0') errors.push(`${label}: glTF asset.version must be 2.0.`);
  if ((asset.json.scenes?.length ?? 0) !== 1) errors.push(`${label}: exactly one scene is required.`);
  for (const issue of asset.spec.issues) {
    const message = `${label} glTF ${issue.severityLabel}: ${formatGltfSpecIssue(issue)}`;
    if (issue.severity === 0) errors.push(message);
    else if (issue.severity === 1) warnings.push(message);
  }
}

function validateSkeleton(character, animations, manifest, errors) {
  const expected = manifest.skeleton.joints;
  const characterSkin = character.skins.find((skin) => skin.name === manifest.skeleton.skinName);
  const animationSkin = animations.skins.find((skin) => skin.name === manifest.skeleton.skinName);
  if (!characterSkin) errors.push(`Character skin '${manifest.skeleton.skinName}' is missing.`);
  if (!animationSkin) errors.push(`Animation skin '${manifest.skeleton.skinName}' is missing.`);
  if (characterSkin && !arraysEqual(characterSkin.joints, expected))
    errors.push('Character joint names/order differ from the manifest.');
  if (animationSkin && !arraysEqual(animationSkin.joints, expected))
    errors.push('Animation joint names/order differ from the manifest.');
  if (characterSkin && animationSkin && !arraysEqual(characterSkin.joints, animationSkin.joints)) {
    errors.push('Character and animation-library skeletons are incompatible.');
  }
  if (!character.sceneRoots.some((node) => node.name === manifest.skeleton.sceneRoot)) {
    errors.push(`Character scene root '${manifest.skeleton.sceneRoot}' is missing.`);
  }
  for (const joint of Object.values(manifest.skeleton.attachmentJoints)) {
    if (!expected.includes(joint)) errors.push(`Attachment joint '${joint}' is not part of the skeleton.`);
  }
}

function validateCharacter(asset, manifest, errors, warnings) {
  const gate = manifest.shippingGate;
  limit(asset.byteLength, gate.characterMaxBytes, 'Character bytes', errors);
  limit(asset.triangles, gate.maxTriangles, 'Character triangles', errors);
  limit(asset.json.materials?.length ?? 0, gate.maxMaterials, 'Character materials', errors);
  limit(asset.images.length, gate.maxTextures, 'Character textures', errors);
  limit(asset.gpuTextureBytes, gate.maxGpuTextureBytes, 'Estimated character texture memory', errors);
  limit(asset.positionBounds.height, gate.maxCharacterHeightMeters, 'Character height', errors);
  limit(asset.json.scenes?.length ?? 0, gate.maxSceneCount, 'Character scenes', errors);
  limit(asset.json.skins?.length ?? 0, gate.maxSkinCount, 'Character skins', errors);
  for (const image of asset.images) {
    limit(
      Math.max(image.width, image.height),
      gate.maxTextureDimension,
      `Texture '${image.name}' dimension`,
      errors,
    );
    if (image.width === 0 || image.height === 0)
      errors.push(`Texture '${image.name}' dimensions could not be read.`);
  }
  if (!gate.allowCameras && (asset.json.cameras?.length ?? 0) > 0)
    errors.push('Character must not contain cameras.');
  if (!gate.allowLights && (asset.json.extensions?.KHR_lights_punctual?.lights?.length ?? 0) > 0) {
    errors.push('Character must not contain punctual lights.');
  }
  if (
    !asset.primitives.every(
      (primitive) =>
        primitive.attributes?.JOINTS_0 !== undefined && primitive.attributes?.WEIGHTS_0 !== undefined,
    )
  ) {
    errors.push('Every character primitive must be skinned with JOINTS_0 and WEIGHTS_0.');
  }
  if (manifest.coordinateContract.identitySceneRootTransform) {
    for (const root of asset.sceneRoots)
      if (!isIdentityTransform(root))
        errors.push(`Scene root '${root.name}' must have an identity transform.`);
  }
  if (
    Math.abs(asset.positionBounds.min[1] - manifest.coordinateContract.feetAtY) >
    manifest.coordinateContract.feetToleranceMeters
  ) {
    errors.push(
      `Character feet are at Y=${asset.positionBounds.min[1].toFixed(4)}, outside the permitted ground tolerance.`,
    );
  }
  if ((asset.json.materials ?? []).some((material) => material.doubleSided)) {
    warnings.push(
      'One or more character materials are double-sided; disable this after checking hair/face normals to reduce fragment work.',
    );
  }
}

function validateAnimations(asset, manifest, errors, warnings) {
  limit(asset.byteLength, manifest.shippingGate.animationMaxBytes, 'Animation-library bytes', errors);
  const names = new Set(asset.clips.map((clip) => clip.name));
  for (const clip of manifest.runtimeRequiredClips)
    if (!names.has(clip)) errors.push(`Runtime-required clip '${clip}' is missing.`);
  for (const slot of manifest.productionAnimationSlots) {
    if (slot.source !== 'runtime-web-authored' && slot.clip && !names.has(slot.clip))
      errors.push(`Animation slot '${slot.slot}' references missing clip '${slot.clip}'.`);
  }
  const incomplete = manifest.productionAnimationSlots.filter((slot) => slot.status !== 'usable');
  if (incomplete.length > 0)
    warnings.push(
      `${incomplete.length} of ${manifest.productionAnimationSlots.length} production animation slots still need authored replacements.`,
    );
}

function validateVariants(manifest, errors) {
  const required = manifest.variantCompatibility.requiredVariantIds;
  const actual = manifest.variants.map((variant) => variant.id);
  if (!arraysEqual(actual, required))
    errors.push('Six-variant IDs/order differ from the compatibility contract.');
  if (new Set(actual).size !== actual.length) errors.push('Variant IDs must be unique.');
  for (const variant of manifest.variants) {
    for (const field of ['bodyProfile', 'headProfile', 'hairProfile', 'accessory']) {
      if (!variant[field]) errors.push(`Variant '${variant.id}' has no ${field}.`);
    }
  }
}

function summarize(asset) {
  return {
    path: path.relative(REPO_ROOT, asset.filePath),
    sha256: asset.sha256,
    bytes: asset.byteLength,
    triangles: asset.triangles,
    materials: asset.json.materials?.length ?? 0,
    textures: asset.images.length,
    gpuTextureBytes: asset.gpuTextureBytes,
    bounds: asset.positionBounds,
    skins: asset.skins.map((skin) => ({ name: skin.name, joints: skin.joints.length })),
    clips: asset.clips,
    spec: {
      validatorVersion: asset.spec.validatorVersion,
      errors: asset.spec.errors,
      warnings: asset.spec.warnings,
      infos: asset.spec.infos,
      hints: asset.spec.hints,
    },
  };
}

function isIdentityTransform(node) {
  return (
    arraysEqual(node.translation ?? [0, 0, 0], [0, 0, 0]) &&
    arraysEqual(node.rotation ?? [0, 0, 0, 1], [0, 0, 0, 1]) &&
    arraysEqual(node.scale ?? [1, 1, 1], [1, 1, 1])
  );
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function limit(actual, maximum, label, errors) {
  if (actual > maximum) errors.push(`${label} ${actual} exceeds ${maximum}.`);
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

async function main() {
  const jsonOutput = process.argv.includes('--json');
  const manifestFlag = process.argv.indexOf('--manifest');
  const manifestPath = manifestFlag >= 0 ? path.resolve(process.argv[manifestFlag + 1]) : DEFAULT_MANIFEST;
  const result = await validateCharacterAssets(manifestPath);
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(result.ok ? 'PASS character asset shipping gate' : 'FAIL character asset shipping gate');
    console.log(
      `Character: ${result.character.triangles} triangles, ${formatBytes(result.character.bytes)}, ${formatBytes(result.character.gpuTextureBytes)} texture memory`,
    );
    console.log(
      `Animations: ${result.animations.clips.length} clips, ${formatBytes(result.animations.bytes)}`,
    );
    for (const warning of result.warnings) console.warn(`WARN ${warning}`);
    for (const error of result.errors) console.error(`ERROR ${error}`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
