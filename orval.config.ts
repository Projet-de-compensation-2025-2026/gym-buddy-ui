/**
 * Orval config for gym-buddy-ui.
 *
 * Input is the versioned gym-buddy-openapi package $ref tree resolved by
 * scripts/generate-api.mjs (never a YAML file in this repo).
 *
 * Pin: github:Projet-de-compensation-2025-2026/gym-buddy-openapi#f92465f0361fadb152018b31b3bf7f9426ba9867
 * Target: node_modules/gym-buddy-openapi/openapi/openapi.yaml
 *
 * Two Angular clients: member operations for gym-buddy-ui, Admin-tagged
 * operations only for gym-buddy-admin (FS-ADM-09 / ticket #79).
 *
 * Orval 8.22 blocks external $refs unless listed. Allow the installed
 * package tree (not bundled.yaml, not remote URLs).
 *
 * Runtime base URL is environment.apiBaseUrl so local `/api/v1` and the VPS
 * production host stay consistent with the existing Angular environments.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { defineConfig } from 'orval';

const spec = process.env.GYM_BUDDY_OPENAPI_SPEC;
if (!spec) {
  throw new Error('Set GYM_BUDDY_OPENAPI_SPEC (run `pnpm generate:api`).');
}
if (spec.endsWith('bundled.yaml')) {
  throw new Error('Do not generate from bundled.yaml; use openapi/openapi.yaml');
}

function allowListForRefTree(specPath: string): string[] {
  const treeRoot = dirname(specPath);
  const allow: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (
        !entry.name.endsWith('.yaml') ||
        entry.name === 'bundled.yaml' ||
        entry.name === 'openapi.yaml'
      ) {
        continue;
      }
      allow.push(`./${relative(treeRoot, full).split('\\').join('/')}`);
    }
  };
  walk(treeRoot);
  return allow;
}

const parserOptions = {
  externalRefs: {
    allow: allowListForRefTree(spec),
  },
};

const angularClient = {
  client: 'angular' as const,
  clean: true,
  prettier: true,
  override: {
    angular: {
      retrievalClient: 'httpClient' as const,
    },
  },
};

function withoutAdminPaths(document: {
  paths?: Record<string, unknown>;
  info?: { title?: string };
}) {
  const paths = { ...(document.paths ?? {}) };
  for (const path of Object.keys(paths)) {
    if (path.startsWith('/admin')) {
      delete paths[path];
    }
  }
  return { ...document, paths };
}

function onlyAdminPaths(document: { paths?: Record<string, unknown>; info?: { title?: string } }) {
  const paths = { ...(document.paths ?? {}) };
  for (const path of Object.keys(paths)) {
    if (!path.startsWith('/admin')) {
      delete paths[path];
    }
  }
  return {
    ...document,
    info: { ...document.info, title: 'Gym Buddy Admin API' },
    paths,
  };
}

export default defineConfig({
  gymBuddy: {
    input: {
      target: spec,
      parserOptions,
      override: {
        transformer: withoutAdminPaths,
      },
    },
    output: {
      mode: 'single',
      target: 'src/app/api/generated/client.ts',
      schemas: 'src/app/api/generated/model',
      ...angularClient,
      baseUrl: {
        runtime: 'environment.apiBaseUrl',
        imports: [{ name: 'environment', importPath: '../../../environments/environment' }],
      },
    },
  },
  gymBuddyAdmin: {
    input: {
      target: spec,
      parserOptions,
      override: {
        transformer: onlyAdminPaths,
      },
    },
    output: {
      mode: 'single',
      target: 'admin/app/api/generated/client.ts',
      schemas: 'admin/app/api/generated/model',
      ...angularClient,
      baseUrl: {
        runtime: 'environment.apiBaseUrl',
        imports: [{ name: 'environment', importPath: '../../../../src/environments/environment' }],
      },
    },
  },
});
