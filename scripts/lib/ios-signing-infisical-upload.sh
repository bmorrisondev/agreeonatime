#!/usr/bin/env bash
# Upload iOS signing assets to Infisical (shared by sync script).
# shellcheck disable=SC2034

ios_signing_ensure_infisical_folder() {
  local root="$1"
  local env_name="$2"
  local secret_path="$3"
  local folder_name="${secret_path#/}"

  if [[ -z "$folder_name" || "$folder_name" == "/" ]]; then
    return 0
  fi

  if infisical export --env="$env_name" --path="$secret_path" --format=dotenv --silent 2>/dev/null | grep -q .; then
    return 0
  fi

  echo "==> Creating Infisical folder ${secret_path} (env=${env_name})"
  (
    cd "$root"
    infisical secrets folders create \
      --env="$env_name" \
      --path="/" \
      --name="$folder_name" \
      --silent 2>/dev/null || true
  )
}

ios_signing_upload_to_infisical() {
  local root="$1"
  local env_name="$2"
  local secret_path="$3"
  local p12_b64_path="$4"
  local profile_b64_path="$5"
  local p12_password="$6"
  local cert_serial="$7"
  local team_id="$8"
  local bundle_id="$9"
  local cert_cn="${10}"

  ios_signing_ensure_infisical_folder "$root" "$env_name" "$secret_path"

  # shellcheck disable=SC1091
  source "$root/scripts/lib/ios-signing-infisical-path.sh"

  echo "==> Writing secrets to Infisical (${env_name}${secret_path})"
  (
    cd "$root"
    infisical secrets set \
      --env="$env_name" \
      --path="$secret_path" \
      --silent \
      "${IOS_SIGNING_SECRET_P12_BASE64}=@${p12_b64_path}" \
      "${IOS_SIGNING_SECRET_PROFILE_BASE64}=@${profile_b64_path}" \
      "${IOS_SIGNING_SECRET_P12_PASSWORD}=${p12_password}" \
      "${IOS_SIGNING_SECRET_CERT_SERIAL}=${cert_serial}" \
      "${IOS_SIGNING_SECRET_TEAM_ID}=${team_id}" \
      "${IOS_SIGNING_SECRET_BUNDLE_ID}=${bundle_id}" \
      "${IOS_SIGNING_SECRET_CERT_CN}=${cert_cn}"
  )
}
