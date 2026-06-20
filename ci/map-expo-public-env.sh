#!/usr/bin/env bash
#
# Map CI/Infisical secrets that are stored without EXPO_PUBLIC_ to the names
# Expo embeds in web and native bundles.
#
# Source this file after loading secrets and before running Expo commands.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Source this script instead of executing it directly:" >&2
  echo "  source ci/map-expo-public-env.sh" >&2
  exit 1
fi

_aoat_map_public_env() {
  local public_name="$1"
  shift

  if [[ -n "${!public_name:-}" ]]; then
    export "$public_name"
    return 0
  fi

  local source_name
  for source_name in "$@"; do
    if [[ -n "${!source_name:-}" ]]; then
      export "${public_name}=${!source_name}"
      return 0
    fi
  done

  return 0
}

_aoat_map_public_env EXPO_PUBLIC_APP_ENV APP_ENV
_aoat_map_public_env EXPO_PUBLIC_DEV_TOOLS DEV_TOOLS
_aoat_map_public_env EXPO_PUBLIC_CONVEX_URL CONVEX_URL
_aoat_map_public_env EXPO_PUBLIC_CONVEX_SITE_URL CONVEX_SITE_URL
_aoat_map_public_env EXPO_PUBLIC_SENTRY_DSN SENTRY_DSN
_aoat_map_public_env EXPO_PUBLIC_REVENUECAT_API_KEY REVENUECAT_API_KEY
_aoat_map_public_env EXPO_PUBLIC_REVENUECAT_API_KEY_WEB REVENUECAT_API_KEY_WEB
_aoat_map_public_env EXPO_PUBLIC_ADMOB_IOS_APP_ID ADMOB_IOS_APP_ID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_APP_ID_IOS ADMOB_APP_ID_IOS ADMOB_IOS_APP_ID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ADMOB_APP_ID_ANDROID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS ADMOB_BANNER_UNIT_ID_IOS
_aoat_map_public_env EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID ADMOB_BANNER_UNIT_ID_ANDROID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_IOS ADMOB_INTERSTITIAL_UNIT_ID_IOS
_aoat_map_public_env EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_ANDROID ADMOB_INTERSTITIAL_UNIT_ID_ANDROID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_EVENT_LIST_BANNER_UNIT_ID ADMOB_EVENT_LIST_BANNER_UNIT_ID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_EVENT_DETAIL_BANNER_UNIT_ID ADMOB_EVENT_DETAIL_BANNER_UNIT_ID
_aoat_map_public_env EXPO_PUBLIC_ADMOB_POST_CONFIRM_INTERSTITIAL_UNIT_ID ADMOB_POST_CONFIRM_INTERSTITIAL_UNIT_ID
_aoat_map_public_env EXPO_PUBLIC_ADSENSE_CLIENT_ID ADSENSE_CLIENT_ID
_aoat_map_public_env EXPO_PUBLIC_ADSENSE_DISPLAY_SLOT ADSENSE_DISPLAY_SLOT
_aoat_map_public_env EXPO_PUBLIC_ADSENSE_WEB_VOTE_SLOT ADSENSE_WEB_VOTE_SLOT
_aoat_map_public_env EXPO_PUBLIC_ADSENSE_EVENT_LIST_SLOT ADSENSE_EVENT_LIST_SLOT
_aoat_map_public_env EXPO_PUBLIC_ADSENSE_EVENT_DETAIL_SLOT ADSENSE_EVENT_DETAIL_SLOT

unset -f _aoat_map_public_env
