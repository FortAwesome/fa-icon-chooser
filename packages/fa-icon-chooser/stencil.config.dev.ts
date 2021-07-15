import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'fa-icon-chooser',
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      copy: [{ src: '../dev', dest: 'dev' }],
    },
  ],
};
