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

# After a successful production build
pnpm dlx eas-cli@latest submit --profile production --platform ios
```

Set `APPLE_ID`, `ASC_APP_ID`, and `APPLE_TEAM_ID` in your shell or EAS secrets for `eas submit` (see `submit.production.ios` in `eas.json`).

## CI (optional)

Add `EXPO_TOKEN` as a protected CI variable and invoke `eas build` from GitHub Actions or GitLab only if this repo adopts that workflow; do not commit tokens.
