# EAS Build and TestFlight (DEV-399)

## Prerequisites

- [Expo account](https://expo.dev) and this project linked (`eas init` if starting fresh).
- Apple Developer Program membership; bundle id `me.brianmm.agreeonatime` registered in App Store Connect and Apple Developer.

## One-time setup

1. Install EAS CLI: `pnpm dlx eas-cli@latest login`
2. From repo root: `eas build:configure` (already have `eas.json`).
3. **iOS credentials:** store distribution signing in Infisical under `/ios-signing`; local builds restore `credentials/ios/*` and `credentials.json`.
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

# TestFlight (local build + submit — required for this project)
pnpm testflight
# or:
# Secrets from Infisical (`.infisical.json` + `infisical login`) or CI env.
# Required in Infisical prod (or shell): EXPO_TOKEN and submit credentials.
pnpm deploy:testflight:local

# Same steps manually:
# eas build --profile production --platform ios --local --non-interactive --output ./builds/agreeonatime.ipa
# eas submit --platform ios --profile production --path ./builds/agreeonatime.ipa --non-interactive

# Build only (skip submit)
SKIP_TESTFLIGHT_SUBMIT=1 pnpm deploy:testflight:local
```

### TestFlight submit (App Store Connect API key not required)

`submit.production.ios` in `eas.json` sets `ascAppId`, `appleId`, and `appleTeamId`. Submit uses an [app-specific password](https://expo.fyi/apple-app-specific-password) instead of an ASC API key:

1. Create a password at [appleid.apple.com](https://appleid.apple.com/account/manage) → Sign-In and Security → App-Specific Passwords.
2. Export `EXPO_APPLE_APP_SPECIFIC_PASSWORD` in your shell, or add it to `.env.local` (never commit).
3. Run `pnpm testflight` or `pnpm deploy:testflight:local`.

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

To reuse this workflow in another Expo app, see [deploy-testflight-local-porting.md](./deploy-testflight-local-porting.md).

Runs on **macOS** with Xcode and the [EAS CLI](https://docs.expo.dev/build/setup-local-builds/) (`eas` on your PATH):

1. Restore iOS signing files from Infisical into `credentials/ios/` and `credentials.json`
2. `eas build --profile production --platform ios --local --non-interactive --output ./builds/agreeonatime.ipa`
3. `eas submit --platform ios --profile production --path ./builds/agreeonatime.ipa --non-interactive`

**Required env (script fails fast if missing):**

| Variable | When | Where to set |
|----------|------|--------------|
| `EXPO_TOKEN` | Always | Infisical **Agree on a Time → prod** (or `.env.local`) — [Expo access token](https://expo.dev/settings/access-tokens) |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | Submit fallback | Infisical **prod** (or `.env.local`) — [app-specific password](https://expo.fyi/apple-app-specific-password) |
| `ASC_API_KEY_JSON_BASE64` | Submit alternative | Base64 App Store Connect API key JSON; CI decodes this for EAS submit |
| `INFISICAL_TOKEN` | CI | Service token passed explicitly to Infisical CLI with `--token` |

Infisical: `infisical login` then run `pnpm deploy:testflight:local` (loads via `ci/load-infisical-env.sh` + `.infisical.json`).

**One-time:** iOS distribution signing lives in Infisical path `/ios-signing`:

| Secret | Notes |
|--------|-------|
| `IOS_DISTRIBUTION_CERT_P12_BASE64` | Base64 `.p12` distribution cert |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | `.p12` password |
| `IOS_DISTRIBUTION_CERT_SERIAL` | Restore validates the decoded cert serial |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 App Store provisioning profile |
| `IOS_APPLE_TEAM_ID` | Apple team id |
| `IOS_BUNDLE_IDENTIFIER` | `me.brianmm.agreeonatime` |
| `IOS_DISTRIBUTION_CERT_COMMON_NAME` | Optional operator note |

`pnpm restore:ios-signing` is file-only by default and writes:

- `credentials/ios/distribution.p12`
- `credentials/ios/profile.mobileprovision`
- `credentials.json`

It does **not** import into the login keychain unless explicitly run with
`scripts/restore-ios-signing-from-infisical.sh --import-login-keychain` for a
legacy/manual fallback. `eas.json` sets production iOS
`credentialsSource: "local"` so local EAS builds use those restored files.

**Apple Distribution vs iPhone Distribution:** Xcode 26+ expects an **Apple Distribution** identity. If local archives fail with “provisioning profile doesn't include signing certificate Apple Distribution”, export the current **Apple Distribution** `.p12`, regenerate the App Store provisioning profile, and update the `/ios-signing` Infisical secrets. Never commit `credentials.json` or `credentials/ios/*`.

| Variable | Notes |
|----------|--------|
| `SKIP_TESTFLIGHT_SUBMIT=1` | Build only (no submit); still needs `EXPO_TOKEN` |
| `EXPO_NO_KEYCHAIN=1` | Set automatically when `CI=true` |
| `EAS_BUILD_DISABLE_EXPO_DOCTOR_STEP=1` | Set automatically for local production builds |
| `MIN_DISK_GB` | Default `30` — fail fast if Data volume has less free space |

**Local build disk space:** Xcode archives need substantial free space on **Macintosh HD** (Data volume). If the log shows `No space left on device` / `errno=28`, clear **Xcode DerivedData** and EAS temp dirs under `/var/folders/.../T/eas-build-local-nodejs`, then retry.

**RevenueCat keys on EAS profiles:** `eas.json` sets `EXPO_PUBLIC_REVENUECAT_API_KEY` (iOS) and `EXPO_PUBLIC_REVENUECAT_API_KEY_WEB` on build profiles. Server secrets (webhook, REST) live on **Convex** only — see [subscriptions-revenuecat.md](./subscriptions-revenuecat.md).
