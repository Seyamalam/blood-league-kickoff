import packageMetadata from '../../package.json';

export interface BuildMetadata {
  readonly version: string;
  readonly commitSha: string | null;
  readonly label: string;
}

interface ViteBuildEnvironment {
  readonly VITE_COMMIT_SHA?: unknown;
}

const viteEnvironment = (import.meta as ImportMeta & { readonly env?: ViteBuildEnvironment }).env;

/** Normalizes injected build values so malformed CI metadata never reaches the UI. */
export function createBuildMetadata(version: unknown, commitSha?: unknown): BuildMetadata {
  const safeVersion = normalizeVersion(version);
  const safeCommitSha = normalizeCommitSha(commitSha);
  return Object.freeze({
    version: safeVersion,
    commitSha: safeCommitSha,
    label: safeCommitSha ? `v${safeVersion} · ${safeCommitSha.slice(0, 7)}` : `v${safeVersion}`,
  });
}

export const BUILD_METADATA = createBuildMetadata(packageMetadata.version, viteEnvironment?.VITE_COMMIT_SHA);

function normalizeVersion(value: unknown): string {
  if (typeof value !== 'string') return '0.0.0';
  const trimmed = value.trim();
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(trimmed) ? trimmed : '0.0.0';
}

function normalizeCommitSha(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return /^[0-9a-f]{7,64}$/.test(trimmed) ? trimmed : null;
}
