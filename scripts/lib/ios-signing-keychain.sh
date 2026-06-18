#!/usr/bin/env bash
# Shared Keychain helpers for iOS distribution signing sync/restore.
# shellcheck disable=SC2034

# Prefer Apple Distribution (Xcode 26+) over legacy iPhone Distribution.
IOS_SIGNING_DIST_LABELS=("Apple Distribution" "iPhone Distribution")

ios_signing_find_identity_line() {
  local team_id="$1"
  local cert_cn="${2:-}"
  local line=""
  local label=""

  if [[ -n "$cert_cn" ]]; then
    security find-identity -v -p codesigning 2>/dev/null | grep -F "$cert_cn" | head -1 || true
    return 0
  fi

  for label in "${IOS_SIGNING_DIST_LABELS[@]}"; do
    line="$(security find-identity -v -p codesigning 2>/dev/null | grep "$label" | grep -F "(${team_id})" | head -1 || true)"
    if [[ -n "$line" ]]; then
      printf '%s' "$line"
      return 0
    fi
  done

  return 1
}

ios_signing_parse_identity_sha1() {
  sed -E 's/^[[:space:]]*[0-9]+\) ([A-F0-9]{40}) .*/\1/' <<<"$1"
}

ios_signing_parse_identity_cn() {
  sed -E 's/^[[:space:]]*[0-9]+\) [A-F0-9]{40} "(.*)"$/\1/' <<<"$1"
}

ios_signing_list_distribution_identities() {
  security find-identity -v -p codesigning 2>/dev/null | grep -Ei 'Apple Distribution|iPhone Distribution' || true
}
