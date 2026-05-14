#!/usr/bin/env bash
set -euo pipefail

IPA="./builds/agreeonatime.ipa"

if [ ! -f "$IPA" ]; then
  echo "No .ipa found at $IPA"
  exit 1
fi

echo "Installing $IPA on connected device..."
ios-deploy --bundle "$IPA"
