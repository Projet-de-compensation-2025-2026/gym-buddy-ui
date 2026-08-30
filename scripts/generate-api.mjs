#!/usr/bin/env node
/**
 * Generate the Angular HttpClient from the versioned gym-buddy-openapi package.
 *
 * Pin: github:Projet-de-compensation-2025-2026/gym-buddy-openapi#964c4135332c8c01986cda70b657a9872108dd74
 * (develop SHA after ticket #69). Same pin as gym-buddy-service until the next 0.1.x tag.
 *
 * Orval reads the $ref tree at
 * node_modules/gym-buddy-openapi/openapi/openapi.yaml so relative $refs
 * resolve from that checkout. Do not fetch bundled.yaml. Do not vendor YAML
 * in this tree.
 *
 * Refs https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/issues/48
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPENAPI_PACKAGE = 'gym-buddy-openapi';
export const OPENAPI_TAG = '964c4135332c8c01986cda70b657a9872108dd74';
export const OPENAPI_VERSION = '0.1.0';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(root, 'package.json'));

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
    .filter((file) => !file.split(/[\\/]/).includes('node_modules'));
  if (hits.length > 0) {
    throw new Error(
      `Do not vendor the OpenAPI document in gym-buddy-ui:\n${hits.map((f) => `  ${relative(root, f)}`).join('\n')}`,
    );
  }
}

export function resolveOpenApiSpec() {
  let pkgPath;
  try {
    pkgPath = require.resolve(`${OPENAPI_PACKAGE}/package.json`);
  } catch {
    throw new Error(
      `Missing ${OPENAPI_PACKAGE}@${OPENAPI_TAG}. Run \`pnpm install\` (github:Projet-de-compensation-2025-2026/gym-buddy-openapi#${OPENAPI_TAG}).`,
    );
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.version !== OPENAPI_VERSION) {
    throw new Error(
      `${OPENAPI_PACKAGE} version is ${pkg.version}; pin tag ${OPENAPI_TAG} (${OPENAPI_VERSION})`,
    );
  }

  const specPath = join(dirname(pkgPath), 'openapi', 'openapi.yaml');
  if (!existsSync(specPath)) {
    throw new Error(`Missing $ref tree at ${specPath}`);
  }
  if (!specPath.split(sep).includes('node_modules')) {
    throw new Error('Generator must read the installed package tree, not a vendored YAML');
  }
  if (specPath.endsWith(`${sep}bundled.yaml`)) {
    throw new Error('Do not generate from bundled.yaml; use openapi/openapi.yaml');
  }

  const yaml = readFileSync(specPath, 'utf8');
  if (
    !yaml.includes('openapi:') ||
    !yaml.includes('$ref:') ||
    !yaml.includes('/auth/login') ||
    !yaml.includes('/admin/users')
  ) {
    throw new Error(`${specPath} is not the Gym Buddy $ref tree`);
  }
  return specPath;
}

function main() {
  assertNoVendoredSpec();
  const specPath = resolveOpenApiSpec();

  const result = spawnSync('pnpm', ['exec', 'orval', '--config', 'orval.config.ts'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, GYM_BUDDY_OPENAPI_SPEC: specPath },
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

  assertNoVendoredSpec();
}

main();
