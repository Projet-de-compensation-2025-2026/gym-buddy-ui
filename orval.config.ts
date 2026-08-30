/**
 * Orval config for gym-buddy-ui.
 *
 * Input is the versioned gym-buddy-openapi package $ref tree resolved by
 * scripts/generate-api.mjs (never a YAML file in this repo).
 *
 * Pin: github:Projet-de-compensation-2025-2026/gym-buddy-openapi#d58a824e0720c2f50c56632e3664d3632484e281
 * Target: node_modules/gym-buddy-openapi/openapi/openapi.yaml
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

export default defineConfig({
  gymBuddy: {
    input: {
      target: spec,
      parserOptions: {
        externalRefs: {
          allow: allowListForRefTree(spec),
        },
      },
    },
    output: {
      mode: 'single',
      target: 'src/app/api/generated/client.ts',
      schemas: 'src/app/api/generated/model',
      client: 'angular',
      clean: true,
      prettier: true,
      baseUrl: {
        runtime: 'environment.apiBaseUrl',
        imports: [{ name: 'environment', importPath: '../../../environments/environment' }],
      },
      override: {
        angular: {
          retrievalClient: 'httpClient',
        },
      },
    },
  },
});
