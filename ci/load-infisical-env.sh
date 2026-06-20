#!/usr/bin/env bash
#
# Load secrets from Infisical into the current shell.
# Intended to be sourced by build/deploy scripts:
#   source "$(dirname "$0")/../ci/load-infisical-env.sh"
#
# Auth (pick one):
#   - Local: `infisical login` + `.infisical.json` in repo root (from `infisical init`)
#   - CI/automation: export INFISICAL_TOKEN (service token or universal-auth token)
#
# Optional overrides:
#   INFISICAL_ENV          Environment slug (default: prod)
#   INFISICAL_SECRET_PATH  Secret folder path (default: /)
#   INFISICAL_PROJECT_ID   Project id (only if not using .infisical.json)
#   INFISICAL_CONFIG_DIR   Directory containing .infisical.json (auto-detected)
#   INFISICAL_SKIP=1       Skip loading (use existing shell env)
#

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Source this script instead of executing it directly:" >&2
  echo "  source ci/load-infisical-env.sh" >&2
  exit 1
fi

if [[ "${INFISICAL_SKIP:-0}" == "1" ]]; then
  return 0
fi

if [[ -n "${INFISICAL_ENV_LOADED:-}" ]]; then
  return 0
fi

if ! command -v infisical >/dev/null 2>&1; then
  echo "❌ infisical CLI not found. Install with: brew install infisical/get-cli/infisical" >&2
  return 1
fi

_find_infisical_config_dir() {
  local dir="$1"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.infisical.json" ]]; then
      printf '%s' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

if [[ -z "${INFISICAL_CONFIG_DIR:-}" ]]; then
  _start_dir="${AOAT_REPO_ROOT:-${ROOT:-$(pwd)}}"
  INFISICAL_CONFIG_DIR="$(_find_infisical_config_dir "$_start_dir")" || true
fi

if [[ -z "${INFISICAL_CONFIG_DIR:-}" && -z "${INFISICAL_PROJECT_ID:-}" && -z "${INFISICAL_TOKEN:-}" ]]; then
  echo "⚠️  No .infisical.json found and INFISICAL_PROJECT_ID/INFISICAL_TOKEN not set; skipping Infisical." >&2
  echo "   Run 'infisical init' from the repo root, or set INFISICAL_SKIP=1 to silence this." >&2
  return 0
fi

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_SECRET_PATH="${INFISICAL_SECRET_PATH:-/}"

_infisical_args=(
  export
  --format=dotenv-export
  --silent
  --env="$INFISICAL_ENV"
  --path="$INFISICAL_SECRET_PATH"
)

if [[ -n "${INFISICAL_PROJECT_ID:-}" ]]; then
  _infisical_args+=(--projectId="$INFISICAL_PROJECT_ID")
fi

if [[ -n "${INFISICAL_TOKEN:-}" ]]; then
  _infisical_args+=(--token="$INFISICAL_TOKEN")
fi

if [[ -n "${INFISICAL_DOMAIN:-}" ]]; then
  _infisical_args+=(--domain="$INFISICAL_DOMAIN")
elif [[ -n "${INFISICAL_API_URL:-}" ]]; then
  _infisical_args+=(--domain="$INFISICAL_API_URL")
fi

_infisical_export() {
  if [[ -n "${INFISICAL_CONFIG_DIR:-}" ]]; then
    (
      cd "$INFISICAL_CONFIG_DIR"
      infisical "${_infisical_args[@]}"
    )
  else
    infisical "${_infisical_args[@]}"
  fi
}

if ! _exported="$(_infisical_export 2>/dev/null)" || [[ -z "$_exported" ]]; then
  echo "❌ Failed to export secrets from Infisical (env=${INFISICAL_ENV}, path=${INFISICAL_SECRET_PATH})." >&2
  echo "   Ensure you are logged in (infisical login) or INFISICAL_TOKEN is set." >&2
  return 1
fi

# shellcheck disable=SC1090
eval "$_exported"
export INFISICAL_ENV_LOADED=1

echo "✅ Loaded Infisical secrets (${INFISICAL_ENV}${INFISICAL_SECRET_PATH})"
