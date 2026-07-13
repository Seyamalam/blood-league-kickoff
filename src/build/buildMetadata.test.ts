import { describe, expect, it } from 'vitest';
import { BUILD_METADATA, createBuildMetadata } from './buildMetadata';

describe('build metadata', () => {
  it('uses the package version for the current build', () => {
    expect(BUILD_METADATA.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(BUILD_METADATA.label).toContain(`v${BUILD_METADATA.version}`);
  });

  it('normalizes and abbreviates an injected commit SHA', () => {
    expect(createBuildMetadata('1.2.3', ' ABCDEF0123456789 ')).toEqual({
      version: '1.2.3',
      commitSha: 'abcdef0123456789',
      label: 'v1.2.3 · abcdef0',
    });
  });

  it('falls back safely for malformed build values', () => {
    expect(createBuildMetadata('../release', 'not-a-sha')).toEqual({
      version: '0.0.0',
      commitSha: null,
      label: 'v0.0.0',
    });
  });
});
