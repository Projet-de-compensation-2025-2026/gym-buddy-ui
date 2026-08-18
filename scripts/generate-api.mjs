#!/usr/bin/env node
/**
 * Generate the Angular HttpClient from gym-buddy-openapi (ticket #42).
 *
 * Choice: consume the published consumer bundle over the raw GitHub URL,
 * pinned to a commit SHA. We do not add a package dependency on the spec
 * repo, and we do not vendor openapi.yaml / bundled.yaml in this tree.
 *
 * Bundle (develop at this SHA; same bytes as the develop raw path):
 *   https://raw.githubusercontent.com/Projet-de-compensation-2025-2026/gym-buddy-openapi/7fa510874e8ebb7d424f01629f3085705d569139/openapi/bundled.yaml
 *
 * Pin: gym-buddy-openapi@7fa510874e8ebb7d424f01629f3085705d569139 (short 7fa5108)
 * Tool: orval, client: 'angular' (HttpClient services for Angular 22)
 *
 * Refs https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/issues/42
 */
import { spawnSync } from 'node:child_process';
import { mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPENAPI_SHA = '7fa510874e8ebb7d424f01629f3085705d569139';
export const OPENAPI_BUNDLE_URL = `https://raw.githubusercontent.com/Projet-de-compensation-2025-2026/gym-buddy-openapi/${OPENAPI_SHA}/openapi/bundled.yaml`;

const root = fileURLToPath(new URL('..', import.meta.url));

function assertNoVendoredSpec() {
  const banned = spawnSync(
    'find',
    [root, '-type', 'f', '(', '-name', 'openapi.yaml', '-o', '-name', 'bundled.yaml', ')'],
    { encoding: 'utf8' },
  );
  const hits = (banned.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.split(sep).includes('node_modules'));
  if (hits.length > 0) {
    throw new Error(
      `Do not vendor the OpenAPI document in gym-buddy-ui:\n${hits.map((f) => `  ${relative(root, f)}`).join('\n')}`,
    );
  }
}

async function main() {
  assertNoVendoredSpec();

  const response = await fetch(OPENAPI_BUNDLE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${OPENAPI_BUNDLE_URL}: HTTP ${response.status}`);
  }
  const yaml = await response.text();
  if (!yaml.includes('openapi:') || !yaml.includes('/auth/login')) {
    throw new Error(
      `Fetched document from ${OPENAPI_BUNDLE_URL} is not the Gym Buddy consumer bundle`,
    );
  }

  const dir = await mkdtemp(join(tmpdir(), 'gym-buddy-openapi-'));
  const specPath = join(dir, `consumer-${OPENAPI_SHA}.yaml`);
  await writeFile(specPath, yaml, 'utf8');

  try {
    const result = spawnSync('pnpm', ['exec', 'orval', '--config', 'orval.config.ts'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, GYM_BUDDY_OPENAPI_BUNDLE: specPath },
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
    const format = spawnSync('pnpm', ['exec', 'prettier', '--write', 'src/app/api/generated'], {
      cwd: root,
      stdio: 'inherit',
    });
    if (format.status !== 0) {
      process.exit(format.status ?? 1);
    }
  } finally {
    await unlink(specPath).catch(() => undefined);
  }

  assertNoVendoredSpec();
}

await main();
