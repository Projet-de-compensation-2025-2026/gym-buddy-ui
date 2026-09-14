#!/usr/bin/env node
/**
 * Generate the Angular HttpClient from the versioned gym-buddy-openapi package.
 *
 * Pin: github:Projet-de-compensation-2025-2026/gym-buddy-openapi#c1baafbca5ce33807d6efb297c6fe257a21a8367
 * Includes occurrence-specific event details. Same contract as gym-buddy-service.
 *
 * Orval reads the $ref tree at
 * node_modules/gym-buddy-openapi/openapi/openapi.yaml so relative $refs
 * resolve from that checkout. Do not fetch bundled.yaml. Do not vendor YAML
 * in this tree.
 *
 * Refs https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/issues/48
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPENAPI_PACKAGE = 'gym-buddy-openapi';
export const OPENAPI_TAG = 'c1baafbca5ce33807d6efb297c6fe257a21a8367';
export const OPENAPI_VERSION = '1.1.1';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(root, 'package.json'));

function assertNoVendoredSpec() {
  const hits = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.isSymbolicLink() ||
        ['node_modules', '.git', '.angular', 'dist'].includes(entry.name)
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (['openapi.yaml', 'bundled.yaml'].includes(entry.name)) hits.push(path);
    }
  }
  walk(root);
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

  const result = spawnSync(
    process.execPath,
    [
      join(dirname(require.resolve('orval/package.json')), 'dist/bin/orval.mjs'),
      '--config',
      'orval.config.ts',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, GYM_BUDDY_OPENAPI_SPEC: specPath },
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  const format = spawnSync(
    process.execPath,
    [
      join(dirname(require.resolve('prettier/package.json')), 'bin/prettier.cjs'),
      '--write',
      'src/app/api/generated',
      'admin/app/api/generated',
    ],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  if (format.status !== 0) {
    process.exit(format.status ?? 1);
  }

  assertNoVendoredSpec();
}

main();
