#!/usr/bin/env bash
set -euo pipefail

IPA="./builds/agreeonatime.ipa"

if [ ! -f "$IPA" ]; then
  echo "No .ipa found at $IPA"
  exit 1
fi

if [ "${SKIP_IOS_INSTALL:-}" = "1" ]; then
  echo "Skipping device install (SKIP_IOS_INSTALL=1). IPA: $IPA"
  exit 0
fi

echo "Installing $IPA on connected device..."
deploy_args=(--bundle "$IPA")
if [ -n "${IOS_DEVICE_ID:-}" ]; then
  deploy_args+=(-i "$IOS_DEVICE_ID")
fi
ios-deploy "${deploy_args[@]}"
