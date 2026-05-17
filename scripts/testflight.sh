#!/usr/bin/env bash
# Build production iOS + submit to TestFlight (see docs/eas-build.md).
# Requires EXPO_APPLE_APP_SPECIFIC_PASSWORD in the environment or .env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

if [[ -z "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  echo "Missing EXPO_APPLE_APP_SPECIFIC_PASSWORD." >&2
  echo "Create an app-specific password at https://appleid.apple.com/account/manage" >&2
  echo "Then add it to .env.local or: export EXPO_APPLE_APP_SPECIFIC_PASSWORD='xxxx-xxxx-xxxx-xxxx'" >&2
  exit 1
fi

exec pnpx testflight "$@"
