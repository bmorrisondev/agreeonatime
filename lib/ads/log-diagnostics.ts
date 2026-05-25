/** Log AdMob diagnostics in Metro dev or preview builds with EXPO_PUBLIC_DEV_TOOLS. */
export function shouldLogAdMobDiagnostics(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';
}
