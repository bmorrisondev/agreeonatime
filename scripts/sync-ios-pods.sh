#!/usr/bin/env bash
# Warm CocoaPods dependencies using the repo Gemfile/Bundler setup.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "sync-ios-pods requires macOS." >&2
  exit 1
fi

if ! command -v bundle >/dev/null 2>&1; then
  echo "Missing Bundler. Install Ruby/Bundler on the macOS runner." >&2
  exit 1
fi

bundle config set path vendor/bundle
bundle check || bundle install

export CP_HOME_DIR="${CP_HOME_DIR:-$ROOT/.cocoapods}"
export COCOAPODS_CACHE_PATH="${COCOAPODS_CACHE_PATH:-$ROOT/.cocoapods-cache}"
mkdir -p "$CP_HOME_DIR" "$COCOAPODS_CACHE_PATH"

if [[ ! -f ios/Podfile ]]; then
  echo "==> ios/Podfile missing; generating native iOS project for pod cache warm-up"
  pnpm exec expo prebuild --platform ios --no-install
fi

if [[ ! -f ios/Podfile ]]; then
  echo "Unable to find ios/Podfile after prebuild." >&2
  exit 1
fi

(
  cd ios
  bundle exec pod install --no-repo-update
)
