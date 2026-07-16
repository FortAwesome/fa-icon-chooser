import { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';
import replace from '@rollup/plugin-replace';
import { config as dotenvConfig } from 'dotenv';

// In a local dev environment (the `start` script sets FA_USE_LOCAL_ENV=1), load
// developer-specific overrides from a gitignored .env.local. Production builds do
// not set this flag, so they fall through to the hardcoded defaults in utils.ts.
if (process.env.FA_USE_LOCAL_ENV) {
  dotenvConfig({ path: '.env.local' });
}

// Build-time substitution of the host overrides. When the corresponding env var is
// absent the token is replaced with '', so utils.ts falls back to its production
// default (e.g. `'' || 'https://use.fontawesome.com'`).
const envReplace = replace({
  preventAssignment: true,
  values: {
    'process.env.FA_FREE_CDN_URL': JSON.stringify(process.env.FA_FREE_CDN_URL ?? ''),
    'process.env.FA_PRO_KIT_ASSET_URL': JSON.stringify(process.env.FA_PRO_KIT_ASSET_URL ?? ''),
    'process.env.FA_FREE_KIT_ASSET_URL': JSON.stringify(process.env.FA_FREE_KIT_ASSET_URL ?? ''),
  },
});

export const config: Config = {
  namespace: 'fa-icon-chooser',
  rollupPlugins: {
    before: [envReplace],
  },
  outputTargets: [
    reactOutputTarget({
      outDir: '../fa-icon-chooser-react/lib/components/stencil-generated/',
    }),
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    browserHeadless: 'shell',
  },
};
