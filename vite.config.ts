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
