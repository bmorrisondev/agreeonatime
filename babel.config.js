module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Required for web: deps like better-auth/convex use `import.meta` (see expo/expo#36384).
          unstable_transformImportMeta: true,
        },
      ],
      'nativewind/babel',
    ],
  };
};
