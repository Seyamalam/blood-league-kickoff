import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

const commitSha = resolveCommitSha();

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // rapier3d-compat intentionally embeds its offline WASM payload in JavaScript.
    // Keep that payload and Three.js in stable vendor chunks so app changes stay
    // small and reviewable; the raised threshold acknowledges only that known,
    // self-contained Rapier chunk rather than hiding growth in application code.
    chunkSizeWarningLimit: 2_500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split('\\').join('/');
          if (normalizedId.includes('/node_modules/@dimforge/rapier3d-compat/')) return 'vendor-rapier';
          if (normalizedId.includes('/node_modules/three/')) return 'vendor-three';
        },
      },
    },
  },
});

function resolveCommitSha(): string {
  const injected = process.env.VITE_COMMIT_SHA?.trim();
  if (injected && /^[0-9a-f]{7,64}$/i.test(injected)) return injected.toLowerCase();
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
  } catch {
    return 'unknown';
  }
}
