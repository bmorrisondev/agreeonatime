#!/usr/bin/env bash
# Export iOS distribution signing from this Mac (or credentials/ios) to Infisical,
# restore from Infisical when Keychain is empty, and optionally open EAS credentials.
#
# Typical cross-Mac flow:
#   Mac A (has cert):  pnpm sync:ios-signing
#   Mac B (new):       pnpm sync:ios-signing --open-eas-credentials
#                      (download from EAS → Infisical → Keychain in one run)
#
# Usage:
#   ./scripts/sync-ios-signing-to-infisical.sh
#   ./scripts/sync-ios-signing-to-infisical.sh --open-eas-credentials
#   ./scripts/sync-ios-signing-to-infisical.sh --from-credentials-dir
#
# Requires: infisical login (or INFISICAL_TOKEN), macOS Keychain, OpenSSL, Python 3
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-infisical-path.sh"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-keychain.sh"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-infisical-upload.sh"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/ios-signing-credentials-dir.sh"

OPEN_EAS_CREDENTIALS=0
DRY_RUN=0
FROM_CREDENTIALS_DIR=0
FROM_KEYCHAIN=0
FORCE_UPLOAD=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --open-eas-credentials   Download from EAS (interactive), then upload Infisical + Keychain
  --from-credentials-dir   Use credentials/ios/* instead of Keychain (no export)
  --from-keychain          Export from Keychain even when credentials/ios exists
  --force-upload           Upload to Infisical even after a restore-only run
  --dry-run                Export + validate locally; do not write to Infisical
  -h, --help               Show this help

Infisical target: env=${IOS_SIGNING_INFISICAL_ENV} path=${IOS_SIGNING_INFISICAL_PATH}

When Keychain has no distribution cert, this script tries (in order):
  1. Restore from Infisical into Keychain + credentials/ios
  2. Use credentials/ios/* or EAS download (dist-cert.p12 + credentials.json)
  3. --open-eas-credentials: EAS download menu, then Infisical + Keychain automatically
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open-eas-credentials)
      OPEN_EAS_CREDENTIALS=1
      shift
      ;;
    --from-credentials-dir)
      FROM_CREDENTIALS_DIR=1
      shift
      ;;
    --from-keychain)
      FROM_KEYCHAIN=1
      shift
      ;;
    --force-upload)
      FORCE_UPLOAD=1
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
CREDS_DIR="$ROOT/credentials/ios"

open_eas_credentials() {
  if ! command -v eas >/dev/null 2>&1; then
    echo "eas CLI not on PATH; run: eas credentials -p ios" >&2
    return 1
  fi
  cat <<EOF

==> In eas credentials, choose EXACTLY:
  1. Production
  2. credentials.json: Upload/Download credentials between EAS servers and your local json
  3. Download credentials from EAS to credentials.json

EAS writes credentials/ios/dist-cert.p12 and profile.mobileprovision.
This script will continue when eas exits.

EOF
  echo "==> Opening eas credentials (interactive)…"
  eas credentials -p ios
}

finish_bootstrap_from_credentials_dir() {
  ios_signing_normalize_credential_paths "$ROOT"
  export_from_credentials_dir
  ios_signing_install_provisioning_profile "$IOS_SIGNING_RESOLVED_PROFILE" "$BUNDLE_ID"
  ios_signing_import_p12_to_keychain "$IOS_SIGNING_RESOLVED_P12" "$P12_PASSWORD"
  echo
  echo "Keychain identities:"
  ios_signing_list_distribution_identities || true
  echo
  echo "✅ Local signing ready. Other Macs: pnpm restore:ios-signing"
}

print_eas_setup_help() {
  cat <<EOF

No distribution certificate in Keychain and Infisical ${IOS_SIGNING_INFISICAL_ENV}${IOS_SIGNING_INFISICAL_PATH} is empty.

Bootstrap on this Mac (recommended):
  pnpm sync:ios-signing --open-eas-credentials

In eas credentials choose: Production → credentials.json → Download credentials from EAS.

Or on a Mac that already has the cert in Keychain:
  pnpm sync:ios-signing

EOF
}

try_restore_from_infisical() {
  local quiet="${1:-0}"
  local restore_args=(--import-login-keychain)
  if [[ "$quiet" == "1" ]]; then
    restore_args+=(--quiet)
  fi
  "$ROOT/scripts/restore-ios-signing-from-infisical.sh" "${restore_args[@]}"
}

infisical_signing_exists() {
  infisical export \
    --env="$IOS_SIGNING_INFISICAL_ENV" \
    --path="$IOS_SIGNING_INFISICAL_PATH" \
    --format=dotenv \
    --silent 2>/dev/null | grep -q "${IOS_SIGNING_SECRET_P12_BASE64}="
}

prompt_p12_password() {
  if [[ -n "${IOS_DISTRIBUTION_CERT_PASSWORD:-}" ]]; then
    P12_PASSWORD="$IOS_DISTRIBUTION_CERT_PASSWORD"
    return 0
  fi
  if [[ -n "${IOS_SIGNING_RESOLVED_P12_PASSWORD:-}" ]]; then
    P12_PASSWORD="$IOS_SIGNING_RESOLVED_P12_PASSWORD"
    return 0
  fi
  echo
  echo "Enter the .p12 password (stored in Infisical; min 8 chars):"
  read -rs P12_PASSWORD
  echo
  if [[ ${#P12_PASSWORD} -lt 8 ]]; then
    echo "Password must be at least 8 characters." >&2
    exit 1
  fi
}

find_matching_profile() {
  local bundle_id="$1"
  local team_id="$2"
  local cert_serial="$3"
  local out_path="$4"
  python3 - "$bundle_id" "$team_id" "$cert_serial" "$out_path" <<'PY'
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
}

write_local_credential_copies() {
  local p12_src="$1"
  local profile_src="$2"
  local cert_serial="$3"
  local profile_name="$4"
  local cert_cn="$5"

  mkdir -p "$CREDS_DIR"
  cp "$p12_src" "$CREDS_DIR/distribution.p12"
  cp "$profile_src" "$CREDS_DIR/profile.mobileprovision"
  chmod 600 "$CREDS_DIR/distribution.p12" "$CREDS_DIR/profile.mobileprovision"

  cat >"$CREDS_DIR/README.txt" <<EOF
Generated by scripts/sync-ios-signing-to-infisical.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Use these paths when uploading to EAS (eas credentials -p ios → Production):
  P12:      credentials/ios/distribution.p12
  Profile:  credentials/ios/profile.mobileprovision

Cert serial: ${cert_serial}
Profile:     ${profile_name}
Cert CN:     ${cert_cn}

This directory is gitignored. Secrets are also stored in Infisical (${IOS_SIGNING_INFISICAL_ENV}${IOS_SIGNING_INFISICAL_PATH}).
EOF
}

export_from_keychain() {
  local cert_cn="$1"
  local cert_sha1="$2"
  local work_dir="$3"
  local p12_path="${work_dir}/distribution.p12"
  local profile_path="${work_dir}/profile.mobileprovision"

  prompt_p12_password

  echo "==> Exporting distribution certificate from login keychain"
  if ! security export -k "$HOME/Library/Keychains/login.keychain-db" \
    -t identities \
    -f pkcs12 \
    -P "$P12_PASSWORD" \
    -o "$p12_path" \
    "$cert_sha1"; then
    echo "Keychain export failed." >&2
    if ios_signing_credentials_dir_ready "$ROOT"; then
      echo "==> Falling back to credentials/ios…" >&2
      export_from_credentials_dir
      return 0
    fi
    echo "Try: pnpm sync:ios-signing --from-credentials-dir" >&2
    exit 1
  fi

  local cert_serial
  cert_serial="$(openssl pkcs12 -in "$p12_path" -passin "pass:${P12_PASSWORD}" -nokeys -clcerts 2>/dev/null \
    | openssl x509 -noout -serial \
    | sed -E 's/^serial=//; s/://g' | tr '[:lower:]' '[:upper:]')"
  echo "==> Certificate serial: ${cert_serial}"

  echo "==> Searching for App Store provisioning profile for ${BUNDLE_ID}"
  local profile_name
  profile_name="$(find_matching_profile "$BUNDLE_ID" "$APPLE_TEAM_ID" "$cert_serial" "$profile_path")"
  echo "==> Matched profile: ${profile_name}"

  write_local_credential_copies "$p12_path" "$profile_path" "$cert_serial" "$profile_name" "$cert_cn"

  local p12_b64_path="${work_dir}/distribution.p12.b64"
  local profile_b64_path="${work_dir}/profile.mobileprovision.b64"
  base64 <"$p12_path" | tr -d '\n' >"$p12_b64_path"
  base64 <"$profile_path" | tr -d '\n' >"$profile_b64_path"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "==> Dry run complete (Infisical not updated)"
    echo "    P12: ${p12_path}"
    echo "    Profile: ${profile_path}"
    echo "    Local copies: credentials/ios/"
    return 0
  fi

  ios_signing_upload_to_infisical \
    "$ROOT" \
    "$IOS_SIGNING_INFISICAL_ENV" \
    "$IOS_SIGNING_INFISICAL_PATH" \
    "$p12_b64_path" \
    "$profile_b64_path" \
    "$P12_PASSWORD" \
    "$cert_serial" \
    "$APPLE_TEAM_ID" \
    "$BUNDLE_ID" \
    "$cert_cn"

  echo "✅ Infisical updated."
}

export_from_credentials_dir() {
  if ! ios_signing_normalize_credential_paths "$ROOT"; then
    echo "Missing distribution .p12 and provisioning profile under credentials/ios." >&2
    echo "Run: pnpm sync:ios-signing --open-eas-credentials" >&2
    exit 1
  fi

  local p12_path="$IOS_SIGNING_RESOLVED_P12"
  local profile_path="$IOS_SIGNING_RESOLVED_PROFILE"

  prompt_p12_password

  local cert_serial cert_cn
  cert_serial="$(openssl pkcs12 -in "$p12_path" -passin "pass:${P12_PASSWORD}" -nokeys -clcerts 2>/dev/null \
    | openssl x509 -noout -serial \
    | sed -E 's/^serial=//; s/://g' | tr '[:lower:]' '[:upper:]')"
  cert_cn="$(openssl pkcs12 -in "$p12_path" -passin "pass:${P12_PASSWORD}" -nokeys -clcerts 2>/dev/null \
    | openssl x509 -noout -subject \
    | sed -E 's/^subject=.*CN=([^,/]+).*/\1/' || echo "Distribution Certificate")"

  echo "==> Using credentials/ios (serial ${cert_serial})"

  local work_dir
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/aoat-ios-signing-sync.XXXXXX")"
  local p12_b64_path="${work_dir}/distribution.p12.b64"
  local profile_b64_path="${work_dir}/profile.mobileprovision.b64"
  base64 <"$p12_path" | tr -d '\n' >"$p12_b64_path"
  base64 <"$profile_path" | tr -d '\n' >"$profile_b64_path"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "==> Dry run complete (Infisical not updated)"
    rm -rf "$work_dir"
    return 0
  fi

  ios_signing_upload_to_infisical \
    "$ROOT" \
    "$IOS_SIGNING_INFISICAL_ENV" \
    "$IOS_SIGNING_INFISICAL_PATH" \
    "$p12_b64_path" \
    "$profile_b64_path" \
    "$P12_PASSWORD" \
    "$cert_serial" \
    "$APPLE_TEAM_ID" \
    "$BUNDLE_ID" \
    "$cert_cn"

  rm -rf "$work_dir"
  echo "✅ Infisical updated from credentials/ios."
}

echo "==> Bundle id: ${BUNDLE_ID}"
echo "==> Apple team: ${APPLE_TEAM_ID}"

# Prefer credentials/ios (EAS download) — password is already in credentials.json.
if [[ "$FROM_KEYCHAIN" != "1" ]] && { [[ "$FROM_CREDENTIALS_DIR" == "1" ]] || ios_signing_credentials_dir_ready "$ROOT"; }; then
  export_from_credentials_dir
  echo
  echo "✅ Infisical updated. Other Macs: pnpm restore:ios-signing"
  exit 0
fi

IDENTITY_LINE=""
IDENTITY_LINE="$(ios_signing_find_identity_line "$APPLE_TEAM_ID" "${IOS_DIST_CERT_CN:-}")" || true

if [[ -n "$IDENTITY_LINE" ]]; then
  CERT_CN="$(ios_signing_parse_identity_cn "$IDENTITY_LINE")"
  CERT_SHA1="$(ios_signing_parse_identity_sha1 "$IDENTITY_LINE")"
  echo "==> Distribution cert CN: ${CERT_CN}"
  echo "==> Keychain identity SHA-1: ${CERT_SHA1}"

  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aoat-ios-signing-sync.XXXXXX")"
  cleanup() {
    rm -rf "$WORK_DIR"
  }
  trap cleanup EXIT

  export_from_keychain "$CERT_CN" "$CERT_SHA1" "$WORK_DIR"

  echo
  echo "Next on EVERY build machine:"
  echo "  pnpm restore:ios-signing   # or: pnpm sync:ios-signing --open-eas-credentials"
  echo

  if [[ "$OPEN_EAS_CREDENTIALS" == "1" ]]; then
    open_eas_credentials
  fi
  exit 0
fi

# No Keychain distribution identity — try restore / credentials dir / EAS setup.
if [[ "$FROM_CREDENTIALS_DIR" == "1" ]] || ios_signing_credentials_dir_ready "$ROOT"; then
  finish_bootstrap_from_credentials_dir
  exit 0
fi

if infisical_signing_exists; then
  echo "==> No distribution cert in Keychain; restoring from Infisical…"
  if try_restore_from_infisical 1; then
    echo "✅ Restored signing assets from Infisical."
    if [[ "$FORCE_UPLOAD" == "1" ]]; then
      export_from_credentials_dir
    fi
    if [[ "$OPEN_EAS_CREDENTIALS" == "1" ]]; then
      open_eas_credentials
    fi
    exit 0
  fi
fi

if [[ "$OPEN_EAS_CREDENTIALS" == "1" ]]; then
  echo "⚠️  No local distribution certificate found." >&2
  echo "Available distribution identities:" >&2
  ios_signing_list_distribution_identities >&2 || true
  open_eas_credentials
  if ios_signing_credentials_dir_ready "$ROOT"; then
    finish_bootstrap_from_credentials_dir
    exit 0
  fi
  echo "EAS download not detected. Choose Production → credentials.json → Download credentials from EAS." >&2
  print_eas_setup_help
  exit 1
fi

echo "No Apple/iPhone Distribution identity found for team ${APPLE_TEAM_ID}." >&2
echo "Set IOS_DIST_CERT_CN to the exact Keychain name, import the cert, or run with --open-eas-credentials." >&2
echo "Available distribution identities:" >&2
ios_signing_list_distribution_identities >&2 || true
print_eas_setup_help
exit 1
