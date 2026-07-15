#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { formatGltfSpecIssue, validateGltfSpec } from './lib/gltf-spec-validation.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'src/render/assets/character-asset-manifest.json');
const GLTF_TRANSFORM = path.join(REPO_ROOT, 'node_modules/.bin/gltf-transform');
const CANDIDATE_DIR = path.join(REPO_ROOT, 'artifacts/asset-candidates');

async function canonicalAssets() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  return [manifest.runtime.character, manifest.runtime.animations].map((assetPath) =>
    path.resolve(REPO_ROOT, assetPath),
  );
}

function resolveInput(value) {
  return path.resolve(process.cwd(), value);
}

async function validate(paths) {
  let failed = false;
  for (const filePath of paths) {
    const report = await validateGltfSpec(filePath);
    console.log(
      `${report.ok ? 'PASS' : 'FAIL'} ${path.relative(REPO_ROOT, filePath)}: ` +
        `${report.errors} errors, ${report.warnings} warnings, ${report.infos} infos, ${report.hints} hints`,
    );
    for (const issue of report.issues) {
      if (issue.severity > 1) continue;
      console.log(`  ${issue.severityLabel.toUpperCase()} ${formatGltfSpecIssue(issue)}`);
    }
    failed ||= !report.ok;
  }
  if (failed) process.exitCode = 1;
}

async function inspect(paths) {
  for (const filePath of paths) await run(GLTF_TRANSFORM, ['inspect', filePath]);
}

async function optimize(args, canonical) {
  const inputArg = args.find((arg) => !arg.startsWith('--'));
  if (!inputArg) throw new Error('Usage: npm run assets:gltf:optimize -- <input.glb> [--meshopt] [--ktx2]');

  const input = resolveInput(inputArg);
  const canonicalSet = new Set(canonical.map((filePath) => path.resolve(filePath)));
  const baseName = `${path.basename(input, path.extname(input))}.candidate.glb`;
  const output = path.join(CANDIDATE_DIR, baseName);
  if (path.resolve(input) === path.resolve(output) || canonicalSet.has(path.resolve(output))) {
    throw new Error('Optimization output may never replace a canonical runtime input.');
  }

  await mkdir(CANDIDATE_DIR, { recursive: true });
  const command = [
    'optimize',
    input,
    output,
    '--flatten',
    'false',
    '--join',
    'false',
    '--instance',
    'false',
    '--palette',
    'false',
    '--simplify',
    'false',
    '--compress',
    args.includes('--meshopt') ? 'meshopt' : 'false',
    '--texture-compress',
    args.includes('--ktx2') ? 'ktx2' : 'false',
  ];
  await run(GLTF_TRANSFORM, command);
  await validate([output]);
  console.log(
    `Candidate written to ${path.relative(REPO_ROOT, output)}; canonical inputs were not modified.`,
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with ${signal ?? code}.`));
    });
  });
}

async function main() {
  const [command = 'validate', ...args] = process.argv.slice(2);
  const canonical = await canonicalAssets();
  if (command === 'validate') return validate(args.length ? args.map(resolveInput) : canonical);
  if (command === 'inspect') return inspect(args.length ? args.map(resolveInput) : canonical);
  if (command === 'optimize') return optimize(args, canonical);
  throw new Error(`Unknown command '${command}'. Use validate, inspect, or optimize.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
