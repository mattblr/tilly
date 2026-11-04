#!/bin/sh
# Writes the publishable app keys into Config/AppKey.xcconfig, which
# Tilly.xcconfig includes. The keys never go into git and are never printed.
#
#   scripts/app-key.sh                      Debug and Release both use .env
#   scripts/app-key.sh <production .env>    Release (App Store, TestFlight) uses
#                                           the production project's env file
#
# Debug builds talk to the project in the root .env (your Development project).
# Release builds are what App Review and customers run, so give them the
# production project's TILLY_APP_KEY.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
env_file="$here/../.env"
release_file="${1:-$env_file}"
out="$here/Config/AppKey.xcconfig"

read_key() {
  value=$(sed -n "s/^$1=//p" "$2")
  if [ -z "$value" ]; then
    echo "no $1 in $2" >&2
    exit 1
  fi
  printf '%s' "$value"
}

debug_key=$(read_key TILLY_APP_KEY "$env_file")
release_key=$(read_key TILLY_APP_KEY "$release_file")
# RevenueCat's public SDK key (never a server secret): the App Store key (appl_…)
# in every build. App Store sandbox purchases unlock Premium; Test Store purchases are refused.
revenuecat=$(read_key TILLY_REVENUECAT_KEY "$env_file")
case "$revenuecat" in
  appl_*) ;;
  *) echo "TILLY_REVENUECAT_KEY must be the App Store public SDK key (appl_…)" >&2; exit 1 ;;
esac

umask 077
printf 'FOIR_APP_KEY[config=Debug] = %s\nFOIR_APP_KEY[config=Release] = %s\nREVENUECAT_KEY = %s\n' \
  "$debug_key" "$release_key" "$revenuecat" > "$out"
echo "wrote $out"
