/**
 * Orval config for gym-buddy-ui.
 *
 * Input is the gym-buddy-openapi consumer bundle fetched by
 * scripts/generate-api.mjs (never a YAML file in this repo).
 *
 * Pin: 7fa510874e8ebb7d424f01629f3085705d569139 (short 7fa5108)
 * URL: https://raw.githubusercontent.com/Projet-de-compensation-2025-2026/gym-buddy-openapi/7fa510874e8ebb7d424f01629f3085705d569139/openapi/bundled.yaml
 *
 * Runtime base URL is environment.apiBaseUrl so local `/api/v1` and the VPS
 * production host stay consistent with the existing Angular environments.
 */
import { defineConfig } from 'orval';

const spec = process.env.GYM_BUDDY_OPENAPI_BUNDLE;
if (!spec) {
  throw new Error('Set GYM_BUDDY_OPENAPI_BUNDLE (run `pnpm generate:api`).');
}

export default defineConfig({
  gymBuddy: {
    input: {
      target: spec,
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
