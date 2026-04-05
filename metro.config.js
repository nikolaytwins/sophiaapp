const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
};

/**
 * Web: package exports map `import` → `esm/middleware.mjs`, which uses `import.meta.env` (Vite-style).
 * Metro’s web bundle is not an ES module in the browser sense, so that syntax throws at runtime.
 * Force the published CJS `middleware.js` (same as `react-native` export) for all web resolves.
 */
const zustandMiddlewareCjs = path.join(__dirname, 'node_modules', 'zustand', 'middleware.js');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return { filePath: zustandMiddlewareCjs, type: 'sourceFile' };
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
