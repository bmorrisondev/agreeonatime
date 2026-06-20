#!/usr/bin/env bash
# Build Expo web/static output and verify branch-specific public env values.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET_ENV="${1:-dev}"
case "$TARGET_ENV" in
  dev | preview)
    EAS_PROFILE="${WEB_EAS_PROFILE:-preview}"
    EXPECTED_CONVEX_URL="${EXPECTED_CONVEX_URL:-https://fastidious-cardinal-591.convex.cloud}"
    ;;
  prod | production | main)
    EAS_PROFILE="${WEB_EAS_PROFILE:-production}"
    EXPECTED_CONVEX_URL="${EXPECTED_CONVEX_URL:-https://hearty-grasshopper-692.convex.cloud}"
    ;;
  *)
    echo "Unknown web target env: ${TARGET_ENV}" >&2
    exit 1
    ;;
esac

if [[ -f "$ROOT/ci/map-expo-public-env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/ci/map-expo-public-env.sh"
fi

# EAS profile env acts as a safe repo fallback when CI variables/Infisical do not
# provide EXPO_PUBLIC_* values.
eval "$(node "$ROOT/ci/export-eas-profile-env.mjs" "$EAS_PROFILE")"

rm -rf dist
pnpm exec expo export --platform web --clear

if [[ ! -d dist ]]; then
  echo "Expected web export at dist/." >&2
  exit 1
fi

if ! grep -R "$EXPECTED_CONVEX_URL" dist >/dev/null 2>&1; then
  echo "Expected Convex URL not found in exported web bundle: ${EXPECTED_CONVEX_URL}" >&2
  exit 1
fi

if [[ "$EAS_PROFILE" == "production" ]]; then
  if grep -R 'fastidious-cardinal-591.convex.cloud' dist >/dev/null 2>&1; then
    echo "Production web bundle contains the dev Convex URL." >&2
    exit 1
  fi

  if ! grep -R 'hearty-grasshopper-692.convex.cloud' dist >/dev/null 2>&1; then
    echo "Production web bundle does not contain the live Convex URL." >&2
    exit 1
  fi
fi

echo "Web build verified for ${TARGET_ENV} using EAS profile ${EAS_PROFILE}."
