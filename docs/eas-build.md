# EAS Build and TestFlight (DEV-399)

## Prerequisites

- [Expo account](https://expo.dev) and this project linked (`eas init` if starting fresh).
- Apple Developer Program membership; bundle id `me.brianmm.agreeonatime` registered in App Store Connect and Apple Developer.

## One-time setup

1. Install EAS CLI: `pnpm dlx eas-cli@latest login`
2. From repo root: `eas build:configure` (already have `eas.json`).
3. **iOS credentials:** `eas credentials` — let EAS manage distribution cert and provisioning profile for the bundle id, or upload your own.
4. **Push (DEV-391):** In Apple Developer, create an APNs key; upload via EAS (`eas credentials`) so production builds can receive push tokens.

## Profiles (`eas.json`)

| Profile        | Use |
|----------------|-----|
| `development` | Dev client / iOS simulator builds. |
| `preview`       | Internal device builds (Ad Hoc / internal distribution). |
| `production`    | App Store / TestFlight; `autoIncrement` build number. |

## Commands

```bash
# Simulator dev client
pnpm dlx eas-cli@latest build --profile development --platform ios

# TestFlight-ready binary
pnpm dlx eas-cli@latest build --profile production --platform ios

# TestFlight (build + submit) — requires app-specific password in env
# Add EXPO_APPLE_APP_SPECIFIC_PASSWORD to .env.local, then:
pnpm testflight

# Or build and submit separately
pnpm dlx eas-cli@latest build --profile production --platform ios
pnpm dlx eas-cli@latest submit --profile production --platform ios
```

### TestFlight submit (App Store Connect API key not required)

`submit.production.ios` in `eas.json` sets `ascAppId`, `appleId`, and `appleTeamId`. Submit uses an [app-specific password](https://expo.fyi/apple-app-specific-password) instead of an ASC API key:

1. Create a password at [appleid.apple.com](https://appleid.apple.com/account/manage) → Sign-In and Security → App-Specific Passwords.
2. Export `EXPO_APPLE_APP_SPECIFIC_PASSWORD` in your shell, or add it to `.env.local` (never commit).
3. Run `pnpx testflight` or `eas build --platform ios --profile production --submit`.

If ASC API key setup in `eas credentials` returns Apple 403, this path still works.

## CI (optional)

Add `EXPO_TOKEN` as a protected CI variable and invoke `eas build` from GitHub Actions or GitLab only if this repo adopts that workflow; do not commit tokens.
