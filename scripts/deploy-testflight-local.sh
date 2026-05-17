#!/usr/bin/env bash
# Local production iOS build + TestFlight submit (no EAS cloud compile).
# For CI: macOS runner with Xcode, EXPO_TOKEN, EXPO_APPLE_APP_SPECIFIC_PASSWORD.
# See docs/eas-build.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROFILE="${EAS_BUILD_PROFILE:-production}"
SUBMIT_PROFILE="${EAS_SUBMIT_PROFILE:-production}"
IPA="${ROOT}/builds/agreeonatime.ipa"
EAS="${EAS_CMD:-pnpm dlx eas-cli@latest}"

is_ci() {
  [[ "${CI:-}" == "true" || "${CI:-}" == "1" || "${GITHUB_ACTIONS:-}" == "true" ]]
}

if is_ci; then
  export EXPO_NO_KEYCHAIN="${EXPO_NO_KEYCHAIN:-1}"
else
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck source=/dev/null
    source .env.local
    set +a
  fi
fi

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "Missing EXPO_TOKEN (EAS auth). Create at https://expo.dev/settings/access-tokens" >&2
  exit 1
fi

if [[ -z "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  echo "Missing EXPO_APPLE_APP_SPECIFIC_PASSWORD." >&2
  echo "https://appleid.apple.com/account/manage → App-Specific Passwords" >&2
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Local iOS builds require macOS with Xcode." >&2
  exit 1
fi

mkdir -p "${ROOT}/builds"

echo "==> EAS local build (profile: ${PROFILE})"
$EAS build \
  --profile "${PROFILE}" \
  --platform ios \
  --local \
  --non-interactive \
  --output "${IPA}"

if [[ ! -f "${IPA}" ]]; then
  echo "Build finished but IPA not found: ${IPA}" >&2
  exit 1
fi

if [[ "${SKIP_TESTFLIGHT_SUBMIT:-}" == "1" ]]; then
  echo "SKIP_TESTFLIGHT_SUBMIT=1 — IPA at ${IPA}"
  exit 0
fi

echo "==> Submit to TestFlight (profile: ${SUBMIT_PROFILE})"
$EAS submit \
  --profile "${SUBMIT_PROFILE}" \
  --platform ios \
  --path "${IPA}" \
  --non-interactive

echo "==> Done. Processing on App Store Connect may take 10–20 minutes."
