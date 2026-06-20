#!/usr/bin/env bash
# Install Infisical CLI in Linux GitLab jobs when INFISICAL_TOKEN is used.
set -euo pipefail

if command -v infisical >/dev/null 2>&1; then
  exit 0
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | bash
  apt-get update
  apt-get install -y --no-install-recommends infisical
  exit 0
fi

echo "Cannot install infisical CLI automatically on this image." >&2
exit 1
