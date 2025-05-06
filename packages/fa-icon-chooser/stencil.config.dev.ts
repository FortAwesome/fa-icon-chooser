import { Config } from '@stencil/core';
import { config as baseConfig } from './stencil.config';
import { join } from 'path';

export const config: Config = {
  ...baseConfig,
  outputTargets: baseConfig.outputTargets.map(target => {
    if (target.type === 'www') {
      return {
        ...target,
        copy: [{ src: join(__dirname, 'dev'), dest: 'dev' }],
      };
    }
    return target;
  }),
};
