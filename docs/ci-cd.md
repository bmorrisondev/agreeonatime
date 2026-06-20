# GitLab CI/CD release model

This repo is the Expo mobile/web app, so CI uses root paths (`dist/`, `builds/`,
`credentials/ios/`) instead of a separate `mobile/` directory.

## Branches

- `dev` — day-to-day integration and continuous mobile testing.
- `main` — release/promotion branch.

## Pipeline stages

- `prep` — warm macOS JS/CocoaPods caches.
- `mobile` — local iOS TestFlight build + submit.
- `web_build` — Expo web static export verification.
- `web_deploy` — manual Vercel promotion from the verified artifact.
- `submit` — reserved for future release/deploy jobs.

## Required GitLab CI/CD variables

### Mobile / TestFlight

| Variable | Required | Notes |
| --- | --- | --- |
| `INFISICAL_TOKEN` | Yes | Used explicitly with `--token` for Infisical CLI reads. |
| `EXPO_TOKEN` | Yes | Expo token for EAS local build/submit authentication. |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | Submit fallback | App-specific password for EAS submit. |
| `ASC_API_KEY_JSON_BASE64` | Submit alternative | Base64-encoded App Store Connect API key JSON; decoded to `EXPO_ASC_API_KEY_PATH`. |
| `IOS_SIGNING_INFISICAL_ENV` | Optional | Defaults to `prod`. |
| `IOS_SIGNING_INFISICAL_PATH` | Optional | Defaults to `/ios-signing`. |
| `MIN_DISK_GB` | Optional | Defaults to `30` for local Xcode archives. |

`deploy_testflight` runs automatically on `dev` pushes when `INFISICAL_TOKEN`,
`EXPO_TOKEN`, and either submit credential are configured. On `main`, it is
manual. Uploads are serialized with `resource_group: testflight_upload`.

### iOS signing in Infisical

Store signing secrets under `/ios-signing`:

| Secret | Notes |
| --- | --- |
| `IOS_DISTRIBUTION_CERT_P12_BASE64` | Base64 distribution `.p12`. |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password for the `.p12`. |
| `IOS_DISTRIBUTION_CERT_SERIAL` | Expected cert serial; restore validates it. |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 App Store provisioning profile. |
| `IOS_APPLE_TEAM_ID` | Apple team id. |
| `IOS_BUNDLE_IDENTIFIER` | `me.brianmm.agreeonatime`. |
| `IOS_DISTRIBUTION_CERT_COMMON_NAME` | Optional operator note. |

`scripts/restore-ios-signing-from-infisical.sh` restores only files by default:

- `credentials/ios/distribution.p12`
- `credentials/ios/profile.mobileprovision`
- `credentials.json`

It does **not** import into `login.keychain-db` unless explicitly run with
`--import-login-keychain` for legacy/manual fallback cases. Local EAS builds use
`credentialsSource: "local"` and EAS/local build's temporary signing keychain
behavior instead of relying on a persistent login keychain.

### Web build / Vercel promotion

| Variable | Required | Notes |
| --- | --- | --- |
| `INFISICAL_TOKEN` | Optional | If present, web builds use `infisical run --env=<dev|prod> --token="$INFISICAL_TOKEN"`. |
| `VERCEL_TOKEN` | Deploy only | Required for manual Vercel deploy jobs. |
| `VERCEL_PROJECT_ID` | Deploy only | Required for manual Vercel deploy jobs. |
| `VERCEL_ORG_ID` | Optional | Passed as Vercel scope when set. |

`web_build_verify` runs on `dev` and `main` pushes and uploads `dist/` for seven
days. It does not deploy. `dev` uses preview-style public env values; `main`
uses production values and verifies the exported bundle contains the production
Convex URL (`hearty-grasshopper-692`) and not the dev URL.

`deploy_vercel_preview` and `deploy_vercel_production` are manual jobs only.
They download the verified `dist/` artifact and deploy that artifact to Vercel
without rebuilding. Missing Vercel secrets skip the jobs instead of failing the
pipeline, and both deploy jobs are `allow_failure: true`.

## Local equivalents

```bash
# Build + verify web output using dev fallback env
bash ci/build-web-verify.sh dev

# Build + verify web output using production fallback env
bash ci/build-web-verify.sh prod

# Restore signing files only
pnpm restore:ios-signing

# Build locally and submit to TestFlight
pnpm deploy:testflight:local
```
