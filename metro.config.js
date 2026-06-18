const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
  includeWebFeedback: false,
  getDefaultConfig: (projectRoot, options) => {
    const baseConfig = getDefaultConfig(projectRoot, options);

    /** Zustand’s ESM build uses `import.meta`; Metro web ships it verbatim and the browser throws (expo/expo#36384). Force the CJS entry. */
    const upstreamResolveRequest = baseConfig.resolver.resolveRequest;
    baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
      if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
        return {
          type: 'sourceFile',
          filePath: require.resolve(moduleName),
        };
      }
      if (upstreamResolveRequest != null) {
        return upstreamResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    };

    return baseConfig;
  },
});

module.exports = withNativeWind(config, { input: './global.css' });
