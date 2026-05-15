#!/usr/bin/env bash
# Non-interactive local preview IPA: run from repo root (pnpm run build:preview).
# Required for unattended runs: EXPO_TOKEN, valid EAS iOS credentials, and either
# ASC API key env (EXPO_ASC_*) or Apple ID env (EXPO_APPLE_ID / EXPO_APPLE_PASSWORD).
# Optional: SKIP_IOS_INSTALL=1 (CI artifact only), IOS_DEVICE_ID (ios-deploy -i),
# EXPO_NO_KEYCHAIN=1 (avoid macOS Keychain for Apple password; set automatically when CI=1).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; then
  export EXPO_NO_KEYCHAIN="${EXPO_NO_KEYCHAIN:-1}"
fi

eas build \
  --profile preview \
  --platform ios \
  --local \
  --non-interactive \
  --output ./builds/agreeonatime.ipa

exec ./scripts/install-on-device.sh
