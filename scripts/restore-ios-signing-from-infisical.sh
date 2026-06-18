#!/usr/bin/env bash
# Restore shared iOS signing assets from Infisical onto this Mac.
#
# Usage:
#   ./scripts/restore-ios-signing-from-infisical.sh
#   ./scripts/restore-ios-signing-from-infisical.sh --skip-keychain-import
#
# After restore, verify:
#   security find-identity -v -p codesigning | grep -i distribution
#   pnpm deploy:testflight:local   # or SKIP_TESTFLIGHT_SUBMIT=1 …
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-infisical-path.sh"

SKIP_KEYCHAIN_IMPORT=0
QUIET=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --skip-keychain-import   Write credentials/ios only; do not import into Keychain
  --quiet                  Minimal output (for use by sync-ios-signing-to-infisical.sh)
  -h, --help               Show this help

Reads Infisical env=${IOS_SIGNING_INFISICAL_ENV} path=${IOS_SIGNING_INFISICAL_PATH}
EOF
}

log() {
  if [[ "$QUIET" != "1" ]]; then
    echo "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-keychain-import)
      SKIP_KEYCHAIN_IMPORT=1
      shift
      ;;
    --quiet)
      QUIET=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS." >&2
  exit 1
fi

if ! command -v infisical >/dev/null 2>&1; then
  echo "Missing infisical CLI. Install: brew install infisical/get-cli/infisical" >&2
  exit 1
fi

if [[ ! -f "$ROOT/.infisical.json" ]]; then
  echo "Missing .infisical.json in repo root. Run: infisical init" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aoat-ios-signing-restore.XXXXXX")"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

ENV_FILE="${WORK_DIR}/ios-signing.env"
(
  cd "$ROOT"
  infisical export \
    --env="$IOS_SIGNING_INFISICAL_ENV" \
    --path="$IOS_SIGNING_INFISICAL_PATH" \
    --format=dotenv \
    --silent \
    >"$ENV_FILE"
)

if [[ ! -s "$ENV_FILE" ]]; then
  echo "No secrets at Infisical ${IOS_SIGNING_INFISICAL_ENV}${IOS_SIGNING_INFISICAL_PATH}." >&2
  echo "Run scripts/sync-ios-signing-to-infisical.sh on the working Mac first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing Infisical secret: ${name}" >&2
    exit 1
  fi
}

require_var "$IOS_SIGNING_SECRET_P12_BASE64"
require_var "$IOS_SIGNING_SECRET_P12_PASSWORD"
require_var "$IOS_SIGNING_SECRET_CERT_SERIAL"
require_var "$IOS_SIGNING_SECRET_PROFILE_BASE64"
require_var "$IOS_SIGNING_SECRET_TEAM_ID"
require_var "$IOS_SIGNING_SECRET_BUNDLE_ID"

P12_PATH="${WORK_DIR}/distribution.p12"
PROFILE_PATH="${WORK_DIR}/profile.mobileprovision"
CREDS_DIR="$ROOT/credentials/ios"

mkdir -p "$CREDS_DIR"
printf '%s' "${!IOS_SIGNING_SECRET_P12_BASE64}" | base64 -D >"$P12_PATH"
printf '%s' "${!IOS_SIGNING_SECRET_PROFILE_BASE64}" | base64 -D >"$PROFILE_PATH"

cp "$P12_PATH" "$CREDS_DIR/distribution.p12"
cp "$PROFILE_PATH" "$CREDS_DIR/profile.mobileprovision"
chmod 600 "$CREDS_DIR/distribution.p12" "$CREDS_DIR/profile.mobileprovision"

P12_PASSWORD_VALUE="${!IOS_SIGNING_SECRET_P12_PASSWORD}"
node -e "
const fs = require('fs');
const path = require('path');
const out = {
  ios: {
    provisioningProfilePath: 'credentials/ios/profile.mobileprovision',
    distributionCertificate: {
      path: 'credentials/ios/distribution.p12',
      password: process.env.P12_PASSWORD,
    },
  },
};
fs.writeFileSync(path.join(process.cwd(), 'credentials.json'), JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });
" P12_PASSWORD="$P12_PASSWORD_VALUE"

IMPORTED_SERIAL="$(openssl pkcs12 -in "$P12_PATH" -passin "pass:${!IOS_SIGNING_SECRET_P12_PASSWORD}" -nokeys -clcerts 2>/dev/null \
  | openssl x509 -noout -serial \
  | sed -E 's/^serial=//; s/://g' | tr '[:lower:]' '[:upper:]')"

if [[ "$IMPORTED_SERIAL" != "${!IOS_SIGNING_SECRET_CERT_SERIAL}" ]]; then
  echo "P12 serial mismatch (expected ${!IOS_SIGNING_SECRET_CERT_SERIAL}, got ${IMPORTED_SERIAL})." >&2
  exit 1
fi

PROFILE_DEST="${HOME}/Library/MobileDevice/Provisioning Profiles/aoat-${!IOS_SIGNING_SECRET_BUNDLE_ID}.mobileprovision"
mkdir -p "$(dirname "$PROFILE_DEST")"
cp "$PROFILE_PATH" "$PROFILE_DEST"

log "==> Wrote credentials/ios/* and credentials.json"
log "==> Installed provisioning profile: ${PROFILE_DEST}"
log "==> Expected cert serial: ${!IOS_SIGNING_SECRET_CERT_SERIAL}"

if [[ "$SKIP_KEYCHAIN_IMPORT" == "1" ]]; then
  log "==> Skipped Keychain import (--skip-keychain-import)"
  exit 0
fi

log "==> Importing distribution certificate into login keychain (macOS may prompt for permission)"
security import "$P12_PATH" \
  -k "$HOME/Library/Keychains/login.keychain-db" \
  -P "${!IOS_SIGNING_SECRET_P12_PASSWORD}" \
  -T /usr/bin/codesign \
  -T /usr/bin/security \
  -A

if [[ "$QUIET" != "1" ]]; then
  echo
  echo "Keychain identities:"
  security find-identity -v -p codesigning 2>/dev/null | grep -Ei 'Apple Distribution|iPhone Distribution' || true

  echo
  echo "✅ Restore complete."
  echo "Ensure EAS production credentials use serial ${!IOS_SIGNING_SECRET_CERT_SERIAL} (eas credentials -p ios)."
  echo "Then test: SKIP_TESTFLIGHT_SUBMIT=1 pnpm deploy:testflight:local"
fi
