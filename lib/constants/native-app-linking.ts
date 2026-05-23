/** Custom URL scheme — keep in sync with `app.json` `expo.scheme`. */
export const APP_SCHEME = 'agreeonatime';

/** Production web host for Universal Links (no protocol). */
export const UNIVERSAL_LINK_HOST = 'app.agreeonatime.com';

/** Apple Developer team id — keep in sync with `eas.json` submit.production.ios.appleTeamId. */
export const APPLE_TEAM_ID = '2GS83LLSPS';

/** iOS bundle id — keep in sync with `app.json` `expo.ios.bundleIdentifier`. */
export const IOS_BUNDLE_ID = 'me.brianmm.agreeonatime';

/** App Store id for Smart App Banner and store links. */
export const APP_STORE_APP_ID = '6743097026';

/** `TEAMID.bundle` for apple-app-site-association. */
export const APPLE_APP_LINK_APP_ID = `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`;
