import { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';

export const config: Config = {
  namespace: 'fa-icon-chooser',
  outputTargets: [
    reactOutputTarget({
      componentCorePackage: '@fortawesome/fa-icon-chooser',
      proxiesFile: '../fa-icon-chooser-react/src/components.ts',
      includeDefineCustomElements: true,
      outDir: '../fa-icon-chooser-react/src',
    }),
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
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
};
