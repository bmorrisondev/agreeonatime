# Port `pnpm deploy:testflight:local` to another Expo project

This guide explains how to replicate agreeonatime’s **local EAS production iOS build + TestFlight submit** workflow in another Expo app.

In agreeonatime, `pnpm deploy:testflight:local` runs `scripts/deploy-testflight-local.sh`. See also [eas-build.md](./eas-build.md) for project-specific profiles and env.

## What it does

One command on your Mac:

1. **Local EAS production iOS build** → `.ipa` on disk
2. **Non-interactive TestFlight submit** via `eas submit` (app-specific password; no App Store Connect API key)

Cloud alternative in agreeonatime: `pnpm testflight` → `pnpx testflight` (EAS cloud build + submit).

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **macOS + Xcode** | Local iOS builds only work on Mac |
| **Expo account** | Project linked (`eas init` / `app.json` `extra.eas.projectId`) |
| **Apple Developer** | Bundle ID registered in App Store Connect and Apple Developer |
| **EAS CLI on PATH** | `pnpm dlx eas-cli@latest login` (or global `eas`) |
| **~30 GB free disk** | agreeonatime’s script checks `/System/Volumes/Data` by default |
| **iOS credentials in EAS** | `eas credentials` — local builds still pull signing from EAS |

## Step 1 — `eas.json`

You need a **`production`** build profile and a matching **`submit.production`** block.

Minimal pattern (adapt env vars and Apple IDs to your app):

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleId": "you@example.com",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

- **`ascAppId`**: numeric App Store Connect app ID (not the bundle id).
- Put production API URLs and public keys in `build.production.env` (Convex, RevenueCat, etc. as needed).

Reference in this repo: [`eas.json`](../eas.json).

## Step 2 — Deploy script

Create `scripts/deploy-testflight-local.sh`. You can copy from agreeonatime’s [`scripts/deploy-testflight-local.sh`](../scripts/deploy-testflight-local.sh) and customize:

| Customize | agreeonatime value |
|-----------|-------------------|
| IPA path | `./builds/agreeonatime.ipa` → e.g. `./builds/myapp.ipa` |
| Build profile | `production` (keep unless you rename the profile) |
| Extra `export`s before build | `EXPO_PUBLIC_APP_ENV=production`, `EXPO_PUBLIC_DEV_TOOLS=false` — only if your app gates dev UI on those vars |

Core commands the script wraps:

```bash
eas build \
  --profile production \
  --platform ios \
  --local \
  --non-interactive \
  --output "./builds/YOUR_APP.ipa"

eas submit \
  --platform ios \
  --profile production \
  --path "./builds/YOUR_APP.ipa" \
  --non-interactive
```

Behaviors worth keeping from the agreeonatime script:

- `set -euo pipefail`
- Source **`.env.local`** if present (`set -a` / `source` / `set +a`)
- **`require_env`** for `EXPO_TOKEN` (always) and `EXPO_APPLE_APP_SPECIFIC_PASSWORD` (unless submit is skipped)
- **macOS** and **`eas` on PATH** checks
- Optional **disk space** guard (`MIN_DISK_GB`, default `30`)
- **`SKIP_TESTFLIGHT_SUBMIT=1`** → build only, exit after IPA
- **`EXPO_NO_KEYCHAIN=1`** when `CI=true` (GitHub Actions, etc.)

Make it executable:

```bash
chmod +x scripts/deploy-testflight-local.sh
```

## Step 3 — `package.json` script

```json
{
  "scripts": {
    "deploy:testflight:local": "bash ./scripts/deploy-testflight-local.sh"
  }
}
```

Optional cloud twin (agreeonatime):

```json
"testflight": "bash ./scripts/testflight.sh"
```

With `scripts/testflight.sh` sourcing `.env.local`, checking `EXPO_APPLE_APP_SPECIFIC_PASSWORD`, then `exec pnpx testflight "$@"`.

## Step 4 — Secrets (`.env.local`, never commit)

```bash
# https://expo.dev/settings/access-tokens
EXPO_TOKEN=...

# https://appleid.apple.com → App-Specific Passwords
EXPO_APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Document these in `.env.example` with empty placeholders.

## Step 5 — One-time Apple / EAS setup

1. `eas build:configure` (if you do not have `eas.json` yet).
2. `eas credentials` for your **production** bundle id (distribution cert + provisioning profile).
3. App record in **App Store Connect** with the matching bundle id.
4. Fill **`submit.production.ios`** in `eas.json` with `ascAppId`, `appleId`, `appleTeamId`.

Submit uses an [app-specific password](https://expo.fyi/apple-app-specific-password), not an App Store Connect API key.

## Step 6 — Run

```bash
pnpm deploy:testflight:local
```

Build only (no TestFlight upload):

```bash
SKIP_TESTFLIGHT_SUBMIT=1 pnpm deploy:testflight:local
```

Add `builds/` to `.gitignore` if you store IPAs there.

## Environment variables

| Variable | When required | Notes |
|----------|---------------|--------|
| `EXPO_TOKEN` | Always | [Expo access token](https://expo.dev/settings/access-tokens) |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | Submit | [App-specific password](https://expo.fyi/apple-app-specific-password) |
| `SKIP_TESTFLIGHT_SUBMIT=1` | Optional | Build only; `EXPO_TOKEN` still required |
| `EXPO_NO_KEYCHAIN=1` | CI | Set automatically when `CI=true` in agreeonatime’s script |
| `MIN_DISK_GB` | Optional | Default `30` — fail fast if Data volume is low |

## agreeonatime-only details (drop when porting)

- **`EXPO_PUBLIC_DEV_TOOLS=false`** before local production builds — only needed if your app has dev-only UI gated on `EXPO_PUBLIC_DEV_TOOLS` (see `lib/env/is-dev-tools-enabled.ts`).
- **Production env in `eas.json`** — Convex URLs, RevenueCat, AdMob, etc.; use your other project’s keys only.
- **`create:apple-review-user`** — unrelated to deploy; optional for App Review.

## Local build disk space

Xcode archives need substantial free space on the **Data** volume. If logs show `No space left on device` / `errno=28`:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf /var/folders/*/*/T/eas-build-local-nodejs
```

Then retry.

## CI

The same script can run on `macos-latest` in GitHub Actions if you provide `EXPO_TOKEN`, `EXPO_APPLE_APP_SPECIFIC_PASSWORD`, Xcode, and EAS CLI. agreeonatime sets `EXPO_NO_KEYCHAIN=1` when `CI=true`.

## Checklist for the other repo

- [ ] Expo app with iOS bundle id configured
- [ ] `eas.json` → `build.production` + `submit.production.ios`
- [ ] `scripts/deploy-testflight-local.sh` (IPA filename + any env overrides)
- [ ] `package.json` → `"deploy:testflight:local": "bash ./scripts/deploy-testflight-local.sh"`
- [ ] `.env.local`: `EXPO_TOKEN`, `EXPO_APPLE_APP_SPECIFIC_PASSWORD`
- [ ] `eas credentials` completed once
- [ ] `builds/` directory (script creates it) and optionally in `.gitignore`
- [ ] Mac with ~30 GB free, Xcode installed, `eas` logged in

## Reference — agreeonatime wiring

| Piece | Location |
|-------|----------|
| pnpm script | `package.json` → `deploy:testflight:local` |
| Local deploy script | `scripts/deploy-testflight-local.sh` |
| Cloud TestFlight script | `scripts/testflight.sh` |
| EAS profiles + submit | `eas.json` |
| Env examples | `.env.example` |
| Project docs | [eas-build.md](./eas-build.md) |
