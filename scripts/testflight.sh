#!/usr/bin/env bash
# Local production iOS build + TestFlight submit (see docs/eas-build.md).
# Cloud EAS builds are not used in this project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/scripts/deploy-testflight-local.sh"
