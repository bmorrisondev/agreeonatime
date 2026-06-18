#!/usr/bin/env bash
# Local production iOS build + TestFlight submit (non-interactive).
# See docs/eas-build.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IPA="./builds/agreeonatime.ipa"
SKIP_SUBMIT="${SKIP_TESTFLIGHT_SUBMIT:-}"

# Secrets: Infisical (preferred) then optional .env.local fallback.
if [[ -f "$ROOT/ci/load-infisical-env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/ci/load-infisical-env.sh"
fi

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

# Local iOS archives need tens of GB free on the Data volume (see errno=28 in Xcode logs).
check_disk_space() {
  local min_gb="${MIN_DISK_GB:-30}"
  local data_mount="/System/Volumes/Data"
  local avail_kb avail_gb
  avail_kb="$(df -k "$data_mount" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ -z "$avail_kb" ]]; then
    return 0
  fi
  avail_gb=$((avail_kb / 1024 / 1024))
  if [[ "$avail_gb" -lt "$min_gb" ]]; then
    echo "Need ~${min_gb}GB free on ${data_mount}; only ${avail_gb}GB available." >&2
    echo "Free space, then retry. Common cleanup:" >&2
    echo "  rm -rf ~/Library/Developer/Xcode/DerivedData/*" >&2
    echo "  rm -rf /var/folders/*/*/T/eas-build-local-nodejs" >&2
    exit 1
  fi
  echo "==> Disk: ${avail_gb}GB free on ${data_mount}"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Local iOS builds require macOS with Xcode." >&2
  exit 1
fi

if ! command -v eas >/dev/null 2>&1; then
  echo "Missing eas CLI on PATH. Install: pnpm dlx eas-cli@latest login" >&2
  exit 1
fi

check_disk_space

require_env EXPO_TOKEN \
  "Add EXPO_TOKEN to Infisical (Agree on a Time → prod) or export it / add to .env.local. https://expo.dev/settings/access-tokens"

if [[ "${SKIP_SUBMIT}" != "1" ]]; then
  require_env EXPO_APPLE_APP_SPECIFIC_PASSWORD \
    "Add EXPO_APPLE_APP_SPECIFIC_PASSWORD to Infisical (prod) or .env.local. https://appleid.apple.com/account/manage → App-Specific Passwords"
fi

if [[ "${CI:-}" == "true" || "${CI:-}" == "1" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  export EXPO_NO_KEYCHAIN="${EXPO_NO_KEYCHAIN:-1}"
fi

# Do not bake preview/dev flags from .env.local into App Store binaries.
export EXPO_PUBLIC_APP_ENV=production
export EXPO_PUBLIC_DEV_TOOLS=false

mkdir -p builds

echo "==> eas build (production, local, non-interactive)"
eas build \
  --profile production \
  --platform ios \
  --local \
  --non-interactive \
  --clear-cache \
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
