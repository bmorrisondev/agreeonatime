#!/usr/bin/env bash
# Resolve credentials/ios paths (EAS download vs our normalized names).
# shellcheck disable=SC2034

ios_signing_resolve_credential_files() {
  local root="$1"
  local creds_dir="${root}/credentials/ios"
  local resolved=""

  if [[ -f "${root}/credentials.json" ]]; then
    resolved="$(node -e "
const fs = require('fs');
const path = require('path');
const root = process.argv[1];
const raw = JSON.parse(fs.readFileSync(path.join(root, 'credentials.json'), 'utf8'));
const ios = raw.ios?.distributionCertificate ? raw.ios : Object.values(raw.ios ?? {})[0];
if (!ios?.distributionCertificate?.path) process.exit(2);
const absP12 = path.isAbsolute(ios.distributionCertificate.path)
  ? ios.distributionCertificate.path
  : path.join(root, ios.distributionCertificate.path);
const profileRel = ios.provisioningProfilePath ?? '';
const absProfile = profileRel
  ? (path.isAbsolute(profileRel) ? profileRel : path.join(root, profileRel))
  : '';
console.log(JSON.stringify({
  p12: absP12,
  profile: absProfile,
  password: ios.distributionCertificate.password ?? '',
}));
" "$root" 2>/dev/null || true)"
  fi

  if [[ -n "$resolved" ]]; then
    IOS_SIGNING_RESOLVED_P12="$(node -e "console.log(JSON.parse(process.argv[1]).p12)" "$resolved")"
    IOS_SIGNING_RESOLVED_PROFILE="$(node -e "console.log(JSON.parse(process.argv[1]).profile)" "$resolved")"
    IOS_SIGNING_RESOLVED_P12_PASSWORD="$(node -e "console.log(JSON.parse(process.argv[1]).password)" "$resolved")"
  else
    IOS_SIGNING_RESOLVED_P12=""
    IOS_SIGNING_RESOLVED_PROFILE=""
    IOS_SIGNING_RESOLVED_P12_PASSWORD=""
  fi

  if [[ -z "$IOS_SIGNING_RESOLVED_P12" || ! -f "$IOS_SIGNING_RESOLVED_P12" ]]; then
    for candidate in \
      "${creds_dir}/distribution.p12" \
      "${creds_dir}/dist-cert.p12"; do
      if [[ -f "$candidate" ]]; then
        IOS_SIGNING_RESOLVED_P12="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$IOS_SIGNING_RESOLVED_PROFILE" || ! -f "$IOS_SIGNING_RESOLVED_PROFILE" ]]; then
    for candidate in \
      "${creds_dir}/profile.mobileprovision" \
      "${creds_dir}/app-store-profile.mobileprovision"; do
      if [[ -f "$candidate" ]]; then
        IOS_SIGNING_RESOLVED_PROFILE="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$IOS_SIGNING_RESOLVED_P12" || ! -f "$IOS_SIGNING_RESOLVED_P12" ]]; then
    return 1
  fi
  if [[ -z "$IOS_SIGNING_RESOLVED_PROFILE" || ! -f "$IOS_SIGNING_RESOLVED_PROFILE" ]]; then
    return 1
  fi

  return 0
}

ios_signing_normalize_credential_paths() {
  local root="$1"
  local creds_dir="${root}/credentials/ios"
  mkdir -p "$creds_dir"

  ios_signing_resolve_credential_files "$root" || return 1

  if [[ "$IOS_SIGNING_RESOLVED_P12" != "${creds_dir}/distribution.p12" ]]; then
    cp "$IOS_SIGNING_RESOLVED_P12" "${creds_dir}/distribution.p12"
    chmod 600 "${creds_dir}/distribution.p12"
  fi
  if [[ "$IOS_SIGNING_RESOLVED_PROFILE" != "${creds_dir}/profile.mobileprovision" ]]; then
    cp "$IOS_SIGNING_RESOLVED_PROFILE" "${creds_dir}/profile.mobileprovision"
    chmod 600 "${creds_dir}/profile.mobileprovision"
  fi

  IOS_SIGNING_RESOLVED_P12="${creds_dir}/distribution.p12"
  IOS_SIGNING_RESOLVED_PROFILE="${creds_dir}/profile.mobileprovision"
  return 0
}

ios_signing_import_p12_to_keychain() {
  local p12_path="$1"
  local p12_password="$2"

  echo "==> Importing distribution certificate into login keychain (macOS may prompt for permission)"
  security import "$p12_path" \
    -k "$HOME/Library/Keychains/login.keychain-db" \
    -P "$p12_password" \
    -T /usr/bin/codesign \
    -T /usr/bin/security \
    -A
}

ios_signing_install_provisioning_profile() {
  local profile_path="$1"
  local bundle_id="$2"
  local dest="${HOME}/Library/MobileDevice/Provisioning Profiles/aoat-${bundle_id}.mobileprovision"
  mkdir -p "$(dirname "$dest")"
  cp "$profile_path" "$dest"
  echo "==> Installed provisioning profile: ${dest}"
}

ios_signing_credentials_dir_ready() {
  local root="$1"
  ios_signing_resolve_credential_files "$root"
}
