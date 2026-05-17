#!/usr/bin/env bash
# Create (or verify) an email/password account on Convex **production** for App Store review.
#
# Usage:
#   REVIEW_EMAIL='review@example.com' \
#   REVIEW_PASSWORD='your-secure-password' \
#   REVIEW_NAME='App Review' \
#   ./scripts/create-apple-review-user.sh
#
# Defaults target production Better Auth (`hearty-grasshopper-692`). Override with:
#   CONVEX_SITE_URL=https://….convex.site
#
# Requires: curl, jq (optional — pretty output when installed)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROD_CONVEX_SITE_URL="${PROD_CONVEX_SITE_URL:-https://hearty-grasshopper-692.convex.site}"
CONVEX_SITE_URL="${CONVEX_SITE_URL:-$PROD_CONVEX_SITE_URL}"

REVIEW_EMAIL="${REVIEW_EMAIL:-${APPLE_REVIEW_EMAIL:-}}"
REVIEW_PASSWORD="${REVIEW_PASSWORD:-${APPLE_REVIEW_PASSWORD:-}}"
REVIEW_NAME="${REVIEW_NAME:-${APPLE_REVIEW_NAME:-App Review}}"

if [[ -z "$REVIEW_EMAIL" || -z "$REVIEW_PASSWORD" ]]; then
  echo "Missing credentials." >&2
  echo "Set REVIEW_EMAIL and REVIEW_PASSWORD (min 8 characters), e.g.:" >&2
  echo "  REVIEW_EMAIL='review@example.com' REVIEW_PASSWORD='…' $0" >&2
  exit 1
fi

if [[ ${#REVIEW_PASSWORD} -lt 8 ]]; then
  echo "REVIEW_PASSWORD must be at least 8 characters (Better Auth minimum)." >&2
  exit 1
fi

if [[ "$CONVEX_SITE_URL" != "$PROD_CONVEX_SITE_URL" ]]; then
  echo "Warning: CONVEX_SITE_URL is not production ($PROD_CONVEX_SITE_URL)." >&2
  echo "         Current: $CONVEX_SITE_URL" >&2
  if [[ -t 0 ]]; then
    read -r -p "Continue? [y/N] " confirm
    if [[ "${confirm,,}" != "y" ]]; then
      exit 1
    fi
  else
    echo "Non-interactive shell — aborting. Set CONVEX_SITE_URL to production or run in a TTY." >&2
    exit 1
  fi
fi

payload="$(node -e '
const email = process.argv[1];
const password = process.argv[2];
const name = process.argv[3];
process.stdout.write(JSON.stringify({ email, password, name }));
' "$REVIEW_EMAIL" "$REVIEW_PASSWORD" "$REVIEW_NAME")"

endpoint="${CONVEX_SITE_URL%/}/api/auth/sign-up/email"
echo "==> POST $endpoint"

response="$(curl -sS -w "\n%{http_code}" -X POST "$endpoint" \
  -H "Content-Type: application/json" \
  -d "$payload")"

http_code="${response##*$'\n'}"
body="${response%$'\n'*}"

if [[ "$http_code" == "200" ]]; then
  echo "==> Account created on $CONVEX_SITE_URL"
  if command -v jq >/dev/null 2>&1; then
    echo "$body" | jq '{user: {id: .user.id, email: .user.email, name: .user.name}}'
  else
    echo "$body"
  fi
  echo ""
  echo "Give App Review these credentials (email + password sign-in in the app)."
  exit 0
fi

if echo "$body" | grep -q 'USER_ALREADY_EXISTS'; then
  echo "==> Account already exists for $REVIEW_EMAIL on $CONVEX_SITE_URL"
  echo "    Sign in with that email/password in the production build."
  exit 0
fi

echo "Sign-up failed (HTTP $http_code):" >&2
echo "$body" >&2
exit 1
