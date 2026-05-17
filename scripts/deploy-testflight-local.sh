#!/usr/bin/env bash
# Local production iOS build + TestFlight submit (non-interactive).
# See docs/eas-build.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IPA="./builds/agreeonatime.ipa"
SKIP_SUBMIT="${SKIP_TESTFLIGHT_SUBMIT:-}"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

require_env() {
  local name="$1"
  local hint="$2"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing ${name}." >&2
    echo "${hint}" >&2
    exit 1
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Local iOS builds require macOS with Xcode." >&2
  exit 1
fi

if ! command -v eas >/dev/null 2>&1; then
  echo "Missing eas CLI on PATH. Install: pnpm dlx eas-cli@latest login" >&2
  exit 1
fi

require_env EXPO_TOKEN \
  "Create at https://expo.dev/settings/access-tokens and export it or add to .env.local."

if [[ "${SKIP_SUBMIT}" != "1" ]]; then
  require_env EXPO_APPLE_APP_SPECIFIC_PASSWORD \
    "Create at https://appleid.apple.com/account/manage → App-Specific Passwords, then add to .env.local."
fi

if [[ "${CI:-}" == "true" || "${CI:-}" == "1" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  export EXPO_NO_KEYCHAIN="${EXPO_NO_KEYCHAIN:-1}"
fi

mkdir -p builds

echo "==> eas build (production, local, non-interactive)"
eas build \
  --profile production \
  --platform ios \
  --local \
  --non-interactive \
  --output "$IPA"

if [[ ! -f "$IPA" ]]; then
  echo "Build finished but IPA not found: $IPA" >&2
  exit 1
fi

if [[ "${SKIP_SUBMIT}" == "1" ]]; then
  echo "SKIP_TESTFLIGHT_SUBMIT=1 — IPA at $IPA"
  exit 0
fi

echo "==> eas submit (production, non-interactive)"
eas submit \
  --platform ios \
  --profile production \
  --path "$IPA" \
  --non-interactive

echo "==> Done. App Store Connect processing may take 10–20 minutes."
