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
| `production`    | App Store / TestFlight; `autoIncrement` build number; **Convex production** (`hearty-grasshopper-692`). |

## Commands

```bash
# Simulator dev client
pnpm dlx eas-cli@latest build --profile development --platform ios

# TestFlight-ready binary
pnpm dlx eas-cli@latest build --profile production --platform ios

# TestFlight via EAS cloud build + submit
# Add EXPO_APPLE_APP_SPECIFIC_PASSWORD to .env.local, then:
pnpm testflight

# Local build on your Mac + submit (no EAS cloud compile)
# Required in .env.local (or shell): EXPO_TOKEN, EXPO_APPLE_APP_SPECIFIC_PASSWORD
pnpm deploy:testflight:local

# Same steps manually:
# eas build --profile production --platform ios --local --output ./builds/agreeonatime.ipa
# eas submit --platform ios --profile production --path ./builds/agreeonatime.ipa

# Build only (skip submit)
SKIP_TESTFLIGHT_SUBMIT=1 pnpm deploy:testflight:local
```

### TestFlight submit (App Store Connect API key not required)

`submit.production.ios` in `eas.json` sets `ascAppId`, `appleId`, and `appleTeamId`. Submit uses an [app-specific password](https://expo.fyi/apple-app-specific-password) instead of an ASC API key:

1. Create a password at [appleid.apple.com](https://appleid.apple.com/account/manage) → Sign-In and Security → App-Specific Passwords.
2. Export `EXPO_APPLE_APP_SPECIFIC_PASSWORD` in your shell, or add it to `.env.local` (never commit).
3. Run `pnpx testflight` or `eas build --platform ios --profile production --submit`.

If ASC API key setup in `eas credentials` returns Apple 403, this path still works.

## App Store review account (production Convex)

v1.0 hides Sign in with Apple; reviewers use **email + password**. Create the account on **production**:

```bash
REVIEW_EMAIL='review@example.com' \
REVIEW_PASSWORD='your-secure-password' \
REVIEW_NAME='App Review' \
pnpm create:apple-review-user
```

Script: `scripts/create-apple-review-user.sh` (defaults to `https://hearty-grasshopper-692.convex.site`).

## Local build → TestFlight (`scripts/deploy-testflight-local.sh`)

Runs on **macOS** with Xcode and the [EAS CLI](https://docs.expo.dev/build/setup-local-builds/) (`eas` on your PATH):

1. `eas build --profile production --platform ios --local --output ./builds/agreeonatime.ipa`
2. `eas submit --platform ios --profile production --path ./builds/agreeonatime.ipa`

**Required env (script fails fast if missing):**

| Variable | When |
|----------|------|
| `EXPO_TOKEN` | Always — [Expo access token](https://expo.dev/settings/access-tokens) |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | Submit — [app-specific password](https://expo.fyi/apple-app-specific-password) |

**One-time:** iOS distribution credentials in EAS for `me.brianmm.agreeonatime` (`eas credentials`). Local builds pull signing from EAS.

| Variable | Notes |
|----------|--------|
| `SKIP_TESTFLIGHT_SUBMIT=1` | Build only (no submit); still needs `EXPO_TOKEN` |
| `EXPO_NO_KEYCHAIN=1` | Set automatically when `CI=true` |
| `MIN_DISK_GB` | Default `30` — fail fast if Data volume has less free space |

**Local build disk space:** Xcode archives need substantial free space on **Macintosh HD** (Data volume). If the log shows `No space left on device` / `errno=28`, clear **Xcode DerivedData** and EAS temp dirs under `/var/folders/.../T/eas-build-local-nodejs`, then retry.
