#!/usr/bin/env bash
# Local EAS "preview" build for iOS Simulator (no IPA / no device).
# Prereqs: Xcode + booted simulator (or this script opens Simulator.app),
#          same env as build-preview.sh (EXPO_TOKEN, Apple auth for local EAS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; then
  export EXPO_NO_KEYCHAIN="${EXPO_NO_KEYCHAIN:-1}"
fi

mkdir -p builds
ARCHIVE="${ROOT}/builds/agreeonatime-preview-sim.tar.gz"
rm -f "$ARCHIVE"

eas build \
  --profile preview-simulator \
  --platform ios \
  --local \
  --non-interactive \
  --output "$ARCHIVE"

TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

tar -xzf "$ARCHIVE" -C "$TMP"
APP_PATH="$(find "$TMP" -name "*.app" -maxdepth 5 -print -quit)"
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Could not find .app inside $ARCHIVE (extracted under $TMP)"
  find "$TMP" -type d | head -40
  exit 1
fi

if ! xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
  echo "No booted simulator — opening Simulator.app. Pick a device, then re-run:"
  echo "  bash ./scripts/build-preview-simulator.sh"
  open -a Simulator || true
  exit 1
fi

UDID="$(
  xcrun simctl list devices booted 2>/dev/null |
    grep '(Booted)' |
    head -1 |
    sed -n 's/.*(\([A-F0-9-]*\)) (Booted).*/\1/p'
)"

if [[ -z "$UDID" ]]; then
  echo "Could not parse booted simulator UDID."
  xcrun simctl list devices booted
  exit 1
fi

echo "Installing $(basename "$APP_PATH") on simulator $UDID ..."
xcrun simctl install "$UDID" "$APP_PATH"
xcrun simctl launch "$UDID" me.brianmm.agreeonatime
echo "Launched me.brianmm.agreeonatime (preview-simulator build)."
