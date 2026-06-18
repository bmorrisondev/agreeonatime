#!/usr/bin/env bash
# Export the working Mac's Apple Distribution cert + App Store profile, upload
# secrets to Infisical, and optionally open EAS credentials to align remote signing.
#
# Run on a Mac where `pnpm deploy:testflight:local` already succeeds.
#
# Usage:
#   ./scripts/sync-ios-signing-to-infisical.sh
#   ./scripts/sync-ios-signing-to-infisical.sh --open-eas-credentials
#
# Requires: infisical login (or INFISICAL_TOKEN), macOS Keychain, OpenSSL, Python 3
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-infisical-path.sh"

OPEN_EAS_CREDENTIALS=0
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --open-eas-credentials   After sync, run \`eas credentials -p ios\` (interactive)
  --dry-run                Export + validate locally; do not write to Infisical
  -h, --help               Show this help

Infisical target: env=${IOS_SIGNING_INFISICAL_ENV} path=${IOS_SIGNING_INFISICAL_PATH}
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open-eas-credentials)
      OPEN_EAS_CREDENTIALS=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
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
  echo "This script must run on macOS (Keychain + provisioning profiles)." >&2
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

if ! command -v openssl >/dev/null 2>&1; then
  echo "Missing openssl." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Missing python3." >&2
  exit 1
fi

read_json_field() {
  local file="$1"
  local expr="$2"
  node -e "const j=require(process.argv[1]); console.log(${expr})" "$file"
}

APPLE_TEAM_ID="$(read_json_field "$ROOT/eas.json" "j.submit.production.ios.appleTeamId")"
BUNDLE_ID="$(read_json_field "$ROOT/app.json" "j.expo.ios.bundleIdentifier")"

if [[ -n "${IOS_DIST_CERT_CN:-}" ]]; then
  CERT_CN="$IOS_DIST_CERT_CN"
else
  IDENTITY_LINE="$(security find-identity -v -p codesigning 2>/dev/null | grep "Apple Distribution" | grep -F "(${APPLE_TEAM_ID})" | head -1 || true)"
  if [[ -z "$IDENTITY_LINE" ]]; then
    echo "No Apple Distribution identity found for team ${APPLE_TEAM_ID}." >&2
    echo "Set IOS_DIST_CERT_CN to the exact Keychain name, or import the cert first." >&2
    security find-identity -v -p codesigning 2>/dev/null | grep -i distribution >&2 || true
    exit 1
  fi
  CERT_CN="$(sed -E 's/^[[:space:]]*[0-9]+\) [A-F0-9]{40} "(.*)"$/\1/' <<<"$IDENTITY_LINE")"
fi

echo "==> Bundle id: ${BUNDLE_ID}"
echo "==> Apple team: ${APPLE_TEAM_ID}"
echo "==> Distribution cert CN: ${CERT_CN}"

IDENTITY_LINE="$(security find-identity -v -p codesigning 2>/dev/null | grep -F "$CERT_CN" | head -1 || true)"
if [[ -z "$IDENTITY_LINE" ]]; then
  echo "No codesigning identity found for: ${CERT_CN}" >&2
  echo "Available distribution identities:" >&2
  security find-identity -v -p codesigning 2>/dev/null | grep -i distribution >&2 || true
  exit 1
fi

CERT_SHA1="$(sed -E 's/^[[:space:]]*[0-9]+\) ([A-F0-9]{40}) .*/\1/' <<<"$IDENTITY_LINE")"
echo "==> Keychain identity SHA-1: ${CERT_SHA1}"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aoat-ios-signing-sync.XXXXXX")"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

P12_PATH="${WORK_DIR}/distribution.p12"
PROFILE_PATH="${WORK_DIR}/profile.mobileprovision"
P12_B64_PATH="${WORK_DIR}/distribution.p12.b64"
PROFILE_B64_PATH="${WORK_DIR}/profile.mobileprovision.b64"

echo
echo "Enter a NEW password for the exported .p12 (stored in Infisical; min 8 chars):"
read -rs P12_PASSWORD
echo
if [[ ${#P12_PASSWORD} -lt 8 ]]; then
  echo "Password must be at least 8 characters." >&2
  exit 1
fi

echo "==> Exporting distribution certificate from login keychain"
security export -k "$HOME/Library/Keychains/login.keychain-db" \
  -t ident \
  -f pkcs12 \
  -P "$P12_PASSWORD" \
  -o "$P12_PATH" \
  "$CERT_SHA1"

CERT_SERIAL="$(openssl pkcs12 -in "$P12_PATH" -passin "pass:${P12_PASSWORD}" -nokeys -clcerts 2>/dev/null \
  | openssl x509 -noout -serial \
  | sed -E 's/^serial=//; s/://g' | tr '[:lower:]' '[:upper:]')"
echo "==> Certificate serial: ${CERT_SERIAL}"

echo "==> Searching for App Store provisioning profile for ${BUNDLE_ID}"
PROFILE_NAME="$(python3 - "$BUNDLE_ID" "$APPLE_TEAM_ID" "$CERT_SERIAL" "$PROFILE_PATH" <<'PY'
import glob
import os
import plistlib
import subprocess
import sys

bundle_id = sys.argv[1]
team_id = sys.argv[2]
cert_serial = sys.argv[3].upper().replace(":", "")
out_path = sys.argv[4]

profiles_dir = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
candidates = sorted(
    glob.glob(os.path.join(profiles_dir, "*.mobileprovision")),
    key=os.path.getmtime,
    reverse=True,
)


def cert_serials(plist_data: dict) -> set[str]:
    serials: set[str] = set()
    for der in plist_data.get("DeveloperCertificates", []) or []:
        proc = subprocess.run(
            ["openssl", "x509", "-inform", "DER", "-noout", "-serial"],
            input=der,
            capture_output=True,
            check=False,
        )
        if proc.returncode != 0:
            continue
        line = proc.stdout.decode().strip()
        if line.startswith("serial="):
            serials.add(line.split("=", 1)[1].replace(":", "").upper())
    return serials


for path in candidates:
    proc = subprocess.run(["security", "cms", "-D", "-i", path], capture_output=True, check=False)
    if proc.returncode != 0:
        continue
    try:
        data = plistlib.loads(proc.stdout)
    except Exception:
        continue

    app_id = data.get("Entitlements", {}).get("application-identifier", "")
    if not (app_id == f"{team_id}.{bundle_id}" or app_id.endswith(f".{bundle_id}")):
        continue

    # App Store profiles should not pin specific test devices.
    if data.get("ProvisionedDevices"):
        continue

    if cert_serial not in cert_serials(data):
        continue

    with open(path, "rb") as src, open(out_path, "wb") as dst:
        dst.write(src.read())
    print(data.get("Name", os.path.basename(path)))
    break
else:
    print(
        f"No App Store profile in {profiles_dir} matches bundle {bundle_id} and cert serial {cert_serial}.",
        file=sys.stderr,
    )
    print(
        "Download/regenerate the App Store profile in Apple Developer or EAS, then retry.",
        file=sys.stderr,
    )
    sys.exit(1)
PY
)"
echo "==> Matched profile: ${PROFILE_NAME}"

base64 <"$P12_PATH" | tr -d '\n' >"$P12_B64_PATH"
base64 <"$PROFILE_PATH" | tr -d '\n' >"$PROFILE_B64_PATH"

mkdir -p "$ROOT/credentials/ios"
cp "$P12_PATH" "$ROOT/credentials/ios/distribution.p12"
cp "$PROFILE_PATH" "$ROOT/credentials/ios/profile.mobileprovision"
chmod 600 "$ROOT/credentials/ios/distribution.p12" "$ROOT/credentials/ios/profile.mobileprovision"

cat >"$ROOT/credentials/ios/README.txt" <<EOF
Generated by scripts/sync-ios-signing-to-infisical.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Use these paths when uploading to EAS (eas credentials -p ios → Production):
  P12:      credentials/ios/distribution.p12
  Profile:  credentials/ios/profile.mobileprovision

Cert serial: ${CERT_SERIAL}
Profile:     ${PROFILE_NAME}

This directory is gitignored. Secrets are also stored in Infisical (${IOS_SIGNING_INFISICAL_ENV}${IOS_SIGNING_INFISICAL_PATH}).
EOF

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> Dry run complete (Infisical not updated)"
  echo "    P12: ${P12_PATH}"
  echo "    Profile: ${PROFILE_PATH}"
  echo "    Local copies: credentials/ios/"
  exit 0
fi

echo "==> Writing secrets to Infisical (${IOS_SIGNING_INFISICAL_ENV}${IOS_SIGNING_INFISICAL_PATH})"
(
  cd "$ROOT"
  infisical secrets set \
    --env="$IOS_SIGNING_INFISICAL_ENV" \
    --path="$IOS_SIGNING_INFISICAL_PATH" \
    --silent \
    "${IOS_SIGNING_SECRET_P12_BASE64}=@${P12_B64_PATH}" \
    "${IOS_SIGNING_SECRET_PROFILE_BASE64}=@${PROFILE_B64_PATH}" \
    "${IOS_SIGNING_SECRET_P12_PASSWORD}=${P12_PASSWORD}" \
    "${IOS_SIGNING_SECRET_CERT_SERIAL}=${CERT_SERIAL}" \
    "${IOS_SIGNING_SECRET_TEAM_ID}=${APPLE_TEAM_ID}" \
    "${IOS_SIGNING_SECRET_BUNDLE_ID}=${BUNDLE_ID}" \
    "${IOS_SIGNING_SECRET_CERT_CN}=${CERT_CN}"
)

echo "✅ Infisical updated."
echo
echo "Next on EVERY build machine (including this one after EAS sync):"
echo "  ./scripts/restore-ios-signing-from-infisical.sh"
echo
echo "Align EAS remote credentials (one time, interactive):"
echo "  1. eas credentials -p ios"
echo "  2. Production → App Store → Distribution Certificate → Add → credentials/ios/distribution.p12"
echo "  3. Regenerate App Store provisioning profile"
echo "  4. Confirm expo.dev credentials show serial ${CERT_SERIAL}"
echo

if [[ "$OPEN_EAS_CREDENTIALS" == "1" ]]; then
  if ! command -v eas >/dev/null 2>&1; then
    echo "eas CLI not on PATH; run the steps above manually." >&2
    exit 0
  fi
  echo "==> Opening eas credentials (interactive)…"
  exec eas credentials -p ios
fi
