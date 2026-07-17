const path = require('path');

// This example consumes the local wrapper via `"@fortawesome/fa-icon-chooser-react": "file:../"`,
// which npm installs as a symlink. Without deduping, webpack resolves the wrapper's
// `import React from 'react'` (through the symlink) to the wrapper's own nested React, while the
// app uses its own copy. Two copies of React trigger a runtime "Invalid hook call" error the
// moment <FaIconChooser> renders. Aliasing forces every `react`/`react-dom` request to the
// example's single copy. (A published consumer never hits this: there React is a peer
// dependency, so only one copy exists.)
module.exports = {
  webpack: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    configure: webpackConfig => {
      // CRA's ModuleScopePlugin forbids imports that resolve outside src/. Our absolute-path
      // react/react-dom aliases trip it, so remove it and let the aliases take effect.
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        plugin => plugin.constructor.name !== 'ModuleScopePlugin',
      );
      return webpackConfig;
    },
  },
};
