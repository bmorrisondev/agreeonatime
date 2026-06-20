#!/usr/bin/env bash
# Deploy the already-built dist/ artifact to Vercel without rebuilding.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET="${1:-preview}"
if [[ ! -d dist ]]; then
  echo "Missing dist/ artifact. Run web_build_verify first." >&2
  exit 1
fi

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "VERCEL_TOKEN and VERCEL_PROJECT_ID are required." >&2
  exit 1
fi

ARGS=(deploy dist --yes --token "$VERCEL_TOKEN")

if [[ "$TARGET" == "production" ]]; then
  ARGS+=(--prod)
fi

pnpm dlx vercel@latest "${ARGS[@]}"
