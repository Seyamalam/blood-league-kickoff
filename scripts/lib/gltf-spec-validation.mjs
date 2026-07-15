import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { validateBytes } from 'gltf-validator';

const SEVERITY_LABELS = ['error', 'warning', 'info', 'hint'];

export async function validateGltfSpec(filePath, options = {}) {
  const bytes = await readFile(filePath);
  const report = await validateBytes(new Uint8Array(bytes), {
    uri: path.basename(filePath),
    maxIssues: options.maxIssues ?? 1_000,
    externalResourceFunction: options.externalResourceFunction,
  });

  const issues = report.issues.messages.map((issue) => ({
    code: issue.code,
    message: issue.message,
    pointer: issue.pointer ?? '',
    severity: issue.severity,
    severityLabel: SEVERITY_LABELS[issue.severity] ?? `severity-${issue.severity}`,
  }));

  return {
    ok: report.issues.numErrors === 0,
    validatorVersion: report.validatorVersion,
    errors: report.issues.numErrors,
    warnings: report.issues.numWarnings,
    infos: report.issues.numInfos,
    hints: report.issues.numHints,
    issues,
  };
}

export function formatGltfSpecIssue(issue) {
  return `${issue.code}${issue.pointer ? ` at ${issue.pointer}` : ''}: ${issue.message}`;
}
